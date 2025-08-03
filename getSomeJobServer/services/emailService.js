const nodemailer = require('nodemailer');

// Check if we have email credentials
const hasEmailCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

// Email configuration
let emailConfig;
let transporter;

if (hasEmailCredentials) {
  // Real SMTP configuration
  emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  };
  transporter = nodemailer.createTransport(emailConfig);
} else {
  // Mock email service for development
  console.log('⚠️  Email credentials not found. Using mock email service for development.');
  console.log('📧 To enable real email sending, set EMAIL_USER and EMAIL_PASS environment variables.');
  
  // Create a mock transporter that logs emails to console
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('\n📧 MOCK EMAIL SENT (Development Mode):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📨 To: ${mailOptions.to}`);
      console.log(`📧 From: ${mailOptions.from}`);
      console.log(`📝 Subject: ${mailOptions.subject}`);
      console.log('📄 Content:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(mailOptions.html);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      return {
        messageId: `mock-${Date.now()}`,
        response: 'Mock email sent successfully'
      };
    },
    verify: async () => {
      console.log('✅ Mock email service is ready');
      return true;
    }
  };
}

// Email templates
const emailTemplates = {
  // OTP verification email
  otpVerification: (otp, userName) => ({
    subject: 'Email Verification - Job Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #3575E2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Job Portal</h1>
          <p style="margin: 10px 0 0 0;">Email Verification</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thank you for registering with Job Portal. To complete your registration, please use the verification code below:
          </p>
          
          <div style="background-color: #3575E2; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
            <h1 style="margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            This code will expire in 10 minutes. If you didn't request this verification, please ignore this email.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </div>
    `
  }),

  // Password reset email
  passwordReset: (resetToken, userName) => ({
    subject: 'Password Reset - Job Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #3575E2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Job Portal</h1>
          <p style="margin: 10px 0 0 0;">Password Reset</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/reset-password?token=${resetToken}" 
               style="background-color: #3575E2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </div>
    `
  }),

  // Application status update
  applicationStatus: (userName, jobTitle, companyName, status) => ({
    subject: `Application Update - ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #3575E2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Job Portal</h1>
          <p style="margin: 10px 0 0 0;">Application Update</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been updated.
          </p>
          
          <div style="background-color: ${status === 'accepted' ? '#10B981' : status === 'rejected' ? '#EF4444' : '#F59E0B'}; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
            <h3 style="margin: 0; text-transform: uppercase;">Status: ${status}</h3>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            ${status === 'accepted' 
              ? 'Congratulations! Your application has been accepted. We will contact you soon with next steps.'
              : status === 'rejected'
              ? 'We regret to inform you that your application was not selected for this position. We encourage you to apply for other opportunities.'
              : 'Your application is currently under review. We will update you as soon as possible.'
            }
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </div>
    `
  })
};

// Email service functions
const emailService = {
  // Send OTP verification email
  async sendOTPVerification(email, otp, userName) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@jobportal.com',
        to: email,
        ...emailTemplates.otpVerification(otp, userName)
      };

      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  },

  // Send password reset email
  async sendPasswordReset(email, resetToken, userName) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@jobportal.com',
        to: email,
        ...emailTemplates.passwordReset(resetToken, userName)
      };

      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  },

  // Send application status update email
  async sendApplicationStatus(email, userName, jobTitle, companyName, status) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@jobportal.com',
        to: email,
        ...emailTemplates.applicationStatus(userName, jobTitle, companyName, status)
      };

      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  },

  // Verify email connection
  async verifyConnection() {
    try {
      await transporter.verify();
      return true;
    } catch (error) {
      console.error('❌ Email service verification failed:', error.message);
      return false;
    }
  }
};

module.exports = emailService; 