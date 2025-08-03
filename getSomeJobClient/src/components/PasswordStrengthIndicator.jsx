import React, { useState, useEffect } from 'react';

const PasswordStrengthIndicator = ({ password, onStrengthChange }) => {
  const [strength, setStrength] = useState({
    score: 0,
    strength: 'weak',
    checks: {
      length: false,
      lowercase: false,
      uppercase: false,
      numbers: false,
      special: false
    }
  });

  useEffect(() => {
    const checkPasswordStrength = (password) => {
      const checks = {
        length: password.length >= 8 && password.length <= 16,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        numbers: /\d/.test(password),
        special: /[@$!%*?&]/.test(password)
      };

      const score = Object.values(checks).filter(Boolean).length;
      const strengthLevel = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong';

      const newStrength = {
        score,
        strength: strengthLevel,
        checks,
        isValid: score === 5
      };

      setStrength(newStrength);
      onStrengthChange?.(newStrength);
    };

    checkPasswordStrength(password);
  }, [password, onStrengthChange]);

  const getStrengthColor = () => {
    switch (strength.strength) {
      case 'weak':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStrengthText = () => {
    switch (strength.strength) {
      case 'weak':
        return 'Weak';
      case 'medium':
        return 'Medium';
      case 'strong':
        return 'Strong';
      default:
        return 'Very Weak';
    }
  };

  const getStrengthTextColor = () => {
    switch (strength.strength) {
      case 'weak':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'strong':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="mt-2">
      {/* Password strength bar */}
      <div className="flex items-center space-x-2 mb-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${getStrengthTextColor()}`}>
          {getStrengthText()}
        </span>
      </div>

      {/* Password requirements checklist */}
      <div className="space-y-1">
        <div className={`flex items-center space-x-2 text-sm ${strength.checks.length ? 'text-green-600' : 'text-gray-500'}`}>
          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${strength.checks.length ? 'bg-green-500' : 'bg-gray-300'}`}>
            {strength.checks.length && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span>8-16 characters</span>
        </div>

        <div className={`flex items-center space-x-2 text-sm ${strength.checks.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${strength.checks.lowercase ? 'bg-green-500' : 'bg-gray-300'}`}>
            {strength.checks.lowercase && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span>At least one lowercase letter</span>
        </div>

        <div className={`flex items-center space-x-2 text-sm ${strength.checks.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${strength.checks.uppercase ? 'bg-green-500' : 'bg-gray-300'}`}>
            {strength.checks.uppercase && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span>At least one uppercase letter</span>
        </div>

        <div className={`flex items-center space-x-2 text-sm ${strength.checks.numbers ? 'text-green-600' : 'text-gray-500'}`}>
          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${strength.checks.numbers ? 'bg-green-500' : 'bg-gray-300'}`}>
            {strength.checks.numbers && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span>At least one number</span>
        </div>

        <div className={`flex items-center space-x-2 text-sm ${strength.checks.special ? 'text-green-600' : 'text-gray-500'}`}>
          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${strength.checks.special ? 'bg-green-500' : 'bg-gray-300'}`}>
            {strength.checks.special && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span>At least one special character (@$!%*?&)</span>
        </div>
      </div>

      {/* Security tips */}
      {password.length > 0 && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-1">Security Tips:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Avoid using personal information (name, email, birthdate)</li>
            <li>• Don't reuse passwords from other accounts</li>
            <li>• Consider using a password manager</li>
            <li>• Change your password regularly</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator; 