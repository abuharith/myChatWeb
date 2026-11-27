import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { portalIn } from '../../lib/motion';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** Portal modal: Esc closes, focus is trapped and restored, body scroll locks. */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
      target.focus();
    }, 40);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusFirst);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-[radial-gradient(80%_80%_at_50%_40%,rgba(43,15,69,0.55),rgba(5,3,10,0.88))] backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Dialog'}
            tabIndex={-1}
            variants={portalIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'glass-heavy chamfer relative z-10 w-full overflow-hidden outline-none',
              SIZES[size],
              className,
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(242,212,114,0.5),transparent)]"
            />

            {(title || eyebrow) && (
              <header className="border-b border-[color:var(--hairline)] px-6 pb-4 pt-5">
                {eyebrow ? <p className="text-inscribed mb-1">{eyebrow}</p> : null}
                {title ? (
                  <h2 className="font-display text-xl tracking-[0.06em] text-bone">{title}</h2>
                ) : null}
                {description ? (
                  <p className="mt-1.5 text-sm text-bone-dim">{description}</p>
                ) : null}
              </header>
            )}

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>

            <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--hairline)] px-6 py-4">
              {footer ?? (
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 text-xs uppercase tracking-[0.14em] text-bone/70 transition-colors hover:text-[color:var(--titan-gold-300)]"
                >
                  Close
                </button>
              )}
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
