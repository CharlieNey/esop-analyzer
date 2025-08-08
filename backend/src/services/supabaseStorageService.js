import { supabaseDb } from '../models/supabaseDatabase.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class SupabaseStorageService {
  constructor() {
    this.bucket = 'documents';
  }

  // Upload PDF file to Supabase Storage
  async uploadPDF(filePath, filename, documentId) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const storagePath = `pdfs/${documentId}/${filename}`;
      
      const uploadResult = await supabaseDb.uploadFile(
        this.bucket, 
        storagePath, 
        fileBuffer, 
        {
          contentType: 'application/pdf',
          upsert: true
        }
      );
      
      return {
        storagePath,
        uploadResult,
        publicUrl: this.getPublicUrl(storagePath)
      };
      
    } catch (error) {
      console.error('PDF upload to Supabase Storage failed:', error);
      throw error;
    }
  }

  // Upload image files (for visual content)
  async uploadImage(imageBuffer, filename, documentId) {
    try {
      const fileExtension = path.extname(filename).toLowerCase();
      const contentType = this.getImageContentType(fileExtension);
      const storagePath = `images/${documentId}/${filename}`;
      
      const uploadResult = await supabaseDb.uploadFile(
        this.bucket,
        storagePath,
        imageBuffer,
        {
          contentType,
          upsert: true
        }
      );
      
      return {
        storagePath,
        uploadResult,
        publicUrl: this.getPublicUrl(storagePath)
      };
      
    } catch (error) {
      console.error('Image upload to Supabase Storage failed:', error);
      throw error;
    }
  }

  // Download file from Supabase Storage
  async downloadFile(storagePath) {
    try {
      const downloadResult = await supabaseDb.downloadFile(this.bucket, storagePath);
      return downloadResult;
    } catch (error) {
      console.error('File download from Supabase Storage failed:', error);
      throw error;
    }
  }

  // Get signed URL for file access
  async getSignedUrl(storagePath, expiresInSeconds = 3600) {
    try {
      const urlResult = await supabaseDb.getFileUrl(this.bucket, storagePath, expiresInSeconds);
      return urlResult.signedUrl;
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      throw error;
    }
  }

  // Get public URL (if file is public)
  getPublicUrl(storagePath) {
    return `${process.env.SUPABASE_URL}/storage/v1/object/public/${this.bucket}/${storagePath}`;
  }

  // Delete file from Supabase Storage
  async deleteFile(storagePath) {
    try {
      const deleteResult = await supabaseDb.deleteFile(this.bucket, storagePath);
      return deleteResult;
    } catch (error) {
      console.error('File deletion from Supabase Storage failed:', error);
      throw error;
    }
  }

  // Clean up files for a document
  async cleanupDocumentFiles(documentId) {
    try {
      // List all files for this document
      const pdfPrefix = `pdfs/${documentId}/`;
      const imagePrefix = `images/${documentId}/`;
      
      // Note: Supabase doesn't have a direct "list with prefix" method in the JS client
      // You would need to maintain a list of files associated with each document
      // or use the Supabase REST API directly for more advanced operations
      
      console.log(`Cleanup for document ${documentId} would remove files with prefixes: ${pdfPrefix}, ${imagePrefix}`);
      
      // For now, we'll just log this. In a real implementation, you'd:
      // 1. Query your database for all file paths associated with this document
      // 2. Delete each file using deleteFile()
      
    } catch (error) {
      console.error('Document cleanup failed:', error);
      throw error;
    }
  }

  // Migrate existing local files to Supabase Storage
  async migrateLocalFile(localPath, documentId, filename) {
    try {
      if (!fsSync.existsSync(localPath)) {
        throw new Error(`Local file not found: ${localPath}`);
      }

      const uploadResult = await this.uploadPDF(localPath, filename, documentId);
      
      // Optionally delete local file after successful upload
      if (process.env.DELETE_LOCAL_FILES_AFTER_MIGRATION === 'true') {
        await fs.unlink(localPath);
        console.log(`Local file deleted: ${localPath}`);
      }
      
      return uploadResult;
      
    } catch (error) {
      console.error('File migration failed:', error);
      throw error;
    }
  }

  // Get appropriate content type for images
  getImageContentType(extension) {
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    
    return contentTypes[extension] || 'image/jpeg';
  }

  // Validate file before upload
  async validateFile(filePath, maxSizeMB = 50) {
    try {
      const stats = await fs.stat(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      if (fileSizeMB > maxSizeMB) {
        throw new Error(`File too large: ${fileSizeMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`);
      }
      
      return {
        size: stats.size,
        sizeMB: fileSizeMB,
        valid: true
      };
      
    } catch (error) {
      console.error('File validation failed:', error);
      throw error;
    }
  }

  // Generate storage statistics
  async getStorageStats(documentId = null) {
    try {
      // This is a placeholder - Supabase doesn't provide easy storage stats via JS client
      // You would need to implement this using the Supabase REST API or database queries
      
      return {
        message: 'Storage stats would be implemented using Supabase REST API or database queries',
        documentId,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const supabaseStorageService = new SupabaseStorageService();