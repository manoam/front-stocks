import { forwardRef, useCallback } from 'react';
import type { InputHTMLAttributes, KeyboardEvent } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, type, onKeyDown, ...props }, ref) => {
    // Block non-numeric characters for number inputs
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
      if (type === 'number') {
        // Allow: backspace, delete, tab, escape, enter, decimal point, minus
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', '.', '-', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
          return;
        }

        // Allow if key is in allowed list or is a digit
        if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key)) {
          e.preventDefault();
        }
      }

      // Call original onKeyDown if provided
      onKeyDown?.(e);
    }, [type, onKeyDown]);

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          onKeyDown={handleKeyDown}
          className={`block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-primary-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
