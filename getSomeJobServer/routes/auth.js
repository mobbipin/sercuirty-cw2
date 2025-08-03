const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  passwordValidationRules,
  checkPasswordStrength,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateOTP,
  generateSessionId,
  logAuditEvent,
  SECURITY_CONFIG
} = require('../config/security');
const emailService = require('../services/emailService');
const recaptchaService = require('../services/recaptchaService');
const { authLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

// In-memory OTP storage (in production, use Redis)
const otpStore = new Map();
const passwordResetTokens = new Map();

// User registration with email verification
router.post('/register', registerLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('role').isIn(['jobseeker', 'employer']),
  body('captchaToken').notEmpty().withMessage('reCAPTCHA verification required'),
  ...passwordValidationRules
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, name, password, role, company, captchaToken } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Verify reCAPTCHA
    const captchaResult = await recaptchaService.verifySignupCaptcha(captchaToken, ipAddress);
    if (!captchaResult.isValid) {
      return res.status(400).json({
        success: false,
        message: captchaResult.message
      });
    }

    // Check password strength
    const passwordStrength = checkPasswordStrength(password);
    if (!passwordStrength.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        passwordStrength
      });
    }

    // Check if user already exists
    const existingUser = await req.db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + SECURITY_CONFIG.EMAIL.OTP_EXPIRES_IN;

    // Store OTP temporarily
    otpStore.set(email, {
      otp,
      expiry: otpExpiry,
      attempts: 0
    });

    // Create user document (unverified)
    const user = {
      email,
      name,
      role,
      company: company || null,
      password: hashedPassword,
      isVerified: false,
      verificationOTP: otp,
      otpExpiry,
      passwordHistory: [{
        password: hashedPassword,
        createdAt: new Date()
      }],
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save user to database
    const result = await req.db.collection('users').insertOne(user);

    // Send verification email
    const emailResult = await emailService.sendOTPVerification(email, otp, name);

    if (!emailResult.success) {
      // If email fails, delete the user
      await req.db.collection('users').deleteOne({ _id: result.insertedId });
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    // Log audit event
    logAuditEvent(
      result.insertedId.toString(),
      'USER_REGISTRATION',
      { email, role, company },
      ipAddress,
      userAgent
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for verification.',
      userId: result.insertedId
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Email verification
router.post('/verify-email', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Find user
    const user = await req.db.collection('users').findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Check OTP
    const storedOTP = otpStore.get(email);
    if (!storedOTP || storedOTP.otp !== otp || Date.now() > storedOTP.expiry) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Verify user
    await req.db.collection('users').updateOne(
      { email },
      {
        $set: {
          isVerified: true,
          verifiedAt: new Date(),
          updatedAt: new Date()
        },
        $unset: {
          verificationOTP: "",
          otpExpiry: ""
        }
      }
    );

    // Clear OTP from store
    otpStore.delete(email);

    // Generate session
    const sessionId = generateSessionId();
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId
    });

    // Log audit event
    logAuditEvent(
      user._id.toString(),
      'EMAIL_VERIFICATION',
      { email },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
});

// User login with security features
router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  body('captchaToken').notEmpty().withMessage('reCAPTCHA verification required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, captchaToken } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Verify reCAPTCHA
    const captchaResult = await recaptchaService.verifyLoginCaptcha(captchaToken, ipAddress);
    if (!captchaResult.isValid) {
      return res.status(400).json({
        success: false,
        message: captchaResult.message
      });
    }

    // Find user
    const user = await req.db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed attempts'
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      // Increment failed attempts
      const newLoginAttempts = (user.loginAttempts || 0) + 1;
      const lockUntil = newLoginAttempts >= 5 ? Date.now() + (15 * 60 * 1000) : null; // 15 minutes lock

      await req.db.collection('users').updateOne(
        { email },
        {
          $set: {
            loginAttempts: newLoginAttempts,
            lockUntil
          }
        }
      );

      // Log audit event
      logAuditEvent(
        user._id.toString(),
        'LOGIN_FAILED',
        { email, reason: 'Invalid password' },
        ipAddress,
        userAgent
      );

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    await req.db.collection('users').updateOne(
      { email },
      {
        $set: {
          loginAttempts: 0,
          lockUntil: null,
          lastLogin: new Date()
        }
      }
    );

    // Generate session
    const sessionId = generateSessionId();
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId
    });

    // Log audit event
    logAuditEvent(
      user._id.toString(),
      'LOGIN_SUCCESS',
      { email },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Password reset request
router.post('/forgot-password', passwordResetLimiter, [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Find user
    const user = await req.db.collection('users').findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetExpiry = Date.now() + (60 * 60 * 1000); // 1 hour

    // Store reset token
    passwordResetTokens.set(resetToken, {
      userId: user._id.toString(),
      email: user.email,
      expiry: resetExpiry
    });

    // Send reset email
    const emailResult = await emailService.sendPasswordReset(email, resetToken, user.name);

    if (emailResult.success) {
      // Log audit event
      logAuditEvent(
        user._id.toString(),
        'PASSWORD_RESET_REQUESTED',
        { email },
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        message: 'Password reset link sent to your email'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      });
    }

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    });
  }
});

// Validate reset token
router.post('/validate-reset-token', [
  body('token').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { token } = req.body;

    // Verify reset token
    const resetData = passwordResetTokens.get(token);
    if (!resetData || Date.now() > resetData.expiry) {
      return res.json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    res.json({
      success: true,
      message: 'Reset token is valid'
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Token validation failed'
    });
  }
});

// Reset password with token
router.post('/reset-password', [
  body('token').notEmpty(),
  ...passwordValidationRules
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { token, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check password strength
    const passwordStrength = checkPasswordStrength(password);
    if (!passwordStrength.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        passwordStrength
      });
    }

    // Verify reset token
    const resetData = passwordResetTokens.get(token);
    if (!resetData || Date.now() > resetData.expiry) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Find user
    const user = await req.db.collection('users').findOne({ _id: resetData.userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if password is in history
    const passwordHistory = user.passwordHistory || [];
    for (const historyItem of passwordHistory) {
      const isSamePassword = await comparePassword(password, historyItem.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'Password cannot be the same as your previous passwords'
        });
      }
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and history
    const newPasswordHistory = [
      { password: hashedPassword, createdAt: new Date() },
      ...passwordHistory.slice(0, SECURITY_CONFIG.PASSWORD.PREVIOUS_PASSWORDS_COUNT - 1)
    ];

    await req.db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          passwordHistory: newPasswordHistory,
          updatedAt: new Date()
        }
      }
    );

    // Remove reset token
    passwordResetTokens.delete(token);

    // Log audit event
    logAuditEvent(
      user._id.toString(),
      'PASSWORD_RESET_COMPLETED',
      { email: user.email },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    });
  }
});

// Change password (authenticated)
router.post('/change-password', [
  body('currentPassword').notEmpty(),
  ...passwordValidationRules
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { currentPassword, password } = req.body;
    const userId = req.user.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check password strength
    const passwordStrength = checkPasswordStrength(password);
    if (!passwordStrength.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        passwordStrength
      });
    }

    // Find user
    const user = await req.db.collection('users').findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await comparePassword(password, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Check if password is in history
    const passwordHistory = user.passwordHistory || [];
    for (const historyItem of passwordHistory) {
      const isSamePassword = await comparePassword(password, historyItem.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'Password cannot be the same as your previous passwords'
        });
      }
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and history
    const newPasswordHistory = [
      { password: hashedPassword, createdAt: new Date() },
      ...passwordHistory.slice(0, SECURITY_CONFIG.PASSWORD.PREVIOUS_PASSWORDS_COUNT - 1)
    ];

    await req.db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          passwordHistory: newPasswordHistory,
          updatedAt: new Date()
        }
      }
    );

    // Log audit event
    logAuditEvent(
      user._id.toString(),
      'PASSWORD_CHANGED',
      { email: user.email },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed'
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (userId) {
      // Log audit event
      logAuditEvent(
        userId,
        'LOGOUT',
        { email: req.user.email },
        ipAddress,
        userAgent
      );
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await req.db.collection('users').findOne(
      { _id: userId },
      { projection: { password: 0, passwordHistory: 0, verificationOTP: 0, otpExpiry: 0 } }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// Update user profile
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('company').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user.userId;
    const { name, company } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const updateData = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (company !== undefined) updateData.company = company;

    const result = await req.db.collection('users').updateOne(
      { _id: userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log audit event
    logAuditEvent(
      userId,
      'PROFILE_UPDATED',
      { name, company },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

module.exports = router; 