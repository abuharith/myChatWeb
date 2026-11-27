import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface PanelProps {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  className?: string;
  bodyClassName?: string;
  variant?: 'default' | 'heavy';
}

/** Translucent obsidian plate with a gold hairline and chamfered corners. */
export function Panel({
  children,
  title,
  eyebrow,
  actions,
  footer,
  padded = true,
  className,
  bodyClassName,
  variant = 'default',
}: PanelProps) {
  return (
    <section
      className={cn(
        'chamfer relative overflow-hidden',
        variant === 'heavy' ? 'glass-heavy' : 'glass',
        className,
      )}
    >
      {/* inner top highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(242,212,114,0.35),transparent)]"
      />

      {(title || eyebrow || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--hairline)] px-5 py-3.5">
          <div className="min-w-0">
            {eyebrow ? <p className="text-inscribed mb-1">{eyebrow}</p> : null}
            {title ? (
              <h2 className="truncate font-display text-lg tracking-[0.08em] text-bone">
                {title}
              </h2>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      )}

      <div className={cn(padded && 'px-5 py-4', bodyClassName)}>{children}</div>

      {footer ? (
        <footer className="border-t border-[color:var(--hairline)] px-5 py-3 text-xs text-bone-dim">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
