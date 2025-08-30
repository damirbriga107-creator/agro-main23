import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginCredentials } from '../types/auth';
import LoadingSpinner from '../components/common/LoadingSpinner';

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
      <div className=\"min-h-screen flex items-center justify-center\">
        <LoadingSpinner size=\"lg\" />
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
    <div className=\"min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8\">
      <div className=\"max-w-md w-full space-y-8\">
        <div>
          <div className=\"mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100\">
            <svg className=\"h-8 w-8 text-green-600\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l-3-9m3 9l3-9\" />
            </svg>
          </div>
          <h2 className=\"mt-6 text-center text-3xl font-extrabold text-gray-900\">
            Sign in to DaorsAgro
          </h2>
          <p className=\"mt-2 text-center text-sm text-gray-600\">
            Manage your agricultural operations with ease
          </p>
        </div>
        
        <form className=\"mt-8 space-y-6\" onSubmit={handleSubmit}>
          <div className=\"rounded-md shadow-sm -space-y-px\">
            <div>
              <label htmlFor=\"email\" className=\"sr-only\">Email address</label>
              <input
                id=\"email\"
                name=\"email\"
                type=\"email\"
                autoComplete=\"email\"
                required
                className=\"appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm\"
                placeholder=\"Email address\"
                value={credentials.email}
                onChange={handleInputChange}
              />
            </div>
            <div className=\"relative\">
              <label htmlFor=\"password\" className=\"sr-only\">Password</label>
              <input
                id=\"password\"
                name=\"password\"
                type={showPassword ? 'text' : 'password'}
                autoComplete=\"current-password\"
                required
                className=\"appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm\"
                placeholder=\"Password\"
                value={credentials.password}
                onChange={handleInputChange}
              />
              <button
                type=\"button\"
                className=\"absolute inset-y-0 right-0 pr-3 flex items-center\"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className=\"h-5 w-5 text-gray-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                    <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21\" />
                  </svg>
                ) : (
                  <svg className=\"h-5 w-5 text-gray-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                    <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M15 12a3 3 0 11-6 0 3 3 0 016 0z\" />
                    <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z\" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className=\"flex items-center justify-between\">
            <Link
              to=\"/forgot-password\"
              className=\"text-sm text-green-600 hover:text-green-500\"
            >
              Forgot your password?
            </Link>
          </div>

          <div>
            <button
              type=\"submit\"
              disabled={isSubmitting}
              className=\"group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed\"
            >
              {isSubmitting ? (
                <LoadingSpinner size=\"sm\" className=\"text-white\" />
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className=\"text-center\">
            <span className=\"text-sm text-gray-600\">
              Don't have an account?{' '}
              <Link to=\"/register\" className=\"font-medium text-green-600 hover:text-green-500\">
                Sign up
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;