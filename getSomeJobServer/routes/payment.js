const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateUser, requireRole } = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const { logAuditEvent, SECURITY_CONFIG } = require('../config/security');

// Create payment intent
router.post('/create-payment-intent', authenticateUser, [
  body('amount').isInt({ min: SECURITY_CONFIG.PAYMENT.MIN_AMOUNT, max: SECURITY_CONFIG.PAYMENT.MAX_AMOUNT }),
  body('currency').optional().isIn(['usd', 'eur', 'gbp']),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, currency = 'usd', description } = req.body;
    const userId = req.user.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const metadata = {
      userId,
      userEmail: req.user.email,
      description: description || 'Job Portal Payment',
      ipAddress
    };

    const result = await paymentService.createPaymentIntent(amount, currency, metadata);

    if (result.success) {
      // Log audit event
      logAuditEvent(
        userId,
        'PAYMENT_INTENT_CREATED',
        { amount, currency, paymentIntentId: result.paymentIntentId },
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent'
    });
  }
});

// Confirm payment
router.post('/confirm-payment', authenticateUser, [
  body('paymentIntentId').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { paymentIntentId } = req.body;
    const userId = req.user.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await paymentService.confirmPayment(paymentIntentId);

    if (result.success) {
      // Log audit event
      logAuditEvent(
        userId,
        'PAYMENT_CONFIRMED',
        { paymentIntentId, amount: result.paymentIntent.amount },
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        message: result.message,
        paymentIntent: result.paymentIntent
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment'
    });
  }
});

// Create customer
router.post('/create-customer', authenticateUser, [
  body('email').isEmail().normalizeEmail(),
  body('name').isLength({ min: 2, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, name } = req.body;
    const userId = req.user.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const metadata = {
      userId,
      userEmail: req.user.email
    };

    const result = await paymentService.createCustomer(email, name, metadata);

    if (result.success) {
      // Store customer ID in user document
      await req.db.collection('users').updateOne(
        { _id: userId },
        {
          $set: {
            stripeCustomerId: result.customer.id,
            updatedAt: new Date()
          }
        }
      );

      // Log audit event
      logAuditEvent(
        userId,
        'CUSTOMER_CREATED',
        { customerId: result.customer.id, email },
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        customer: result.customer
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer'
    });
  }
});

// Get payment methods
router.get('/payment-methods', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await req.db.collection('users').findOne({ _id: userId });
    
    if (!user.stripeCustomerId) {
      return res.status(404).json({
        success: false,
        message: 'No customer found'
      });
    }

    const result = await paymentService.getPaymentMethods(user.stripeCustomerId);

    if (result.success) {
      res.json({
        success: true,
        paymentMethods: result.paymentMethods
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment methods'
    });
  }
});

// Create refund (admin only)
router.post('/refund', authenticateUser, requireRole(['employer']), [
  body('paymentIntentId').notEmpty(),
  body('amount').optional().isInt({ min: 1 }),
  body('reason').optional().isIn(['duplicate', 'fraudulent', 'requested_by_customer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { paymentIntentId, amount, reason = 'requested_by_customer' } = req.body;
    const userId = req.user.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await paymentService.createRefund(paymentIntentId, amount, reason);

    if (result.success) {
      // Log audit event
      logAuditEvent(
        userId,
        'REFUND_CREATED',
        { paymentIntentId, amount, reason, refundId: result.refund.id },
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        refund: result.refund
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error) {
    console.error('Create refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create refund'
    });
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;

    const result = await paymentService.processWebhook(payload, signature);

    if (result.success) {
      // Log webhook event
      console.log('Webhook processed successfully:', result.event.type);
      res.json({ received: true });
    } else {
      console.error('Webhook processing failed:', result.error);
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// Get payment history
router.get('/history', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get payment history from database (you'll need to store payment records)
    const payments = await req.db.collection('payments')
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await req.db.collection('payments').countDocuments({ userId });

    res.json({
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history'
    });
  }
});

// Save payment record
router.post('/save-payment', authenticateUser, [
  body('paymentIntentId').notEmpty(),
  body('amount').isInt({ min: 1 }),
  body('currency').isIn(['usd', 'eur', 'gbp']),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { paymentIntentId, amount, currency, description } = req.body;
    const userId = req.user.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Save payment record
    const paymentRecord = {
      userId,
      paymentIntentId,
      amount,
      currency,
      description: description || 'Job Portal Payment',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await req.db.collection('payments').insertOne(paymentRecord);

    if (result.insertedId) {
      // Log audit event
      logAuditEvent(
        userId,
        'PAYMENT_RECORD_SAVED',
        { paymentIntentId, amount, currency },
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        message: 'Payment record saved',
        paymentId: result.insertedId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save payment record'
      });
    }

  } catch (error) {
    console.error('Save payment record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save payment record'
    });
  }
});

module.exports = router; 