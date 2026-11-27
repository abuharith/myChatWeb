import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, trailing, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-inscribed font-ui font-medium"
        >
          {label}
        </label>
      ) : null}

      <div
        className={cn(
          'group flex items-center gap-2 border bg-[color:rgba(5,3,10,0.6)] px-3 transition-colors duration-200',
          'border-[color:var(--hairline)] focus-within:border-[color:var(--titan-gold-500)]',
          'shadow-[inset_0_2px_10px_rgba(0,0,0,0.55)]',
          error && 'border-[color:rgba(255,90,31,0.65)]',
        )}
      >
        {icon ? (
          <span aria-hidden className="text-bone/45 group-focus-within:text-[color:var(--titan-gold-300)]">
            {icon}
          </span>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-11 w-full min-w-0 bg-transparent text-base text-bone outline-none',
            'placeholder:text-bone/30',
            className,
          )}
          {...rest}
        />

        {trailing ? <span className="text-bone/40">{trailing}</span> : null}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-[color:var(--ember)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-bone-dim">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
