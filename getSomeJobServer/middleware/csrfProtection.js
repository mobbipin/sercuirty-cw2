const crypto = require('crypto');

// In-memory token store (in production, use Redis)
const csrfTokens = new Map();

const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const validateCSRFToken = (token) => {
  return csrfTokens.has(token);
};

const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests
  if (req.method === 'GET') {
    return next();
  }

  // Skip CSRF for API endpoints that use reCAPTCHA
  if (req.path === '/api/auth/login' || req.path === '/api/auth/register') {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;

  if (!token || !validateCSRFToken(token)) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token validation failed'
    });
  }

  // Remove used token
  csrfTokens.delete(token);
  next();
};

const generateToken = (req, res, next) => {
  const token = generateCSRFToken();
  csrfTokens.set(token, {
    createdAt: Date.now(),
    ip: req.ip
  });

  // Set token in response header
  res.setHeader('X-CSRF-Token', token);
  next();
};

// Clean up expired tokens (run every hour)
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (now - data.createdAt > 60 * 60 * 1000) { // 1 hour
      csrfTokens.delete(token);
    }
  }
}, 60 * 60 * 1000);

module.exports = {
  csrfProtection,
  generateToken
}; 