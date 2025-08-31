import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  BellIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Documents', href: '/documents', icon: DocumentTextIcon },
    { name: 'Financial', href: '/financial', icon: CurrencyDollarIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Enhanced Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${
        isScrolled 
          ? 'glass shadow-strong backdrop-blur-soft' 
          : 'bg-white/80 backdrop-blur-soft'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center group">
                <div className="h-10 w-10 flex items-center justify-center rounded-2xl gradient-primary shadow-lg group-hover:shadow-xl transition-all duration-300 hover-lift">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l-3-9m3 9l3-9" />
                  </svg>
                </div>
                <span className="ml-3 text-xl font-bold text-gradient-primary">DaorsAgro</span>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden lg:ml-8 lg:flex lg:space-x-2">
                {navigationItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 animate-fadeInUp stagger-${index + 1} ${
                        isActive
                          ? 'nav-link-active'
                          : 'nav-link-inactive'
                      }`}
                    >
                      <Icon className={`mr-2 h-5 w-5 transition-colors ${
                        isActive ? 'text-primary-600' : 'text-neutral-500 group-hover:text-neutral-700'
                      }`} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-neutral-500 hover:text-neutral-700 rounded-xl hover:bg-neutral-100 transition-all duration-200 hover-lift">
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-sunset-500 rounded-full animate-pulse-slow"></span>
              </button>

              {/* User menu */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-medium text-neutral-900">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-xs text-neutral-500 capitalize">
                    {user?.role?.toLowerCase()}
                  </span>
                </div>
                <div className="relative group">
                  <button className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200 hover:from-primary-100 hover:to-primary-200 transition-all duration-300 hover-lift">
                    <UserCircleIcon className="h-6 w-6 text-primary-600" />
                  </button>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-primary text-sm px-4 py-2 animate-fadeInRight"
                >
                  Logout
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-neutral-500 hover:text-neutral-700 rounded-xl hover:bg-neutral-100 transition-all duration-200"
              >
                {isMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden glass border-t border-white/20 animate-fadeInUp">
            <div className="px-4 py-4 space-y-2">
              {navigationItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 animate-fadeInLeft stagger-${index + 1} ${
                      isActive
                        ? 'nav-link-active'
                        : 'nav-link-inactive'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 transition-colors ${
                      isActive ? 'text-primary-600' : 'text-neutral-500 group-hover:text-neutral-700'
                    }`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Main content with enhanced spacing and animations */}
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-fadeInUp">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;