const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const winston = require('winston');

// Security Configuration
const SECURITY_CONFIG = {
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 16,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    PREVENT_USERNAME_MATCH: true,
    PREVIOUS_PASSWORDS_COUNT: 5,
    SALT_ROUNDS: 12
  },
  
  // Session configuration
  SESSION: {
    SECRET: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    MAX_AGE: 30 * 24 * 60 * 60 * 1000, // 30 days
    HTTP_ONLY: true,
    SECURE: process.env.NODE_ENV === 'production',
    SAME_SITE: 'strict'
  },
  
  // JWT configuration
  JWT: {
    SECRET: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    EXPIRES_IN: '30d',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex'),
    REFRESH_EXPIRES_IN: '7d'
  },
  
  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 1000,
    MESSAGE: 'Too many requests from this IP, please try again later.'
  },
  
  // Email verification
  EMAIL: {
    OTP_EXPIRES_IN: 10 * 60 * 1000, // 10 minutes
    OTP_LENGTH: 6
  }
};

// Password validation rules
const passwordValidationRules = [
  body('password')
    .isLength({ min: SECURITY_CONFIG.PASSWORD.MIN_LENGTH, max: SECURITY_CONFIG.PASSWORD.MAX_LENGTH })
    .withMessage(`Password must be between ${SECURITY_CONFIG.PASSWORD.MIN_LENGTH} and ${SECURITY_CONFIG.PASSWORD.MAX_LENGTH} characters`)
    .matches(/^(?=.*[a-z])/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/^(?=.*[A-Z])/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/^(?=.*\d)/)
    .withMessage('Password must contain at least one number')
    .matches(/^(?=.*[@$!%*?&])/)
    .withMessage('Password must contain at least one special character (@$!%*?&)')
    .custom((value, { req }) => {
      if (SECURITY_CONFIG.PASSWORD.PREVENT_USERNAME_MATCH && req.body.email) {
        const email = req.body.email.toLowerCase();
        if (value.toLowerCase().includes(email.split('@')[0])) {
          throw new Error('Password cannot contain your email username');
        }
      }
      return true;
    })
];

// Password strength checker
const checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= SECURITY_CONFIG.PASSWORD.MIN_LENGTH && password.length <= SECURITY_CONFIG.PASSWORD.MAX_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[@$!%*?&]/.test(password)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  const strength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong';
  
  return {
    score,
    strength,
    checks,
    isValid: score === 5
  };
};

// Password hashing
const hashPassword = async (password) => {
  return await bcrypt.hash(password, SECURITY_CONFIG.PASSWORD.SALT_ROUNDS);
};

// Password comparison
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// JWT token generation
const generateToken = (payload) => {
  return jwt.sign(payload, SECURITY_CONFIG.JWT.SECRET, {
    expiresIn: SECURITY_CONFIG.JWT.EXPIRES_IN
  });
};

// JWT token verification
const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECURITY_CONFIG.JWT.SECRET);
  } catch (error) {
    return null;
  }
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Audit logger configuration
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'job-portal-audit' },
  transports: [
    new winston.transports.File({ filename: 'logs/audit.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Audit logging function
const logAuditEvent = (userId, action, details, ipAddress, userAgent) => {
  auditLogger.info({
    userId,
    action,
    details,
    ipAddress,
    userAgent,
    timestamp: new Date().toISOString()
  });
};

// Security middleware
const securityMiddleware = {
  // Rate limiting
  rateLimiter: require('express-rate-limit')({
    windowMs: SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS,
    max: SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS,
    message: SECURITY_CONFIG.RATE_LIMIT.MESSAGE,
    standardHeaders: true,
    legacyHeaders: false
  }),
  
  // Helmet for security headers
  helmet: require('helmet')({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    }
  }),
  
  // XSS protection
  xssClean: require('xss-clean')(),
  
  // HPP protection
  hpp: require('hpp')(),
  
  // MongoDB sanitization
  mongoSanitize: require('express-mongo-sanitize')()
};

// Session configuration
const sessionConfig = {
  secret: SECURITY_CONFIG.SESSION.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: SECURITY_CONFIG.SESSION.HTTP_ONLY,
    secure: SECURITY_CONFIG.SESSION.SECURE,
    sameSite: SECURITY_CONFIG.SESSION.SAME_SITE,
    maxAge: SECURITY_CONFIG.SESSION.MAX_AGE
  },
  name: 'job-portal-session'
};

module.exports = {
  SECURITY_CONFIG,
  passwordValidationRules,
  checkPasswordStrength,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateOTP,
  generateSessionId,
  logAuditEvent,
  securityMiddleware,
  sessionConfig,
  auditLogger
};