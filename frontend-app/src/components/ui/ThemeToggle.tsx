import React from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/design-system';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass' | 'minimal';
}

export function ThemeToggle({
  className,
  size = 'md',
  variant = 'glass'
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4'
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const baseClasses = cn(
    'inline-flex items-center justify-center rounded-xl border transition-all duration-300 hover-lift',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    'relative overflow-hidden group',
    sizeClasses[size],
    variant === 'glass' && 'backdrop-blur-xl bg-white/80 dark:bg-slate-800/80 border-white/20 dark:border-slate-700/30',
    variant === 'default' && 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700',
    variant === 'minimal' && 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800',
    className
  );

  return (
    <button
      onClick={toggleTheme}
      className={baseClasses}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Sun icon for dark mode or moon icon for light mode */}
      <SunIcon
        className={cn(
          iconSizeClasses[size],
          'text-amber-500 absolute transform rotate-0 scale-100 transition-all duration-300',
          theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        )}
      />

      <MoonIcon
        className={cn(
          iconSizeClasses[size],
          'text-indigo-400 absolute transform rotate-0 scale-100 transition-all duration-300',
          theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
        )}
      />

      {/* Accessibility indicator */}
      <span className="sr-only">
        Currently in {theme} mode. Click to switch to {theme === 'light' ? 'dark' : 'light'} mode.
      </span>
    </button>
  );
}

// Enhanced theme toggle with dropdown options
interface ThemeSelectorProps {
  className?: string;
  position?: 'left' | 'right' | 'center';
}

export function ThemeSelector({
  className,
  position = 'right'
}: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();

  const themes: { value: 'light' | 'dark', label: string, icon: React.ComponentType<{ className?: string }>, description: string }[] = [
    {
      value: 'light',
      label: 'Light Mode',
      icon: SunIcon,
      description: 'Bright and clean interface'
    },
    {
      value: 'dark',
      label: 'Dark Mode',
      icon: MoonIcon,
      description: 'Easy on the eyes in low light'
    }
  ];

  const currentTheme = themes.find(t => t.value === theme);

  return (
    <div className={cn('relative', className)}>
      <button
        className={cn(
          'flex items-center justify-between w-full px-4 py-3 bg-white dark:bg-slate-800',
          'border border-slate-200 dark:border-slate-700 rounded-xl',
          'hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-300',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          position === 'center' && 'justify-center'
        )}
        aria-label="Theme selector"
      >
        <div className="flex items-center space-x-3">
          {currentTheme?.icon && (
            <currentTheme.icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          )}
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {currentTheme?.label}
          </span>
        </div>

        {/* Dropdown arrow */}
        <svg
          className="h-5 w-5 text-slate-400 transition-transform duration-300 group-hover:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Theme options dropdown - this would need popover state management */}
      <div className={cn(
        'absolute top-full mt-2 w-64 bg-white dark:bg-slate-800',
        'border border-slate-200 dark:border-slate-700 rounded-xl',
        'shadow-lg backdrop-blur-xl bg-white/95 dark:bg-slate-800/95',
        'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
        'transition-all duration-300 z-10',
        position === 'left' && 'left-0',
        position === 'right' && 'right-0',
        position === 'center' && 'left-1/2 transform -translate-x-1/2'
      )}>
        <div className="p-3">
          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Choose Theme</h4>
          <div className="space-y-1">
            {themes.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'w-full flex items-center space-x-3 px-3 py-3 rounded-lg',
                    'transition-colors duration-200',
                    'hover:bg-slate-50 dark:hover:bg-slate-700',
                    option.value === theme && 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  )}
                >
                  <Icon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {option.label}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {option.description}
                    </div>
                  </div>
                  {option.value === theme && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal theme indicator
export function ThemeIndicator({
  className,
  showTheme = false
}: {
  className?: string;
  showTheme?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {theme === 'light' ? (
        <SunIcon className="h-4 w-4 text-amber-500" />
      ) : (
        <MoonIcon className="h-4 w-4 text-indigo-400" />
      )}
      {showTheme && (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">
          {theme}
        </span>
      )}
    </div>
  );
}

export default ThemeToggle;
