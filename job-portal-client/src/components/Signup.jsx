import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(null);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset
  } = useForm();

  const password = watch('password', '');

  const onSubmit = async (data) => {
    if (!passwordStrength?.isValid) {
      Swal.fire({
        icon: 'error',
        title: 'Password Requirements Not Met',
        text: 'Please ensure your password meets all security requirements.',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await apiService.createUser({
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role,
        company: data.company || null
      });

      if (response.success) {
        setUserEmail(data.email);
        setShowOTPForm(true);
        
        Swal.fire({
          icon: 'success',
          title: 'Registration Successful!',
          text: 'Please check your email for verification code.',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: response.message || 'Something went wrong. Please try again.',
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOTPVerification = async (otpData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch(`http://localhost:3000/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          otp: otpData.otp
        }),
      });

      const result = await response.json();

             if (result.success) {
         Swal.fire({
           icon: 'success',
           title: 'Email Verified!',
           text: 'Your account has been successfully verified. Welcome!',
         });

         // Store token and user info
         localStorage.setItem('authToken', result.token);
         localStorage.setItem('user', JSON.stringify(result.user));

         // Update AuthContext state
         setUser(result.user);
         
         // Redirect to home
         navigate('/', { replace: true });
       } else {
        Swal.fire({
          icon: 'error',
          title: 'Verification Failed',
          text: result.message || 'Invalid OTP. Please try again.',
        });
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Verification Failed',
        text: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setIsSubmitting(true);

             const response = await fetch(`http://localhost:3000/api/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const result = await response.json();

      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'OTP Resent!',
          text: 'A new verification code has been sent to your email.',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Failed to Resend OTP',
          text: result.message || 'Something went wrong. Please try again.',
        });
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed to Resend OTP',
        text: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showOTPForm) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
            <p className="text-gray-600">Enter the 6-digit code sent to {userEmail}</p>
          </div>

          <form onSubmit={handleSubmit(handleOTPVerification)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                maxLength="6"
                pattern="[0-9]{6}"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                placeholder="000000"
                {...register('otp', {
                  required: 'OTP is required',
                  pattern: {
                    value: /^[0-9]{6}$/,
                    message: 'Please enter a valid 6-digit code'
                  }
                })}
              />
              {errors.otp && (
                <p className="mt-1 text-sm text-red-600">{errors.otp.message}</p>
              )}
            </div>

                         <button
               type="submit"
               disabled={isSubmitting}
               className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
             >
               {isSubmitting ? 'Verifying...' : 'Verify Email'}
             </button>

            <div className="text-center">
                             <button
                 type="button"
                 onClick={handleResendOTP}
                 disabled={isSubmitting}
                 className="text-indigo-600 hover:text-indigo-500 text-sm disabled:opacity-50 font-medium underline"
               >
                 Didn't receive the code? Resend
               </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setShowOTPForm(false);
                  reset();
                }}
                className="text-gray-600 hover:text-gray-500 text-sm"
              >
                Back to registration
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join our job portal community</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your full name"
              {...register('name', {
                required: 'Name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters'
                },
                maxLength: {
                  value: 50,
                  message: 'Name must be less than 50 characters'
                }
              })}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

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

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I am a
            </label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...register('role', {
                required: 'Please select your role'
              })}
            >
              <option value="">Select your role</option>
              <option value="jobseeker">Job Seeker</option>
              <option value="employer">Employer</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>

          {/* Company (for employers) */}
          {watch('role') === 'employer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your company name"
                {...register('company', {
                  required: 'Company name is required for employers',
                  minLength: {
                    value: 2,
                    message: 'Company name must be at least 2 characters'
                  }
                })}
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-600">{errors.company.message}</p>
              )}
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Create a strong password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                },
                maxLength: {
                  value: 16,
                  message: 'Password must be less than 16 characters'
                }
              })}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
            
            {/* Password Strength Indicator */}
            <PasswordStrengthIndicator
              password={password}
              onStrengthChange={setPasswordStrength}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm your password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match'
              })}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terms"
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              {...register('terms', {
                required: 'You must accept the terms and conditions'
              })}
            />
            <label htmlFor="terms" className="text-sm text-gray-700">
              I agree to the{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                Privacy Policy
              </a>
            </label>
          </div>
          {errors.terms && (
            <p className="mt-1 text-sm text-red-600">{errors.terms.message}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !passwordStrength?.isValid}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
