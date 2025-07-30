import jwt from 'jsonwebtoken';
import { pool } from '../models/database.js';
import { logSecurityEvent } from './security.js';

export class AuthMiddleware {
  static generateToken(userId, role = 'user', expiresIn = '24h') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'generate-a-very-long-random-secret-256-bits-minimum') {
      throw new Error('JWT_SECRET not properly configured. Please set a secure JWT secret in your .env file.');
    }
    
    return jwt.sign(
      { 
        userId, 
        role, 
        iat: Math.floor(Date.now() / 1000),
        type: 'access'
      },
      process.env.JWT_SECRET,
      { 
        expiresIn,
        algorithm: 'HS256',
        issuer: 'esop-analyzer',
        audience: 'esop-analyzer-app'
      }
    );
  }
  
  static async verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logSecurityEvent('AUTH_MISSING_TOKEN', 'No authorization header or invalid format', req);
        return res.status(401).json({ error: 'Authorization token required' });
      }
      
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        logSecurityEvent('AUTH_EMPTY_TOKEN', 'Empty token provided', req);
        return res.status(401).json({ error: 'Authorization token required' });
      }
      
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ['HS256'],
          issuer: 'esop-analyzer',
          audience: 'esop-analyzer-app'
        });
      } catch (jwtError) {
        logSecurityEvent('AUTH_INVALID_TOKEN', `JWT verification failed: ${jwtError.message}`, req);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      // Check if token is the right type
      if (decoded.type !== 'access') {
        logSecurityEvent('AUTH_WRONG_TOKEN_TYPE', `Wrong token type: ${decoded.type}`, req);
        return res.status(401).json({ error: 'Invalid token type' });
      }
      
      // In a full implementation, you would check if user exists and is active
      // For now, we'll use a simplified approach for development
      if (process.env.NODE_ENV === 'development') {
        // In development, accept any valid JWT for simplicity
        req.user = {
          userId: decoded.userId || 'dev-user',
          role: decoded.role || 'user',
          ...decoded
        };
        return next();
      }
      
      // Production implementation would check user in database
      try {
        const client = await pool.connect();
        const userResult = await client.query(
          'SELECT id, role, active FROM users WHERE id = $1',
          [decoded.userId]
        );
        client.release();
        
        if (!userResult.rows[0] || !userResult.rows[0].active) {
          logSecurityEvent('AUTH_USER_NOT_FOUND', `User ${decoded.userId} not found or inactive`, req);
          return res.status(401).json({ error: 'Invalid token - user not found' });
        }
        
        req.user = {
          ...decoded,
          ...userResult.rows[0]
        };
        
      } catch (dbError) {
        console.error('Database error in auth middleware:', dbError);
        // In case of DB error, log but don't block in development
        if (process.env.NODE_ENV === 'development') {
          req.user = { ...decoded, userId: decoded.userId || 'dev-user', role: decoded.role || 'user' };
        } else {
          return res.status(500).json({ error: 'Authentication service unavailable' });
        }
      }
      
      next();
      
    } catch (error) {
      console.error('Auth middleware error:', error);
      logSecurityEvent('AUTH_MIDDLEWARE_ERROR', error.message, req);
      return res.status(500).json({ error: 'Authentication service error' });
    }
  }
  
  static requireRole(allowedRoles = ['user']) {
    return (req, res, next) => {
      if (!req.user) {
        logSecurityEvent('AUTH_NO_USER', 'No user object in request', req);
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userRole = req.user.role || 'user';
      
      if (!allowedRoles.includes(userRole)) {
        logSecurityEvent('AUTH_INSUFFICIENT_ROLE', `User role ${userRole} not in ${allowedRoles.join(', ')}`, req);
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: userRole
        });
      }
      
      next();
    };
  }
  
  // Optional authentication - doesn't block if no token
  static optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No auth provided, continue without user
    }
    
    // If auth is provided, verify it
    AuthMiddleware.verifyToken(req, res, next);
  }
  
  // Create a development token for testing
  static generateDevToken() {
    return AuthMiddleware.generateToken('dev-user', 'admin', '7d');
  }
}

// Development helper to generate a token for testing
if (process.env.NODE_ENV === 'development') {
  console.log('Development mode: Use this token for API testing:');
  try {
    console.log('Bearer', AuthMiddleware.generateDevToken());
  } catch (error) {
    console.log('Configure JWT_SECRET in .env file to generate dev tokens');
  }
}