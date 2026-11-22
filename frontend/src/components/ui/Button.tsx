import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'mint' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5 h-8',
    md: 'text-sm px-5 py-2.5 gap-2 h-10',
    lg: 'text-base px-6 py-3.5 gap-2.5 h-12',
  };

  const variantStyles = {
    // Tactile golden-yellow claymorphic button
    primary: 'clay-btn-primary focus-visible:ring-[#FFD21C]',
    // Dark slate tactile button
    secondary:
      'bg-[#172238] text-white shadow-[0_4px_14px_rgba(23,34,56,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:bg-[#202E4C] focus-visible:ring-[#172238]',
    // Soft white clay button without harsh border
    outline:
      'bg-white text-[#172238] shadow-[0_4px_12px_rgba(23,34,56,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:shadow-md hover:bg-[#FAFBF7] focus-visible:ring-[#172238]',
    // Ghost
    ghost:
      'bg-transparent text-[#172238] hover:bg-[#EEEFEA]/70 focus-visible:ring-[#FFD21C]',
    // Mint pill button
    mint:
      'bg-[#78E9AD] text-[#0C5A37] shadow-[0_4px_14px_rgba(120,233,173,0.4),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:bg-[#68D99D] focus-visible:ring-[#78E9AD]',
    // Blue pill button
    blue:
      'bg-[#5BA4F5] text-white shadow-[0_4px_14px_rgba(91,164,245,0.4),inset_0_1px_1px_rgba(255,255,255,0.7)] hover:bg-[#4893E6] focus-visible:ring-[#5BA4F5]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
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
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
