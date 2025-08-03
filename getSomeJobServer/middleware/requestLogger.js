const { logAuditEvent } = require('../config/security');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  // Log request details
  const requestLog = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    headers: {
      host: req.get('Host'),
      origin: req.get('Origin'),
      'x-forwarded-for': req.get('X-Forwarded-For'),
      'x-real-ip': req.get('X-Real-IP')
    }
  };

  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script/i, // XSS attempts
    /union\s+select/i, // SQL injection
    /eval\s*\(/i, // Code injection
    /document\.cookie/i, // Cookie theft attempts
    /javascript:/i, // Protocol injection
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || pattern.test(JSON.stringify(req.body))
  );

  if (isSuspicious) {
    console.warn('🚨 SUSPICIOUS REQUEST DETECTED:', requestLog);
    
    // Log to audit trail
    logAuditEvent(
      'SYSTEM',
      'SUSPICIOUS_REQUEST',
      {
        requestId,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: JSON.stringify(req.body).substring(0, 500) // Limit body size
      },
      req.ip,
      req.get('User-Agent')
    );
  }

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    const responseLog = {
      ...requestLog,
      statusCode: res.statusCode,
      duration,
      responseSize: chunk ? chunk.length : 0
    };

    // Log slow requests
    if (duration > 5000) {
      console.warn('🐌 SLOW REQUEST:', responseLog);
    }

    // Log error responses
    if (res.statusCode >= 400) {
      console.error('❌ ERROR RESPONSE:', responseLog);
    }

    // Log successful requests (but not too verbose)
    if (res.statusCode >= 200 && res.statusCode < 300 && duration < 1000) {
      console.log('✅ REQUEST:', `${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = requestLogger; 