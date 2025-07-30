import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfRoutes from './routes/pdf.js';
import questionRoutes from './routes/questions.js';
import metricsRoutes from './routes/metrics.js';

// Security middleware imports
import { 
  securityHeaders,
  validatePdfUpload,
  validateQuestion,
  sanitizeError
} from './middleware/security.js';
import { AuthMiddleware } from './middleware/auth.js';
import { 
  requestLogger, 
  errorLogger, 
  logApplicationStartup,
  logApplicationShutdown,
  logSecurityEvent
} from './middleware/logging.js';
import { FileValidator, secureFileFilter, secureStorage } from './middleware/fileValidation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security headers
app.use(securityHeaders);

// Request logging (before other middleware to capture all requests)
app.use(requestLogger);

// CORS with enhanced security
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '').split(',')
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logSecurityEvent('CORS_ORIGIN_BLOCKED', { origin }, { ip: 'unknown', url: 'cors-check' });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Add body size tracking
    req.bodySize = buf.length;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced multer configuration with security
const upload = multer({
  storage: multer.diskStorage(secureStorage),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: 1, // Only one file per request
    fields: 10, // Limit form fields
    fieldSize: 1024 * 1024 // 1MB per field
  },
  fileFilter: secureFileFilter
});

// Secure static file serving with additional security headers
app.use('/uploads', (req, res, next) => {
  // Add security headers for static files
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Frame-Options': 'DENY'
  });
  next();
}, express.static('uploads'));

// Rate limiting removed for development

// Public routes (no authentication required)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Development route to get auth token (remove in production)
if (process.env.NODE_ENV === 'development') {
  app.get('/api/dev/token', (req, res) => {
    try {
      const token = AuthMiddleware.generateDevToken();
      res.json({
        token,
        instructions: 'Use this token in Authorization header: Bearer ' + token
      });
    } catch (error) {
      res.status(500).json({
        error: 'Could not generate token. Make sure JWT_SECRET is configured.'
      });
    }
  });
}

// Protected routes with validation (rate limiting removed)
app.use('/api/pdf',
  upload.single('pdf'), // Handle file upload
  validatePdfUpload, // Validate form data
  async (req, res, next) => {
    // Enhanced file validation after upload
    if (req.file) {
      const validation = await FileValidator.validatePdf(req.file.path, req);
      if (!validation.isValid) {
        // Clean up invalid file
        await FileValidator.cleanupFile(req.file.path, 'validation failed');
        return res.status(400).json({
          error: 'File validation failed',
          details: validation.errors
        });
      }
      req.fileValidation = validation;
    }
    next();
  },
  pdfRoutes
);

app.use('/api/questions',
  validateQuestion, // Validate question input
  questionRoutes
);

app.use('/api/metrics',
  metricsRoutes
);

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  logSecurityEvent('ROUTE_NOT_FOUND', { url: req.originalUrl }, req);
  res.status(404).json({
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} is not a valid endpoint`
  });
});

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use((err, req, res, next) => {
  // Log the full error for debugging
  console.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Handle specific error types
  let statusCode = err.status || err.statusCode || 500;
  let message = sanitizeError(err, req);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large';
    logSecurityEvent('FILE_SIZE_EXCEEDED', { size: req.file?.size }, req);
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
    logSecurityEvent('UNEXPECTED_FILE_FIELD', { fieldname: err.field }, req);
  } else if (err.message === 'Only PDF files are allowed') {
    statusCode = 400;
    message = 'Invalid file type - only PDF files are allowed';
    logSecurityEvent('INVALID_FILE_TYPE', { mimetype: req.file?.mimetype }, req);
  }
  
  // Rate limiting removed
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Startup
const server = app.listen(PORT, () => {
  logApplicationStartup(PORT, process.env.NODE_ENV);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🛡️  Security middleware active`);
  console.log(`📝 Logging configured`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  
  // Clean up old processing jobs on startup
  import('./services/jobService.js').then(({ jobService }) => {
    jobService.cleanupOldJobs(7); // Clean jobs older than 7 days
  }).catch(err => {
    console.error('Failed to cleanup old jobs:', err.message);
  });
  
  // Clean up old PDF files on startup
  import('./middleware/fileValidation.js').then(({ FileValidator }) => {
    FileValidator.cleanupOldPdfs('uploads/', 10); // Keep only last 10 PDFs
  }).catch(err => {
    console.error('Failed to cleanup old PDFs:', err.message);
  });
});

// Increase server timeout for long-running operations
const requestTimeout = parseInt(process.env.REQUEST_TIMEOUT) || 600000; // 10 minutes default
server.timeout = requestTimeout;
server.keepAliveTimeout = 65000; // Keep alive connections
server.headersTimeout = 66000; // Slightly longer than keep-alive

console.log(`⏱️  Request timeout: ${requestTimeout}ms (${Math.round(requestTimeout/60000)} minutes)`);

// Graceful shutdown
process.on('SIGTERM', () => {
  logApplicationShutdown('SIGTERM received');
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logApplicationShutdown('SIGINT received');
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  logApplicationShutdown('Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logApplicationShutdown('Unhandled promise rejection');
  process.exit(1);
});