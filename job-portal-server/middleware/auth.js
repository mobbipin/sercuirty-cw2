const { verifyToken } = require('../config/security');

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    let token = null;
    
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Check for token in cookies (for session-based auth)
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Check for token in query parameters (for email verification links)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify JWT token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Check if user exists and is verified
    const user = await req.db.collection('users').findOne(
      { _id: decoded.userId },
      { projection: { password: 0, passwordHistory: 0, verificationOTP: 0, otpExpiry: 0 } }
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Email not verified'
      });
    }

    // Add user info to request
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      company: user.company,
      sessionId: decoded.sessionId
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Check for token in cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      // Verify JWT token
      const decoded = verifyToken(token);
      if (decoded) {
        // Check if user exists and is verified
        const user = await req.db.collection('users').findOne(
          { _id: decoded.userId },
          { projection: { password: 0, passwordHistory: 0, verificationOTP: 0, otpExpiry: 0 } }
        );

        if (user && user.isVerified) {
          req.user = {
            userId: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            company: user.company,
            sessionId: decoded.sessionId
          };
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue without authentication
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Rate limiting middleware for specific endpoints
const createRateLimiter = (windowMs, maxRequests, message) => {
  const rateLimit = require('express-rate-limit');
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      message: message
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP address and user ID if available
      return req.user ? `${req.ip}-${req.user.userId}` : req.ip;
    }
  });
};

// Specific rate limiters
const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts. Please try again later.'
);

const apiRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many requests. Please try again later.'
);

// Session validation middleware
const validateSession = async (req, res, next) => {
  try {
    if (!req.user || !req.user.sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session'
      });
    }

    // Check if session is still valid in database
    const session = await req.db.collection('sessions').findOne({
      userId: req.user.userId,
      sessionId: req.user.sessionId,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session expired'
      });
    }

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Session validation failed'
    });
  }
};

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF check for GET requests
  if (req.method === 'GET') {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token validation failed'
    });
  }

  next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }

  next();
};

module.exports = {
  authenticateUser,
  optionalAuth,
  requireRole,
  authRateLimiter,
  apiRateLimiter,
  validateSession,
  csrfProtection,
  sanitizeInput
}; 