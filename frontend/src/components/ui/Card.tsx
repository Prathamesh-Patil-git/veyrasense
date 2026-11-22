import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'pale-yellow' | 'dark-slate' | 'recessed' | 'ghost';
  rounded?: 'lg' | 'xl' | '2xl' | '3xl';
  hasBorder?: boolean;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'white',
  rounded = '2xl',
  hasBorder = false,
  hoverEffect = false,
  className = '',
  ...props
}) => {
  const roundedStyles = {
    lg: 'rounded-2xl',
    xl: 'rounded-2xl',
    '2xl': 'rounded-3xl',
    '3xl': 'rounded-[28px]',
  };

  // Claymorphic surface depths (borderless by default)
  const variantStyles = {
    white: hoverEffect ? 'clay-surface-interactive text-[#172238]' : 'clay-surface text-[#172238]',
    'pale-yellow': 'clay-yellow-banner text-[#172238]',
    'dark-slate': 'clay-dark text-white',
    recessed: 'clay-recessed text-[#172238]',
    ghost: 'bg-transparent text-[#172238]',
  };

  const borderStyles = hasBorder
    ? variant === 'dark-slate'
      ? 'border border-[#2B3E63]/40'
      : 'border border-[#ECEDE8]/60'
    : '';

  return (
    <div
      className={`${roundedStyles[rounded]} ${variantStyles[variant]} ${borderStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
