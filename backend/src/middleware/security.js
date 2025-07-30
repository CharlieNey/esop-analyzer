import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { body, validationResult } from 'express-validator';
import helmet from 'helmet';

// API rate limiting - generous for development/testing
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT) || (process.env.NODE_ENV === 'development' ? 1000 : 100), // 1000 for dev, 100 for prod
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((15 * 60 * 1000) / 1000) // seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}, URL: ${req.url}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((15 * 60 * 1000) / 1000)
    });
  }
});

// Upload rate limiting - more generous for testing
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.UPLOAD_RATE_LIMIT) || (process.env.NODE_ENV === 'development' ? 50 : 5), // 50 for dev, 5 for prod
  message: {
    error: 'Too many file uploads from this IP, please try again later.',
    retryAfter: Math.ceil((60 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many file uploads from this IP, please try again later.',
      retryAfter: Math.ceil((60 * 60 * 1000) / 1000)
    });
  }
});

// Slow down repeated requests progressively - relaxed for development
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: process.env.NODE_ENV === 'development' ? 20 : 2, // allow 20 requests in dev, 2 in prod
  delayMs: () => process.env.NODE_ENV === 'development' ? 100 : 500, // 100ms delay in dev, 500ms in prod
  maxDelayMs: process.env.NODE_ENV === 'development' ? 5000 : 20000, // 5s max in dev, 20s in prod
  validate: { delayMs: false } // Disable the warning
});

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