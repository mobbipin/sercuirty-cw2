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
    SALT_ROUNDS: 12,
    EXPIRY_DAYS: 90, // Password expires after 90 days
    WARNING_DAYS: 7   // Warn users 7 days before expiry
  },
  
  // MFA Configuration
  MFA: {
    ENABLED: true,
    ISSUER: 'Job Portal',
    ALGORITHM: 'sha1',
    DIGITS: 6,
    PERIOD: 30,
    WINDOW: 2, // Allow 2 time steps for clock skew
    BACKUP_CODES_COUNT: 10,
    BACKUP_CODE_LENGTH: 8
  },
  
  // Session configuration
  SESSION: {
    SECRET: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    MAX_AGE: 30 * 24 * 60 * 60 * 1000, // 30 days
    HTTP_ONLY: true,
    SECURE: process.env.NODE_ENV === 'production',
    SAME_SITE: 'strict',
    CONCURRENT_SESSIONS: 3 // Maximum concurrent sessions per user
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
    MAX_REQUESTS: 100,
    MESSAGE: 'Too many requests from this IP, please try again later.'
  },
  
  // Email verification
  EMAIL: {
    OTP_EXPIRES_IN: 10 * 60 * 1000, // 10 minutes
    OTP_LENGTH: 6
  },
  
  // Payment configuration
  PAYMENT: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    CURRENCY: 'usd',
    MIN_AMOUNT: 100, // $1.00 minimum
    MAX_AMOUNT: 1000000 // $10,000 maximum
  },
  
  // Data encryption
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    TAG_LENGTH: 16
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

// MFA Functions
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Generate MFA secret
const generateMFASecret = (email) => {
  return speakeasy.generateSecret({
    name: `${SECURITY_CONFIG.MFA.ISSUER} (${email})`,
    issuer: SECURITY_CONFIG.MFA.ISSUER,
    algorithm: SECURITY_CONFIG.MFA.ALGORITHM,
    digits: SECURITY_CONFIG.MFA.DIGITS,
    period: SECURITY_CONFIG.MFA.PERIOD
  });
};

// Generate QR code for MFA setup
const generateMFACode = async (secret) => {
  try {
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    return qrCode;
  } catch (error) {
    console.error('QR code generation error:', error);
    return null;
  }
};

// Verify MFA token
const verifyMFAToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: SECURITY_CONFIG.MFA.WINDOW,
    algorithm: SECURITY_CONFIG.MFA.ALGORITHM,
    digits: SECURITY_CONFIG.MFA.DIGITS,
    period: SECURITY_CONFIG.MFA.PERIOD
  });
};

// Generate backup codes
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < SECURITY_CONFIG.MFA.BACKUP_CODES_COUNT; i++) {
    codes.push(crypto.randomBytes(SECURITY_CONFIG.MFA.BACKUP_CODE_LENGTH / 2).toString('hex').toUpperCase());
  }
  return codes;
};

// Verify backup code
const verifyBackupCode = (code, backupCodes) => {
  return backupCodes.includes(code.toUpperCase());
};

// Password expiry functions
const checkPasswordExpiry = (passwordCreatedAt) => {
  const now = new Date();
  const created = new Date(passwordCreatedAt);
  const daysSinceCreation = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  
  return {
    isExpired: daysSinceCreation >= SECURITY_CONFIG.PASSWORD.EXPIRY_DAYS,
    daysUntilExpiry: SECURITY_CONFIG.PASSWORD.EXPIRY_DAYS - daysSinceCreation,
    shouldWarn: daysSinceCreation >= (SECURITY_CONFIG.PASSWORD.EXPIRY_DAYS - SECURITY_CONFIG.PASSWORD.WARNING_DAYS)
  };
};

// Data encryption functions
const encryptData = (data, key) => {
  const iv = crypto.randomBytes(SECURITY_CONFIG.ENCRYPTION.IV_LENGTH);
  const cipher = crypto.createCipher(SECURITY_CONFIG.ENCRYPTION.ALGORITHM, key);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
};

const decryptData = (encryptedData, key, iv, tag) => {
  const decipher = crypto.createDecipher(SECURITY_CONFIG.ENCRYPTION.ALGORITHM, key);
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
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
  auditLogger,
  // MFA functions
  generateMFASecret,
  generateMFACode,
  verifyMFAToken,
  generateBackupCodes,
  verifyBackupCode,
  // Password expiry functions
  checkPasswordExpiry,
  // Data encryption functions
  encryptData,
  decryptData
};