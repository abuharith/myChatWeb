import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'metal' | 'ghost' | 'danger' | 'gold';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-titan text-bone border border-[color:rgba(201,162,39,0.45)] shadow-glow-violet hover:brightness-110 active:brightness-95',
  metal:
    'bg-[linear-gradient(180deg,#241C34,#15101F)] text-bone border border-[color:var(--hairline-strong)] hover:border-[color:var(--titan-gold-500)] hover:shadow-glow-gold',
  ghost:
    'bg-transparent text-bone/75 border border-transparent hover:bg-white/[0.05] hover:text-bone',
  danger:
    'bg-[linear-gradient(180deg,#3A1420,#200A12)] text-[color:var(--ember)] border border-[color:rgba(255,90,31,0.4)] hover:border-[color:var(--ember)]',
  gold:
    'bg-gold text-[#1A1305] font-semibold border border-[color:var(--titan-gold-300)] hover:brightness-110',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

/** Forged-metal button with a gold rim and a light sweep on hover. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'metal',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    block = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'sweep relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-[3px] font-medium uppercase tracking-[0.08em] transition-all duration-200 ease-inertia',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent"
        />
      ) : (
        iconLeft
      )}
      {children ? <span className="relative z-[2]">{children}</span> : null}
      {iconRight ? <span className="relative z-[2]">{iconRight}</span> : null}
    </button>
  );
});
