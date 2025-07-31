import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const ReCaptcha = ({ onVerify, onExpire, error }) => {
  const handleVerify = (token) => {
    onVerify(token);
  };

  const handleExpire = () => {
    onExpire();
  };

  return (
    <div className="flex justify-center mb-4">
      <div className="transform scale-90">
        <ReCAPTCHA
          sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // Test key for development
          onChange={handleVerify}
          onExpired={handleExpire}
        />
      </div>
      {error && (
        <p className="text-red-600 text-sm mt-1 text-center w-full">
          {error}
        </p>
      )}
    </div>
  );
};

export default ReCaptcha; 