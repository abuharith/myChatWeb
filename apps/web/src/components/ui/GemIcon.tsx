import { useId } from 'react';
import { cn } from '../../lib/cn';
import { GEMS, type GemTone } from '../../lib/gems';

export interface GemIconProps {
  gem?: GemTone;
  size?: number;
  active?: boolean;
  socket?: boolean;
  className?: string;
  title?: string;
}

/** Original faceted gem with an optional gold socket. */
export function GemIcon({
  gem = 'violet',
  size = 24,
  active = false,
  socket = false,
  className,
  title,
}: GemIconProps) {
  const tone = GEMS[gem];
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const gemGradient = `gem-${uid}`;
  const socketGradient = `socket-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      className={cn('overflow-visible', className)}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gemGradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tone.light} stopOpacity="0.95" />
          <stop offset="52%" stopColor={tone.base} />
          <stop offset="100%" stopColor={tone.deep} />
        </linearGradient>
        <radialGradient id={socketGradient} cx="32%" cy="24%" r="80%">
          <stop offset="0%" stopColor="#2f2742" />
          <stop offset="100%" stopColor="#0b0713" />
        </radialGradient>
      </defs>

      {socket ? (
        <>
          <circle cx="12" cy="12" r="11.4" fill={`url(#${socketGradient})`} />
          <circle
            cx="12"
            cy="12"
            r="11.4"
            fill="none"
            stroke="rgba(201,162,39,0.4)"
            strokeWidth="0.8"
          />
          <circle
            cx="12"
            cy="10"
            r="8"
            fill="none"
            stroke="rgba(237,231,246,0.07)"
            strokeWidth="1"
          />
        </>
      ) : null}

      <g
        style={{
          filter: active ? `drop-shadow(0 0 5px ${tone.base})` : 'none',
          transformOrigin: '12px 12px',
        }}
      >
        <polygon
          points="12,2.4 20.4,7 20.4,17 12,21.6 3.6,17 3.6,7"
          fill={`url(#${gemGradient})`}
          stroke={tone.light}
          strokeOpacity="0.55"
          strokeWidth="0.6"
        />
        <polygon points="12,5 17,8 12,10.8 7,8" fill="#ffffff" fillOpacity="0.3" />
        <polygon
          points="12,10.8 17,8 20.4,17 12,21.6"
          fill={tone.deep}
          fillOpacity="0.55"
        />
        <polygon points="7,8 12,10.8 12,21.6 3.6,17" fill="#000000" fillOpacity="0.26" />
        <polyline
          points="3.6,7 12,10.8 20.4,7"
          fill="none"
          stroke={tone.light}
          strokeOpacity="0.5"
          strokeWidth="0.5"
        />
        <polyline
          points="12,10.8 12,21.6"
          fill="none"
          stroke={tone.light}
          strokeOpacity="0.2"
          strokeWidth="0.5"
        />
      </g>
    </svg>
  );
}
