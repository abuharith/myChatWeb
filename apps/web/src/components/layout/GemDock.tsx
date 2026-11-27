import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { useEffectiveReducedMotion } from '../../store/ui';
import { GemIcon } from '../ui/GemIcon';
import type { GemTone } from '../../lib/gems';

interface DockItem {
  id: string;
  label: string;
  gem: GemTone;
  icon: ReactNode;
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const DOCK_ITEMS: DockItem[] = [
  {
    id: 'chats',
    label: 'Chats',
    gem: 'azure',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
        <path d="M4 5.5h16v11H9.5L4 20V5.5Z" {...stroke} />
        <path d="M8.5 10h7M8.5 13h4.5" {...stroke} opacity="0.65" />
      </svg>
    ),
  },
  {
    id: 'calls',
    label: 'Calls',
    gem: 'violet',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M5.2 4.5h3l1.4 3.6-2 1.3a11.4 11.4 0 0 0 6.9 6.9l1.3-2 3.6 1.4v3a2 2 0 0 1-2.2 2A16.4 16.4 0 0 1 3.2 6.7a2 2 0 0 1 2-2.2Z"
          {...stroke}
        />
      </svg>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    gem: 'emerald',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="3.2" {...stroke} />
        <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" {...stroke} opacity="0.7" />
        <path d="M12 20.5A8.5 8.5 0 0 1 3.5 12" {...stroke} opacity="0.7" />
      </svg>
    ),
  },
  {
    id: 'media',
    label: 'Media',
    gem: 'amber',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
        <rect x="3.5" y="5" width="17" height="14" rx="1" {...stroke} />
        <path d="M3.5 15.2 9 10l6.2 6.2M14.8 12.2l2.4-2.2 3.3 3.2" {...stroke} opacity="0.75" />
        <circle cx="8.2" cy="8.6" r="1.1" fill="currentColor" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: 'contacts',
    label: 'Contacts',
    gem: 'crimson',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
        <circle cx="9" cy="8.4" r="3.1" {...stroke} />
        <path d="M3.4 19.2a5.8 5.8 0 0 1 11.2 0" {...stroke} />
        <path d="M16.4 6.1a3 3 0 0 1 0 5.6M18 19.2a5.6 5.6 0 0 0-2.3-4" {...stroke} opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    gem: 'gold',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="2.8" {...stroke} />
        <path
          d="M12 3.6v2.2M12 18.2v2.2M4.6 12H2.4M21.6 12h-2.2M6.8 6.8 5.2 5.2M18.8 18.8l-1.6-1.6M17.2 6.8l1.6-1.6M5.2 18.8l1.6-1.6"
          {...stroke}
          opacity="0.8"
        />
      </svg>
    ),
  },
];

export interface GemDockProps {
  activeId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

/**
 * Six gems set in gold sockets. Vertical on desktop, thumb-friendly bar on mobile.
 * Roving focus with arrow keys; `aria-current` marks the active gem.
 */
export function GemDock({ activeId, onSelect, className }: GemDockProps) {
  const [internal, setInternal] = useState('chats');
  const active = activeId ?? internal;
  const reducedMotion = useEffectiveReducedMotion();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (id: string) => {
    if (activeId === undefined) setInternal(id);
    onSelect?.(id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const last = DOCK_ITEMS.length - 1;
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = last;

    refs.current[next]?.focus();
    const target = DOCK_ITEMS[next];
    if (target) select(target.id);
  };

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed z-40',
        'bottom-4 left-1/2 -translate-x-1/2',
        'md:bottom-auto md:left-auto md:right-5 md:top-1/2 md:-translate-y-1/2 md:translate-x-0',
        className,
      )}
    >
      <div className="glass-heavy chamfer-lg flex flex-row items-center gap-1.5 px-2 py-2 md:flex-col md:gap-2 md:px-2 md:py-3">
        {DOCK_ITEMS.map((item, index) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                'group relative flex h-11 w-11 items-center justify-center rounded-full outline-none transition-transform duration-300 ease-inertia',
                'hover:-translate-y-0.5 md:hover:translate-x-0 md:hover:translate-y-0',
                'focus-visible:shadow-focus',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'gem-socket absolute inset-0 rounded-full transition-all duration-300',
                  isActive && 'shadow-[0_0_18px_-2px_var(--dock-glow)]',
                )}
                style={
                  {
                    '--dock-glow': `var(--gem-${item.gem}-glow, rgba(242,212,114,.4))`,
                  } as Record<string, string>
                }
              />

              <span
                className={cn(
                  'relative transition-opacity duration-200',
                  isActive ? 'text-bone opacity-100' : 'text-bone/55 opacity-80 group-hover:opacity-100',
                )}
              >
                {item.icon}
              </span>

              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <GemIcon gem={item.gem} size={26} active={isActive} className="opacity-40" />
              </span>

              {isActive && !reducedMotion
                ? [0, 1, 2].map((particle) => (
                    <motion.span
                      key={particle}
                      aria-hidden
                      className="pointer-events-none absolute h-0.5 w-0.5 rounded-full bg-[color:var(--titan-gold-300)]"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: [0, 0.9, 0], y: [4, -16], x: [0, particle * 4 - 4] }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        delay: particle * 0.28,
                        ease: 'easeOut',
                      }}
                      style={{ top: 4, left: '50%' }}
                    />
                  ))
                : null}

              <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-[3px] border border-[color:var(--hairline)] bg-[color:rgba(5,3,10,0.9)] px-2 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-bone/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
