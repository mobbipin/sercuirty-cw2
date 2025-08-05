const stripe = require('stripe');
const { SECURITY_CONFIG, logAuditEvent, encryptData, decryptData } = require('../config/security');

// Initialize Stripe
const stripeClient = stripe(SECURITY_CONFIG.PAYMENT.STRIPE_SECRET_KEY);

// Payment service
const paymentService = {
  // Create a payment intent
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      // Validate amount
      if (amount < SECURITY_CONFIG.PAYMENT.MIN_AMOUNT) {
        throw new Error(`Amount must be at least $${SECURITY_CONFIG.PAYMENT.MIN_AMOUNT / 100}`);
      }
      
      if (amount > SECURITY_CONFIG.PAYMENT.MAX_AMOUNT) {
        throw new Error(`Amount cannot exceed $${SECURITY_CONFIG.PAYMENT.MAX_AMOUNT / 100}`);
      }

      const paymentIntent = await stripeClient.paymentIntents.create({
        amount,
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Payment intent creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Confirm payment
  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntent,
          message: 'Payment confirmed successfully'
        };
      } else {
        return {
          success: false,
          error: `Payment status: ${paymentIntent.status}`
        };
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Create a subscription
  async createSubscription(customerId, priceId, metadata = {}) {
    try {
      const subscription = await stripeClient.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return {
        success: true,
        subscription,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret
      };
    } catch (error) {
      console.error('Subscription creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Create a customer
  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await stripeClient.customers.create({
        email,
        name,
        metadata
      });

      return {
        success: true,
        customer
      };
    } catch (error) {
      console.error('Customer creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Encrypt payment data
  encryptPaymentData(data) {
    const encryptionKey = process.env.PAYMENT_ENCRYPTION_KEY || 'default-key-change-in-production';
    return encryptData(JSON.stringify(data), encryptionKey);
  },

  // Decrypt payment data
  decryptPaymentData(encryptedData, iv, tag) {
    const encryptionKey = process.env.PAYMENT_ENCRYPTION_KEY || 'default-key-change-in-production';
    try {
      const decrypted = decryptData(encryptedData, encryptionKey, iv, tag);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Payment data decryption error:', error);
      return null;
    }
  },

  // Process webhook
  async processWebhook(payload, signature) {
    try {
      const event = stripeClient.webhooks.constructEvent(
        payload,
        signature,
        SECURITY_CONFIG.PAYMENT.STRIPE_WEBHOOK_SECRET
      );

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log('Payment succeeded:', paymentIntent.id);
          break;
        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          console.log('Payment failed:', failedPayment.id);
          break;
        case 'customer.subscription.created':
          const subscription = event.data.object;
          console.log('Subscription created:', subscription.id);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return {
        success: true,
        event
      };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get payment methods
  async getPaymentMethods(customerId) {
    try {
      const paymentMethods = await stripeClient.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return {
        success: true,
        paymentMethods: paymentMethods.data
      };
    } catch (error) {
      console.error('Get payment methods error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Create refund
  async createRefund(paymentIntentId, amount, reason = 'requested_by_customer') {
    try {
      const refund = await stripeClient.refunds.create({
        payment_intent: paymentIntentId,
        amount,
        reason
      });

      return {
        success: true,
        refund
      };
    } catch (error) {
      console.error('Refund creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = paymentService; 