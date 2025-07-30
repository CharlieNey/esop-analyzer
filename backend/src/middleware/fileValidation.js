import { fileTypeFromBuffer } from 'file-type';
import { readFile, stat, unlink } from 'fs/promises';
import { logSecurityEvent } from './security.js';

export class FileValidator {
  static async validatePdf(filePath, req) {
    const validationResults = {
      isValid: false,
      errors: [],
      warnings: [],
      fileInfo: {}
    };
    
    try {
      // 1. Check if file exists and get stats
      let stats;
      try {
        stats = await stat(filePath);
        validationResults.fileInfo.size = stats.size;
        validationResults.fileInfo.created = stats.birthtime;
      } catch (error) {
        validationResults.errors.push('File not found or inaccessible');
        return validationResults;
      }
      
      // 2. File size validation
      const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default
      if (stats.size > maxSize) {
        validationResults.errors.push(`File too large: ${Math.round(stats.size / 1024 / 1024)}MB exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`);
        logSecurityEvent('FILE_TOO_LARGE', `File size: ${stats.size}, limit: ${maxSize}`, req);
      }
      
      if (stats.size < 1024) { // Less than 1KB is suspicious
        validationResults.warnings.push('File unusually small for a PDF document');
      }
      
      // 3. Read file buffer for content analysis
      let buffer;
      try {
        // Only read first 64KB for type detection to avoid memory issues
        const fd = await import('fs').then(fs => fs.promises.open(filePath, 'r'));
        const { buffer: headerBuffer } = await fd.read(Buffer.alloc(65536), 0, 65536, 0);
        await fd.close();
        buffer = headerBuffer;
      } catch (error) {
        validationResults.errors.push('Unable to read file content');
        return validationResults;
      }
      
      // 4. Magic byte / file signature validation
      const fileType = await fileTypeFromBuffer(buffer);
      validationResults.fileInfo.detectedType = fileType;
      
      if (!fileType) {
        validationResults.errors.push('Unable to detect file type - possibly corrupted or not a valid file');
        logSecurityEvent('FILE_TYPE_UNKNOWN', 'File type detection failed', req);
      } else if (fileType.mime !== 'application/pdf') {
        validationResults.errors.push(`Invalid file type: detected ${fileType.mime}, expected application/pdf`);
        logSecurityEvent('FILE_TYPE_MISMATCH', `Expected PDF, got ${fileType.mime}`, req);
      }
      
      // 5. PDF header validation
      if (buffer.length >= 8) {
        const header = buffer.subarray(0, 8).toString('ascii');
        if (!header.startsWith('%PDF-')) {
          validationResults.errors.push('Invalid PDF header - file may be corrupted or not a PDF');
          logSecurityEvent('INVALID_PDF_HEADER', `Header: ${header}`, req);
        } else {
          validationResults.fileInfo.pdfVersion = header.substring(5, 8);
        }
      }
      
      // 6. Check for embedded executable content (basic check)
      const bufferString = buffer.toString('ascii', 0, Math.min(buffer.length, 8192));
      const suspiciousPatterns = [
        '/JavaScript',
        '/JS',
        '/Launch',
        '/EmbeddedFile',
        '<script',
        'eval(',
        'unescape('
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (bufferString.includes(pattern)) {
          validationResults.warnings.push(`Potentially suspicious content detected: ${pattern}`);
          logSecurityEvent('SUSPICIOUS_PDF_CONTENT', `Pattern: ${pattern}`, req);
        }
      }
      
      // 7. File name validation
      const fileName = filePath.split('/').pop();
      if (fileName) {
        validationResults.fileInfo.fileName = fileName;
        
        // Check for suspicious file names
        const suspiciousNamePatterns = [
          /\.(exe|bat|cmd|scr|pif|com)$/i,
          /[<>:"|?*]/,
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
        ];
        
        for (const pattern of suspiciousNamePatterns) {
          if (pattern.test(fileName)) {
            validationResults.errors.push('Suspicious or invalid file name');
            logSecurityEvent('SUSPICIOUS_FILENAME', `Filename: ${fileName}`, req);
            break;
          }
        }
      }
      
      // 8. Content validation (check if it looks like a real PDF)
      if (buffer.length > 1024) {
        const hasEndOfFile = bufferString.includes('%%EOF');
        const hasXRef = bufferString.includes('xref');
        const hasStream = bufferString.includes('stream');
        
        if (!hasEndOfFile && !hasXRef && !hasStream) {
          validationResults.warnings.push('File may be incomplete or corrupted PDF');
        }
      }
      
      // Determine if validation passed
      validationResults.isValid = validationResults.errors.length === 0;
      
      // Log validation results
      if (!validationResults.isValid) {
        logSecurityEvent('FILE_VALIDATION_FAILED', {
          errors: validationResults.errors,
          fileInfo: validationResults.fileInfo
        }, req);
      } else if (validationResults.warnings.length > 0) {
        logSecurityEvent('FILE_VALIDATION_WARNINGS', {
          warnings: validationResults.warnings,
          fileInfo: validationResults.fileInfo
        }, req);
      }
      
      return validationResults;
      
    } catch (error) {
      validationResults.errors.push(`Validation error: ${error.message}`);
      logSecurityEvent('FILE_VALIDATION_ERROR', error.message, req);
      return validationResults;
    }
  }
  
  // Clean up invalid files
  static async cleanupFile(filePath, reason = 'validation failed') {
    try {
      await unlink(filePath);
      console.log(`Cleaned up file ${filePath}: ${reason}`);
    } catch (error) {
      console.error(`Failed to cleanup file ${filePath}:`, error.message);
    }
  }
  
  // Secure file name generation
  static generateSecureFileName(originalName) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const extension = originalName.split('.').pop()?.toLowerCase() || 'pdf';
    
    // Sanitize original name
    const baseName = originalName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace special chars
      .substring(0, 50); // Limit length
    
    return `${baseName}_${timestamp}_${random}.${extension}`;
  }
}

// Multer file filter with enhanced validation
export const secureFileFilter = (req, file, cb) => {
  // Basic MIME type check (this is just the first layer)
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    logSecurityEvent('FILE_MIME_REJECTED', `MIME type: ${file.mimetype}`, req);
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Multer storage configuration with secure file naming
export const secureStorage = {
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads/');
  },
  filename: (req, file, cb) => {
    const secureFileName = FileValidator.generateSecureFileName(file.originalname);
    cb(null, secureFileName);
  }
};