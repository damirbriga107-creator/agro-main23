import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { RegisterData } from '../types/auth';
import { LoadingSpinner } from '../components/ui/LoadingComponents';

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'FARMER',
    farmName: '',
    phoneNumber: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);

  // Form validation state
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [touched, setTouched] = useState<{[key: string]: boolean}>({});
  
  const { register, isAuthenticated, isLoading } = useAuth();

  // Validation functions
  const validateField = (name: string, value: string, confirmValue?: string): string => {
    switch (name) {
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (value.length < 2) return 'First name must be at least 2 characters';
        if (value.length > 50) return 'First name must be less than 50 characters';
        return '';
      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (value.length < 2) return 'Last name must be at least 2 characters';
        if (value.length > 50) return 'Last name must be less than 50 characters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!value.includes('@')) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (value.length > 72) return 'Password must be less than 72 characters';
        if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
        if (!/(?=.*[@$!%*?&])/.test(value)) return 'Password must contain at least one special character (@$!%*?&)';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (!confirmValue) return '';
        if (value !== confirmValue) return 'Passwords do not match';
        return '';
      case 'farmName':
        if (value && value.length > 100) return 'Farm name must be less than 100 characters';
        if (value && !/^[a-zA-Z0-9\s\-\.&]+$/.test(value)) return 'Farm name can only contain letters, numbers, spaces, hyphens, periods, and ampersands';
        return '';
      case 'phoneNumber':
        if (value && !/^[\d\s\-\+\(\)]{10,15}$/.test(value.replace(/\s/g, ''))) return 'Please enter a valid phone number';
        return '';
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    let isValid = true;

    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field as keyof RegisterData]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    if (confirmPassword && formData.password && confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
  return <Navigate to="/" replace />;
  }
  
  // Show success message if registration completed
  if (registered) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-primary-200 to-primary-300 opacity-20 animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-sky-200 to-sky-300 opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-success-200 to-success-300 opacity-10 animate-pulse-slow"></div>
        </div>

        <div className="max-w-md w-full space-y-8 relative z-10">
          {/* Header */}
          <div className="text-center animate-fadeInUp">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-3xl gradient-primary shadow-lg hover-lift mb-6">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-gradient-primary mb-3">
              Registration Successful!
            </h2>
            <p className="text-lg text-neutral-600">
              Welcome to DaorsAgro! Please check your email for verification instructions.
            </p>
          </div>

          {/* Action Button */}
          <div className="text-center animate-fadeInUp stagger-4">
            <Link
              to="/login"
              className="btn-primary py-4 px-8 text-lg font-semibold inline-block"
            >
              Go to Login
            </Link>
          </div>

          {/* Additional Info */}
          <div className="text-center animate-fadeInUp stagger-5">
            <p className="text-sm text-neutral-500">
              This process may take a few minutes. Check your spam folder if needed.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show loading if auth state is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading..." />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const registrationData = { ...formData };
      if (!registrationData.farmName) delete registrationData.farmName;
      if (!registrationData.phoneNumber) delete registrationData.phoneNumber;

      await register(registrationData);
      setRegistered(true);
    } catch (error) {
      // Error handling is done in the AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-primary-200 to-primary-300 opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-earth-200 to-earth-300 opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-sky-200 to-sky-300 opacity-10 animate-pulse-slow"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo and title */}
        <div className="text-center animate-fadeInUp">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-3xl gradient-primary shadow-lg hover-lift mb-6">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l-3-9m3 9l3-9" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-gradient-primary mb-3">
            Join DaorsAgro
          </h2>
          <p className="text-lg text-neutral-600">
            Start managing your farm operations today
          </p>
        </div>

        {/* Registration form */}
        <div className="card glass border-gradient p-8 animate-fadeInUp stagger-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="input-group animate-fadeInLeft stagger-3">
                <label htmlFor="firstName" className="block text-sm font-semibold text-neutral-700 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <UserIcon className="input-icon" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className="input pl-12"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="input-group animate-fadeInLeft stagger-3">
                <label htmlFor="lastName" className="block text-sm font-semibold text-neutral-700 mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <UserIcon className="input-icon" />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className="input pl-12"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Email field */}
            <div className="input-group animate-fadeInLeft stagger-4">
              <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <EnvelopeIcon className="input-icon" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input pl-12"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Role field */}
            <div className="input-group animate-fadeInLeft stagger-5">
              <label htmlFor="role" className="block text-sm font-semibold text-neutral-700 mb-2">
                Role
              </label>
              <div className="relative">
                <MapPinIcon className="input-icon" />
                <select
                  id="role"
                  name="role"
                  required
                  className="input pl-12 bg-gradient-to-br from-white to-neutral-50"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="FARMER">🌱 Farmer</option>
                  <option value="ADVISOR">👨‍🌾 Agricultural Advisor</option>
                </select>
              </div>
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="input-group animate-fadeInLeft stagger-6">
                <label htmlFor="farmName" className="block text-sm font-semibold text-neutral-700 mb-2">
                  Farm Name <span className="text-neutral-500">(Optional)</span>
                </label>
                <div className="relative">
                  <MapPinIcon className="input-icon" />
                  <input
                    id="farmName"
                    name="farmName"
                    type="text"
                    className="input pl-12"
                    placeholder="Your farm name"
                    value={formData.farmName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="input-group animate-fadeInLeft stagger-6">
                <label htmlFor="phoneNumber" className="block text-sm font-semibold text-neutral-700 mb-2">
                  Phone Number <span className="text-neutral-500">(Optional)</span>
                </label>
                <div className="relative">
                  <PhoneIcon className="input-icon" />
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    className="input pl-12"
                    placeholder="Phone number"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Password fields */}
            <div className="input-group animate-fadeInLeft stagger-7">
              <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 mb-2">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="input pl-12 pr-12"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="input-group animate-fadeInLeft stagger-7">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-neutral-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <LockClosedIcon className="input-icon" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="input pl-12"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="animate-fadeInUp stagger-8">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-4 text-lg font-semibold relative overflow-hidden"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="sm" color="primary" />
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>

            {/* Sign in link */}
            <div className="text-center animate-fadeInUp stagger-9">
              <span className="text-neutral-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-gradient-primary hover:opacity-80 transition-opacity"
                >
                  Sign in
                </Link>
              </span>
            </div>
          </form>
        </div>

        {/* Additional info */}
        <div className="text-center animate-fadeInUp stagger-10">
          <p className="text-sm text-neutral-500">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-primary-600 hover:text-primary-500 transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-primary-600 hover:text-primary-500 transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
