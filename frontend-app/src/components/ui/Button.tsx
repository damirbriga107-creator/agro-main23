import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx, componentVariants } from '../../lib/design-system';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof componentVariants.button.variants;
  size?: keyof typeof componentVariants.button.sizes;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = componentVariants.button.base;
    const variantClasses = componentVariants.button.variants[variant];
    const sizeClasses = componentVariants.button.sizes[size];

    const buttonClasses = clsx(
      baseClasses,
      variantClasses,
      sizeClasses,
      fullWidth && 'w-full',
      (disabled || loading) && 'opacity-60 cursor-not-allowed transform-none',
      className
    );

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {/* Shine effect on hover */}
        <span className="absolute inset-0 overflow-hidden rounded-inherit">
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </span>

        {/* Content */}
        <span className="relative flex items-center justify-center space-x-2">
          {loading ? (
            <LoadingSpinner size={size} />
          ) : (
            <>
              {LeftIcon && <LeftIcon className="h-5 w-5" />}
              <span>{children}</span>
              {RightIcon && <RightIcon className="h-5 w-5" />}
            </>
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

// Loading spinner component
const LoadingSpinner: React.FC<{ size: keyof typeof componentVariants.button.sizes }> = ({ size }) => {
  const sizeMap = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-7 w-7',
  };

  return (
    <svg
      className={clsx('animate-spin', sizeMap[size])}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export default Button;