import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className=\"min-h-screen bg-gray-50\">
      {/* Navigation */}
      <nav className=\"bg-white shadow\">
        <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">
          <div className=\"flex justify-between h-16\">
            <div className=\"flex\">
              <div className=\"flex-shrink-0 flex items-center\">
                <div className=\"h-8 w-8 flex items-center justify-center rounded bg-green-600\">
                  <svg className=\"h-5 w-5 text-white\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                    <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l-3-9m3 9l3-9\" />
                  </svg>
                </div>
                <span className=\"ml-3 text-xl font-bold text-gray-900\">DaorsAgro</span>
              </div>
              <div className=\"hidden md:ml-6 md:flex md:space-x-8\">
                <Link
                  to=\"/\"
                  className=\"border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium\"
                >
                  Dashboard
                </Link>
                <Link
                  to=\"/documents\"
                  className=\"border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium\"
                >
                  Documents
                </Link>
              </div>
            </div>
            <div className=\"flex items-center\">
              <div className=\"flex-shrink-0\">
                <div className=\"relative\">
                  <button className=\"bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500\">
                    <span className=\"sr-only\">View notifications</span>
                    <svg className=\"h-6 w-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                      <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M15 17h5l-5 5v-5z\" />
                      <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M9 19c-5 0-8-3-8-8s3-8 8-8 8 3 8 8-3 8-8 8z\" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className=\"ml-3 relative\">
                <div className=\"flex items-center\">
                  <span className=\"text-sm text-gray-700 mr-3\">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <button
                    onClick={handleLogout}
                    className=\"bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500\"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className=\"max-w-7xl mx-auto py-6 sm:px-6 lg:px-8\">
        {children}
      </main>
    </div>
  );
};

export default Layout;