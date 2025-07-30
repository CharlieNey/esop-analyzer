// Rate limiting imports removed - no longer needed
import { body, validationResult } from 'express-validator';
import helmet from 'helmet';

// Rate limiting completely disabled - no-op middleware functions
export const apiLimiter = (req, res, next) => {
  next(); // Pass through without any rate limiting
};

export const uploadLimiter = (req, res, next) => {
  next(); // Pass through without any rate limiting
};

export const speedLimiter = (req, res, next) => {
  next(); // Pass through without any speed limiting
};

// Enhanced helmet configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'", 
        "https://api.openai.com", 
        "https://api.anthropic.com",
        "https://api.reducto.ai"
      ],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some PDF viewers
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
});

// Input validation middleware for PDF uploads
export const validatePdfUpload = [
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .escape(), // Sanitize HTML
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn(`Validation errors for IP ${req.ip}:`, errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Input validation for questions
export const validateQuestion = [
  body('question')
    .notEmpty()
    .withMessage('Question is required')
    .isLength({ min: 3, max: 1000 })
    .withMessage('Question must be between 3 and 1000 characters')
    .escape(),
  
  body('documentId')
    .notEmpty()
    .withMessage('Document ID is required')
    .isUUID()
    .withMessage('Invalid document ID format'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn(`Question validation errors for IP ${req.ip}:`, errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Security event logging
export function logSecurityEvent(event, details, req) {
  const securityLog = {
    timestamp: new Date().toISOString(),
    event,
    details,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.url,
    method: req.method
  };
  
  console.warn('SECURITY EVENT:', JSON.stringify(securityLog));
  
  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to security monitoring service (e.g., DataDog, New Relic)
  }
}

// Sanitize error messages for production
export function sanitizeError(error, req) {
  if (process.env.NODE_ENV === 'production') {
    // Don't leak sensitive information in production
    const safeErrors = [
      'Validation failed',
      'Unauthorized',
      'Forbidden',
      'Not found',
      'Too many requests',
      'File too large',
      'Invalid file type'
    ];
    
    const errorMessage = error.message || 'Internal server error';
    return safeErrors.includes(errorMessage) ? errorMessage : 'Internal server error';
  }
  
  return error.message || 'Internal server error';
}