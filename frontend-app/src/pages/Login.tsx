import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { 
  EyeIcon, 
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { LoginCredentials } from '../types/auth';
import { LoadingSpinner } from '../components/ui/LoadingComponents';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
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
    setIsSubmitting(true);
    
    try {
      await login(credentials);
    } catch (error) {
      // Error handling is done in the AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
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
            Welcome Back
          </h2>
          <p className="text-lg text-neutral-600">
            Sign in to manage your agricultural operations
          </p>
        </div>
        
        {/* Login form */}
        <div className="card glass border-gradient p-8 animate-fadeInUp stagger-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email field */}
            <div className="input-group animate-fadeInLeft stagger-3">
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
                  value={credentials.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="input-group animate-fadeInLeft stagger-4">
              <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 mb-2">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input pl-12 pr-12"
                  placeholder="Enter your password"
                  value={credentials.password}
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

            {/* Forgot password link */}
            <div className="text-right animate-fadeInRight stagger-5">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit button */}
            <div className="animate-fadeInUp stagger-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-4 text-lg font-semibold relative overflow-hidden"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="sm" color="primary" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            {/* Sign up link */}
            <div className="text-center animate-fadeInUp stagger-7">
              <span className="text-neutral-600">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="font-semibold text-gradient-primary hover:opacity-80 transition-opacity"
                >
                  Create Account
                </Link>
              </span>
            </div>
          </form>
        </div>

        {/* Additional info */}
        <div className="text-center animate-fadeInUp stagger-8">
          <p className="text-sm text-neutral-500">
            By signing in, you agree to our{' '}
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

export default Login;