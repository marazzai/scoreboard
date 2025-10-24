import React from 'react';
import { cn } from '../utils/cn';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  label?: string;
  helper?: string;
  className?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', size = 'md', error = false, label, helper, className, ...props }, ref) => {
    const baseClasses = 'w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-secondary';
    
    const variantClasses = {
      default: 'bg-secondary border-color focus:border-accent',
      filled: 'bg-tertiary border-transparent focus:bg-secondary focus:border-accent',
      outlined: 'bg-transparent border-2 border-color focus:border-accent'
    };
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg'
    };

    const errorClasses = error 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : '';

    const inputClasses = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      errorClasses,
      'text-text-primary',
      className
    );

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
        {helper && (
          <p className={cn(
            'mt-1 text-xs',
            error ? 'text-red-500' : 'text-text-secondary'
          )}>
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;