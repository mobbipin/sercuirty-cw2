const axios = require('axios');

class ReCaptchaService {
  constructor() {
    this.secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'; // Test secret for development
    this.verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
  }

  async verifyToken(token, remoteIp) {
    try {
      const response = await axios.post(this.verifyUrl, null, {
        params: {
          secret: this.secretKey,
          response: token,
          remoteip: remoteIp
        }
      });

      const { success, score, action } = response.data;

      // For development, always return true if using test keys
      if (this.secretKey === '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe') {
        return {
          success: true,
          score: 0.9,
          action: 'submit'
        };
      }

      return {
        success,
        score: score || 0,
        action: action || 'submit'
      };
    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      return {
        success: false,
        score: 0,
        action: 'error'
      };
    }
  }

  async verifyLoginCaptcha(token, remoteIp) {
    const result = await this.verifyToken(token, remoteIp);
    
    if (!result.success) {
      return {
        isValid: false,
        message: 'reCAPTCHA verification failed'
      };
    }

    // For login, we can be more lenient
    if (result.score < 0.3) {
      return {
        isValid: false,
        message: 'Suspicious activity detected. Please try again.'
      };
    }

    return {
      isValid: true,
      score: result.score
    };
  }

  async verifySignupCaptcha(token, remoteIp) {
    const result = await this.verifyToken(token, remoteIp);
    
    if (!result.success) {
      return {
        isValid: false,
        message: 'reCAPTCHA verification failed'
      };
    }

    // For signup, we want higher confidence
    if (result.score < 0.5) {
      return {
        isValid: false,
        message: 'Suspicious activity detected. Please try again.'
      };
    }

    return {
      isValid: true,
      score: result.score
    };
  }
}

module.exports = new ReCaptchaService(); 