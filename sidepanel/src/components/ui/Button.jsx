import { forwardRef } from 'react';

/**
 * Button component with Tailwind variants
 * @typedef {Object} ButtonProps
 * @property {string} [variant='default'] - Button style variant (default|primary|ghost|icon|pill)
 * @property {string} [size='default'] - Button size (default|sm|lg|icon|pill)
 * @property {React.ReactNode} [children] - Button content
 * @property {string} [className] - Additional CSS classes
 * @property {React.ButtonHTMLAttributes} props - Native button props
 */

const getButtonClasses = (variant, size, className) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

  const variantClasses = {
    default: 'bg-white/8 hover:bg-white/14 text-white',
    primary: 'bg-accent-purple hover:bg-accent-purple/90 text-white',
    ghost: 'hover:bg-white/6 text-white',
    icon: 'h-9 w-9 rounded-full bg-white/6 hover:bg-white/12 text-white border border-white/8',
    pill: 'h-8 px-3 rounded-full text-xs font-semibold text-white',
  };

  const sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3 text-xs',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-9 w-9',
    pill: 'h-8 px-3',
  };

  return `${baseClasses} ${variantClasses[variant] || variantClasses.default} ${sizeClasses[size] || sizeClasses.default} ${className || ''}`;
};

const Button = forwardRef(function Button({ variant = 'default', size = 'default', className, children, disabled = false, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={getButtonClasses(variant, size, className, disabled)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

export { Button };
