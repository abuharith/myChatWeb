import { useMemo } from 'react';
import { cn } from '../../lib/cn';
import { GEMS, type GemTone } from '../../lib/gems';

export type Presence = 'online' | 'away' | 'dnd' | 'offline';
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<AvatarSize, { box: number; text: string; dot: number }> = {
  xs: { box: 24, text: 'text-[0.6rem]', dot: 6 },
  sm: { box: 32, text: 'text-xs', dot: 8 },
  md: { box: 40, text: 'text-sm', dot: 9 },
  lg: { box: 56, text: 'text-lg', dot: 11 },
  xl: { box: 72, text: 'text-xl', dot: 13 },
};

const PRESENCE_TONE: Record<Presence, string> = {
  online: 'var(--gem-emerald)',
  away: 'var(--gem-amber)',
  dnd: 'var(--gem-crimson)',
  offline: 'var(--ash)',
};

export interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  presence?: Presence;
  gem?: GemTone;
  className?: string;
  ring?: boolean;
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Hexagonal frame, gem-coloured ring, presence bead. The hex clip lives on the
 * inner layers only so the presence bead and ring are never cut off.
 */
export function Avatar({
  name,
  src,
  size = 'md',
  presence,
  gem = 'violet',
  className,
  ring = true,
}: AvatarProps) {
  const dims = SIZES[size];
  const tone = GEMS[gem];
  const initials = useMemo(() => initialsOf(name), [name]);

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: dims.box, height: dims.box }}
    >
      <div
        className="hex-frame absolute inset-0 transition-shadow duration-300"
        style={{
          background: ring
            ? `linear-gradient(160deg, ${tone.light}, ${tone.base} 45%, rgba(5,3,10,0.9))`
            : 'rgba(201,162,39,0.25)',
          boxShadow: ring ? `0 0 16px -6px ${tone.base}` : undefined,
        }}
        aria-hidden
      />
      <div
        className="hex-frame absolute overflow-hidden"
        style={{ inset: ring ? 2 : 1, background: 'var(--obsidian)' }}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center font-display font-semibold tracking-[0.06em] text-bone/85',
              dims.text,
            )}
            style={{
              background: `radial-gradient(120% 120% at 30% 20%, ${tone.deep}, #0b0713 75%)`,
            }}
          >
            {initials || '?'}
          </div>
        )}
      </div>

      {presence ? (
        <span
          aria-label={presence}
          title={presence}
          className="absolute rounded-full"
          style={{
            width: dims.dot,
            height: dims.dot,
            right: 0,
            bottom: 0,
            background: PRESENCE_TONE[presence],
            boxShadow: `0 0 0 2px var(--void-black), 0 0 10px -1px ${PRESENCE_TONE[presence]}`,
          }}
        />
      ) : null}
    </div>
  );
}
