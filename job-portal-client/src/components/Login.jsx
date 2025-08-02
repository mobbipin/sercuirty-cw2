import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ReCaptcha from './ReCaptcha';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleCaptchaVerify = (token) => {
    setCaptchaToken(token);
    setCaptchaError('');
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken('');
    setCaptchaError('reCAPTCHA has expired. Please verify again.');
  };

  const onSubmit = async (data) => {
    // Validate reCAPTCHA
    if (!captchaToken) {
      setCaptchaError('Please complete the reCAPTCHA verification.');
      return;
    }

    try {
      setIsLoading(true);

      const loginResult = await login(data.email, data.password, captchaToken);

      if (loginResult.success) {
        // Reset login attempts on successful login
        setLoginAttempts(0);

        Swal.fire({
          icon: 'success',
          title: 'Login Successful!',
          text: `Welcome back!`,
        });

        navigate('/', { replace: true });
      } else {
        setLoginAttempts(prev => prev + 1);
        
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: loginResult.message || 'Invalid credentials. Please try again.',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginAttempts(prev => prev + 1);
      
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (data) => {
    try {
      setIsLoading(true);

      const response = await fetch(`http://localhost:5001/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email
        }),
      });

      const result = await response.json();

      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Password Reset Email Sent!',
          text: 'Please check your email for password reset instructions.',
        });
        
        setShowForgotPassword(false);
        reset();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Failed to Send Reset Email',
          text: result.message || 'Something went wrong. Please try again.',
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed to Send Reset Email',
        text: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
            <p className="text-gray-600">Enter your email to receive reset instructions</p>
          </div>

          <form onSubmit={handleSubmit(handleForgotPassword)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Please enter a valid email address'
                  }
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

                         <button
               type="submit"
               disabled={isLoading}
               className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
             >
               {isLoading ? 'Sending...' : 'Send Reset Email'}
             </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  reset();
                }}
                className="text-gray-600 hover:text-gray-500 text-sm"
              >
                Back to login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Security Notice */}
        {loginAttempts > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Security Notice
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    {loginAttempts >= 3 
                      ? 'Multiple failed attempts detected. Your account may be temporarily locked.'
                      : `Failed login attempt ${loginAttempts}/5`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Please enter a valid email address'
                }
              })}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              {...register('password', {
                required: 'Password is required'
              })}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                {...register('rememberMe')}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Forgot your password?
              </button>
            </div>
          </div>

          {/* reCAPTCHA */}
          <ReCaptcha
            onVerify={handleCaptchaVerify}
            onExpire={handleCaptchaExpire}
            error={captchaError}
          />

          <button
            type="submit"
            disabled={isLoading || loginAttempts >= 5}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/sign-up')}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Sign up
              </button>
            </p>
          </div>
        </form>

        {/* Security Tips */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Security Tips:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Never share your password with anyone</li>
            <li>• Use a strong, unique password</li>
            <li>• Enable two-factor authentication if available</li>
            <li>• Log out when using shared devices</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;
