import React from 'react';
import { cn } from '../utils/cn';

interface ToggleSwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  id?: string;
}

const ToggleSwitch = React.forwardRef<HTMLInputElement, ToggleSwitchProps>(
  ({ checked = false, onChange, disabled = false, size = 'md', label, className, id, ...props }, ref) => {
    const sizeClasses = {
      sm: {
        switch: 'w-10 h-6',
        thumb: 'w-4 h-4 left-1 top-1',
        translate: 'translate-x-4'
      },
      md: {
        switch: 'w-12 h-7',
        thumb: 'w-5 h-5 left-1 top-1',
        translate: 'translate-x-5'
      },
      lg: {
        switch: 'w-14 h-8',
        thumb: 'w-6 h-6 left-1 top-1',
        translate: 'translate-x-6'
      }
    };

    const currentSize = sizeClasses[size];

    const handleToggle = () => {
      if (!disabled && onChange) {
        onChange(!checked);
      }
    };

    return (
      <div className={cn('flex items-center', className)}>
        {label && (
          <label 
            htmlFor={id} 
            className="text-sm font-medium text-text-primary mr-3 cursor-pointer"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            checked={checked}
            onChange={handleToggle}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div
            onClick={handleToggle}
            className={cn(
              'relative rounded-full cursor-pointer transition-all duration-200 ease-in-out',
              currentSize.switch,
              checked 
                ? 'bg-accent' 
                : 'bg-tertiary',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div
              className={cn(
                'absolute bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm',
                currentSize.thumb,
                checked ? currentSize.translate : 'translate-x-0'
              )}
            />
          </div>
        </div>
      </div>
    );
  }
);

ToggleSwitch.displayName = 'ToggleSwitch';

export default ToggleSwitch;