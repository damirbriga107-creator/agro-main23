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
  
  const { register, isAuthenticated, isLoading } = useAuth();
  
  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to=\"/\" replace />;
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
    
    if (formData.password !== confirmPassword) {
      alert('Passwords do not match');
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
    <div className=\"min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8\">
      <div className=\"max-w-md w-full space-y-8\">
        <div>
          <div className=\"mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100\">
            <svg className=\"h-8 w-8 text-green-600\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l-3-9m3 9l3-9\" />
            </svg>
          </div>
          <h2 className=\"mt-6 text-center text-3xl font-extrabold text-gray-900\">
            Join DaorsAgro
          </h2>
          <p className=\"mt-2 text-center text-sm text-gray-600\">
            Start managing your farm operations today
          </p>
        </div>
        
        <form className=\"mt-8 space-y-6\" onSubmit={handleSubmit}>
          <div className=\"space-y-4\">
            <div className=\"grid grid-cols-2 gap-4\">
              <div>
                <label htmlFor=\"firstName\" className=\"block text-sm font-medium text-gray-700\">First Name</label>
                <input
                  id=\"firstName\"
                  name=\"firstName\"
                  type=\"text\"
                  required
                  className=\"mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm\"
                  placeholder=\"First Name\"
                  value={formData.firstName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor=\"lastName\" className=\"block text-sm font-medium text-gray-700\">Last Name</label>
                <input
                  id=\"lastName\"
                  name=\"lastName\"
                  type=\"text\"
                  required
                  className=\"mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm\"
                  placeholder=\"Last Name\"
                  value={formData.lastName}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor=\"email\" className=\"block text-sm font-medium text-gray-700\">Email Address</label>
              <input
                id=\"email\"
                name=\"email\"
                type=\"email\"
                autoComplete=\"email\"
                required
                className=\"mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm\"
                placeholder=\"Email address\"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            
            <div>
              <label htmlFor=\"role\" className=\"block text-sm font-medium text-gray-700\">Role</label>
              <select
                id=\"role\"
                name=\"role\"
                required
                className=\"mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm\"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value=\"FARMER\">Farmer</option>
                <option value=\"ADVISOR\">Agricultural Advisor</option>
              </select>
            </div>
            
            <div>
              <label htmlFor=\"farmName\" className=\"block text-sm font-medium text-gray-700\">Farm Name (Optional)</label>
              <input
                id=\"farmName\"
                name=\"farmName\"
                type=\"text\"
                className=\"mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm\"
                placeholder=\"Your farm name\"
                value={formData.farmName}
                onChange={handleInputChange}
              />
            </div>
            
            <div>
              <label htmlFor=\"phoneNumber\" className=\"block text-sm font-medium text-gray-700\">Phone Number (Optional)</label>
              <input
                id=\"phoneNumber\"
                name=\"phoneNumber\"
                type=\"tel\"
                className=\"mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm\"
                placeholder=\"Phone number\"
                value={formData.phoneNumber}
                onChange={handleInputChange}
              />
            </div>
            
            <div className=\"relative\">
              <label htmlFor=\"password\" className=\"block text-sm font-medium text-gray-700\">Password</label>
              <input
                id=\"password\"
                name=\"password\"
                type={showPassword ? 'text' : 'password'}
                autoComplete=\"new-password\"
                required
                className=\"mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm\"
                placeholder=\"Password\"
                value={formData.password}
                onChange={handleInputChange}
              />
              <button
                type=\"button\"
                className=\"absolute inset-y-0 right-0 top-6 pr-3 flex items-center\"
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
            
            <div>
              <label htmlFor=\"confirmPassword\" className=\"block text-sm font-medium text-gray-700\">Confirm Password</label>
              <input
                id=\"confirmPassword\"
                name=\"confirmPassword\"
                type={showPassword ? 'text' : 'password'}
                autoComplete=\"new-password\"
                required
                className=\"mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm\"
                placeholder=\"Confirm password\"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
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
                'Create Account'
              )}
            </button>
          </div>

          <div className=\"text-center\">
            <span className=\"text-sm text-gray-600\">
              Already have an account?{' '}
              <Link to=\"/login\" className=\"font-medium text-green-600 hover:text-green-500\">
                Sign in
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
