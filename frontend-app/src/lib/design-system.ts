/**
 * Enhanced Design System for DaorsAgro
 * Comprehensive theme and component utilities
 */

// Design Tokens
export const theme = {
  colors: {
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    earth: {
      50: '#faf7f2',
      100: '#f4ede1',
      200: '#e8d5c1',
      300: '#d4b895',
      400: '#c29a6b',
      500: '#b17c47',
      600: '#a16a3a',
      700: '#865533',
      800: '#6d4528',
      900: '#593720',
    },
    sky: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    sunset: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    neutral: {
      50: '#fafaf9',
      100: '#f5f5f4',
      200: '#e7e5e4',
      300: '#d6d3d1',
      400: '#a8a29e',
      500: '#78716c',
      600: '#57534e',
      700: '#44403c',
      800: '#292524',
      900: '#1c1917',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  animations: {
    durations: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easings: {
      linear: 'linear',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Component Variants
export const componentVariants = {
  button: {
    base: 'inline-flex items-center justify-center font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 transform active:scale-95 relative overflow-hidden',
    sizes: {
      xs: 'px-2.5 py-1.5 text-xs rounded-md',
      sm: 'px-3 py-2 text-sm rounded-lg',
      md: 'px-4 py-2.5 text-sm rounded-xl',
      lg: 'px-6 py-3 text-base rounded-xl',
      xl: 'px-8 py-4 text-lg rounded-2xl',
    },
    variants: {
      primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 focus:ring-primary-500 shadow-lg hover:shadow-xl',
      secondary: 'bg-white text-neutral-700 border-2 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 focus:ring-neutral-500 shadow-md',
      earth: 'bg-gradient-to-r from-earth-500 to-earth-600 text-white hover:from-earth-600 hover:to-earth-700 focus:ring-earth-500 shadow-lg',
      sky: 'bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700 focus:ring-sky-500 shadow-lg',
      sunset: 'bg-gradient-to-r from-sunset-500 to-sunset-600 text-white hover:from-sunset-600 hover:to-sunset-700 focus:ring-sunset-500 shadow-lg',
      ghost: 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
      danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500 shadow-lg',
    },
  },
  input: {
    base: 'block w-full border-2 shadow-sm placeholder-neutral-400 focus:outline-none transition-all duration-300',
    sizes: {
      sm: 'px-3 py-2 text-sm rounded-lg',
      md: 'px-4 py-3 text-base rounded-xl',
      lg: 'px-5 py-4 text-lg rounded-xl',
    },
    variants: {
      default: 'border-neutral-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gradient-to-br from-white to-neutral-50',
      error: 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gradient-to-br from-white to-red-50',
      success: 'border-green-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gradient-to-br from-white to-green-50',
    },
  },
  card: {
    base: 'bg-white border shadow-sm transition-all duration-500',
    variants: {
      default: 'border-neutral-200 rounded-2xl hover:shadow-lg',
      interactive: 'border-neutral-200 rounded-2xl hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] cursor-pointer hover:border-primary-200',
      elevated: 'border-neutral-200 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2',
      glass: 'backdrop-blur-xl bg-white/70 border-white/30 rounded-2xl',
    },
    themed: {
      primary: 'bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200',
      earth: 'bg-gradient-to-br from-earth-50 to-earth-100 border-earth-200',
      sky: 'bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200',
      sunset: 'bg-gradient-to-br from-sunset-50 to-sunset-100 border-sunset-200',
    },
  },
} as const;

// Utility functions
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (number: number): string => {
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  } else if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }
  return number.toLocaleString();
};

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const clsx = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Color utility functions
export const getColorVariant = (color: keyof typeof theme.colors, shade: string = '500'): string => {
  // Shade is a string because different palettes have different keys
  // Use optional chaining and fallbacks to avoid indexing errors
  return (theme.colors as any)[color]?.[shade] || (theme.colors as any).primary?.[shade] || '#000';
};

// Animation helpers
export const createStaggerDelay = (index: number, baseDelay = 100): number => {
  return baseDelay * index;
};

// Responsive utilities
export const breakpoints = theme.breakpoints;

export const mediaQuery = (breakpoint: keyof typeof breakpoints): string => {
  return `@media (min-width: ${breakpoints[breakpoint]})`;
};

// Component composition helpers
export const composeClasses = (
  baseClasses: string,
  variantClasses: string,
  sizeClasses?: string,
  additionalClasses?: string
): string => {
  return clsx(baseClasses, variantClasses, sizeClasses, additionalClasses);
};

export default theme;