import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'relative inline-flex items-center justify-center font-bold rounded-full transition-all duration-150 select-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFC00] focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // variants
          variant === 'primary' && 'bg-[#FFFC00] text-black hover:bg-yellow-300 active:scale-95',
          variant === 'ghost'   && 'bg-white/10 text-white hover:bg-white/20 active:scale-95',
          variant === 'danger'  && 'bg-red-500 text-white hover:bg-red-600 active:scale-95',
          // sizes
          size === 'sm' && 'text-sm px-4 py-2',
          size === 'md' && 'text-base px-6 py-3',
          size === 'lg' && 'text-lg px-8 py-4 w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {children}
          </span>
        ) : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;