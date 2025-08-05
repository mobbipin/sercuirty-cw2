const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  generateMFASecret,
  generateMFACode,
  verifyMFAToken,
  generateBackupCodes,
  verifyBackupCode,
  logAuditEvent,
  SECURITY_CONFIG
} = require('../config/security');
const { authenticateUser } = require('../middleware/auth');
const emailService = require('../services/emailService');

// Setup MFA
router.post('/setup', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check if MFA is already enabled
    const user = await req.db.collection('users').findOne({ _id: userId });
    if (user.mfaEnabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA is already enabled for this account'
      });
    }

    // Generate MFA secret
    const mfaSecret = generateMFASecret(user.email);
    
    // Generate QR code
    const qrCode = await generateMFACode(mfaSecret);
    
    // Generate backup codes
    const backupCodes = generateBackupCodes();
    
    // Store MFA setup temporarily (not enabled yet)
    await req.db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          mfaSecret: mfaSecret.base32,
          mfaBackupCodes: backupCodes,
          mfaSetupPending: true,
          updatedAt: new Date()
        }
      }
    );

    // Log audit event
    logAuditEvent(
      userId,
      'MFA_SETUP_INITIATED',
      { email: user.email },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'MFA setup initiated',
      qrCode,
      backupCodes,
      secret: mfaSecret.base32 // For manual entry
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'MFA setup failed'
    });
  }
});

// Verify and enable MFA
router.post('/verify-setup', authenticateUser, [
  body('token').isLength({ min: 6, max: 6 }).isNumeric()
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
    const userId = req.user.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Get user with MFA secret
    const user = await req.db.collection('users').findOne({ _id: userId });
    if (!user.mfaSetupPending || !user.mfaSecret) {
      return res.status(400).json({
        success: false,
        message: 'MFA setup not initiated'
      });
    }

    // Verify token
    const isValid = verifyMFAToken(token, user.mfaSecret);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid MFA token'
      });
    }

    // Enable MFA
    await req.db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          mfaEnabled: true,
          mfaSetupPending: false,
          updatedAt: new Date()
        },
        $unset: {
          mfaSecret: ""
        }
      }
    );

    // Log audit event
    logAuditEvent(
      userId,
      'MFA_ENABLED',
      { email: user.email },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'MFA enabled successfully'
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'MFA verification failed'
    });
  }
});

// Disable MFA
router.post('/disable', authenticateUser, [
  body('token').isLength({ min: 6, max: 6 }).isNumeric()
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
    const userId = req.user.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Get user
    const user = await req.db.collection('users').findOne({ _id: userId });
    if (!user.mfaEnabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA is not enabled for this account'
      });
    }

    // Verify token
    const isValid = verifyMFAToken(token, user.mfaSecret);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid MFA token'
      });
    }

    // Disable MFA
    await req.db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          mfaEnabled: false,
          updatedAt: new Date()
        },
        $unset: {
          mfaSecret: "",
          mfaBackupCodes: ""
        }
      }
    );

    // Log audit event
    logAuditEvent(
      userId,
      'MFA_DISABLED',
      { email: user.email },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'MFA disabled successfully'
    });

  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'MFA disable failed'
    });
  }
});

// Verify MFA token during login
router.post('/verify', [
  body('email').isEmail().normalizeEmail(),
  body('token').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, token } = req.body;
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

    if (!user.mfaEnabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA is not enabled for this account'
      });
    }

    // Verify token
    const isValid = verifyMFAToken(token, user.mfaSecret);
    if (!isValid) {
      // Log failed attempt
      logAuditEvent(
        user._id.toString(),
        'MFA_VERIFICATION_FAILED',
        { email, reason: 'Invalid token' },
        ipAddress,
        userAgent
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid MFA token'
      });
    }

    // Log successful verification
    logAuditEvent(
      user._id.toString(),
      'MFA_VERIFICATION_SUCCESS',
      { email },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'MFA verification successful'
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'MFA verification failed'
    });
  }
});

// Verify backup code
router.post('/verify-backup', [
  body('email').isEmail().normalizeEmail(),
  body('backupCode').isLength({ min: 8, max: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, backupCode } = req.body;
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

    if (!user.mfaEnabled || !user.mfaBackupCodes) {
      return res.status(400).json({
        success: false,
        message: 'MFA backup codes not available'
      });
    }

    // Verify backup code
    const isValid = verifyBackupCode(backupCode, user.mfaBackupCodes);
    if (!isValid) {
      // Log failed attempt
      logAuditEvent(
        user._id.toString(),
        'MFA_BACKUP_VERIFICATION_FAILED',
        { email, reason: 'Invalid backup code' },
        ipAddress,
        userAgent
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid backup code'
      });
    }

    // Remove used backup code
    const updatedBackupCodes = user.mfaBackupCodes.filter(code => code !== backupCode.toUpperCase());
    await req.db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          mfaBackupCodes: updatedBackupCodes,
          updatedAt: new Date()
        }
      }
    );

    // Log successful verification
    logAuditEvent(
      user._id.toString(),
      'MFA_BACKUP_VERIFICATION_SUCCESS',
      { email },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'Backup code verification successful'
    });

  } catch (error) {
    console.error('Backup code verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Backup code verification failed'
    });
  }
});

// Get MFA status
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await req.db.collection('users').findOne(
      { _id: userId },
      { projection: { mfaEnabled: 1, mfaBackupCodes: 1 } }
    );

    res.json({
      success: true,
      mfaEnabled: user.mfaEnabled || false,
      backupCodesRemaining: user.mfaBackupCodes ? user.mfaBackupCodes.length : 0
    });

  } catch (error) {
    console.error('Get MFA status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get MFA status'
    });
  }
});

// Generate new backup codes
router.post('/regenerate-backup-codes', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const user = await req.db.collection('users').findOne({ _id: userId });
    if (!user.mfaEnabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA is not enabled for this account'
      });
    }

    // Generate new backup codes
    const newBackupCodes = generateBackupCodes();

    // Update user
    await req.db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          mfaBackupCodes: newBackupCodes,
          updatedAt: new Date()
        }
      }
    );

    // Log audit event
    logAuditEvent(
      userId,
      'MFA_BACKUP_CODES_REGENERATED',
      { email: user.email },
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'Backup codes regenerated successfully',
      backupCodes: newBackupCodes
    });

  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate backup codes'
    });
  }
});

module.exports = router; 