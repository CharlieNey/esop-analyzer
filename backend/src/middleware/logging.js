import winston from 'winston';
import expressWinston from 'express-winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    });
  })
);

// Create main logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { 
    service: 'esop-analyzer',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error log - only errors and above
    new winston.transports.File({
      filename: join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Combined log - all levels
    new winston.transports.File({
      filename: join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Security events log
    new winston.transports.File({
      filename: join(__dirname, '../../logs/security.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 10, // Keep more security logs
      tailable: true
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    )
  }));
}

// Security event logger with structured format
export function logSecurityEvent(event, details, req = null) {
  const securityLog = {
    event,
    details,
    timestamp: new Date().toISOString(),
    severity: 'HIGH'
  };
  
  if (req) {
    securityLog.request = {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl || req.url,
      method: req.method,
      headers: {
        origin: req.get('Origin'),
        referer: req.get('Referer'),
        'content-type': req.get('Content-Type')
      }
    };
    
    // Add user info if available
    if (req.user) {
      securityLog.user = {
        userId: req.user.userId,
        role: req.user.role
      };
    }
  }
  
  logger.warn('SECURITY_EVENT', securityLog);
  
  // In production, also send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to external security monitoring
    // sendToSecurityMonitoring(securityLog);
  }
}

// Application event logger
export function logApplicationEvent(event, data, level = 'info') {
  logger.log(level, event, {
    eventType: 'APPLICATION',
    data,
    timestamp: new Date().toISOString()
  });
}

// Performance logger
export function logPerformanceMetric(operation, duration, metadata = {}) {
  logger.info('PERFORMANCE_METRIC', {
    operation,
    duration,
    unit: 'ms',
    ...metadata,
    timestamp: new Date().toISOString()
  });
}

// Request logging middleware
export const requestLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
  expressFormat: false,
  colorize: false,
  requestWhitelist: [
    'url', 'method', 'httpVersion', 'originalUrl', 'query'
  ],
  responseWhitelist: [
    'statusCode', 'responseTime'
  ],
  dynamicMeta: (req, res) => {
    return {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length'),
      userId: req.user?.userId
    };
  },
  skip: (req, res) => {
    // Skip health checks and static files in production
    if (process.env.NODE_ENV === 'production') {
      return req.url === '/api/health' || req.url.startsWith('/uploads/');
    }
    // Skip most requests in development to reduce terminal noise
    return req.url === '/api/health' || req.url.startsWith('/uploads/') || req.method === 'GET';
  }
});

// Error logging middleware
export const errorLogger = expressWinston.errorLogger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP Error {{req.method}} {{req.url}} {{err.status}} {{err.message}}',
  requestWhitelist: [
    'url', 'method', 'originalUrl', 'query', 'body'
  ],
  dynamicMeta: (req, res, err) => {
    return {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
      stack: err.stack
    };
  }
});

// Audit trail for sensitive operations
export function logAuditEvent(action, resource, user, outcome, details = {}) {
  logger.info('AUDIT_EVENT', {
    action,
    resource,
    user: {
      userId: user?.userId,
      role: user?.role,
      ip: user?.ip
    },
    outcome, // SUCCESS, FAILURE, etc.
    details,
    timestamp: new Date().toISOString()
  });
}

// Database operation logger
export function logDatabaseOperation(operation, table, duration, error = null) {
  const logData = {
    operation,
    table,
    duration,
    timestamp: new Date().toISOString()
  };
  
  if (error) {
    logger.error('DATABASE_ERROR', { ...logData, error: error.message });
  } else {
    logger.debug('DATABASE_OPERATION', logData);
  }
}

// Startup logger
export function logApplicationStartup(port, environment) {
  logger.info('APPLICATION_STARTUP', {
    port,
    environment,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
}

// Graceful shutdown logger
export function logApplicationShutdown(reason) {
  logger.info('APPLICATION_SHUTDOWN', {
    reason,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}