import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type DeliveryState = 'sending' | 'sent' | 'delivered' | 'read';

export interface BubbleProps {
  children: ReactNode;
  mine?: boolean;
  author?: string;
  time?: string;
  status?: DeliveryState;
  replyTo?: { author: string; body: string };
  reactions?: Array<{ emoji: string; count: number }>;
  className?: string;
}

function StatusGlyph({ status }: { status: DeliveryState }) {
  if (status === 'sending') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="opacity-60">
        <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeDasharray="2 2" />
      </svg>
    );
  }

  if (status === 'sent') {
    return (
      <svg width="13" height="12" viewBox="0 0 13 12" aria-hidden>
        <path
          d="M2 6.4 4.6 9 11 2.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const readTint = status === 'read' ? 'var(--titan-gold-300)' : 'currentColor';
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden style={{ color: readTint }}>
      <path
        d="M1 6.4 3.6 9 10 2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.4 6.4 8 9 14.4 2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={status === 'read' ? 1 : 0.75}
      />
    </svg>
  );
}

export function Bubble({
  children,
  mine = false,
  author,
  time,
  status = 'sent',
  replyTo,
  reactions,
  className,
}: BubbleProps) {
  const statusLabel: Record<DeliveryState, string> = {
    sending: 'sending',
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
  };

  return (
    <div
      className={cn(
        'group flex w-full flex-col gap-1',
        mine ? 'items-end' : 'items-start',
        className,
      )}
    >
      {author && !mine ? (
        <span className="px-1 text-inscribed">{author}</span>
      ) : null}

      <div
        className={cn(
          'max-w-[min(68ch,84%)]',
          mine ? 'bubble-shell-sent' : 'bubble-shell-received',
          mine ? 'bubble-sent-shape' : 'bubble-received-shape',
        )}
      >
        <div
          className={cn(
            'px-3.5 py-2.5',
            mine
              ? 'bubble-fill-sent bubble-sent-shape'
              : 'bubble-fill-received bubble-received-shape',
          )}
        >
          {replyTo ? (
            <div className="mb-2 border-l-2 border-[color:var(--titan-gold-500)]/70 bg-black/20 py-1 pl-2.5">
              <p className="text-[0.7rem] font-medium text-[color:var(--titan-gold-300)]">
                {replyTo.author}
              </p>
              <p className="line-clamp-2 text-xs text-bone/60">{replyTo.body}</p>
            </div>
          ) : null}

          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-bone">
            {children}
          </div>

          <div
            className={cn(
              'mt-1 flex items-center gap-1.5 font-mono text-[0.65rem]',
              mine ? 'justify-end text-bone/55' : 'text-bone-dim',
            )}
          >
            {time ? <time>{time}</time> : null}
            {mine ? (
              <span aria-label={statusLabel[status]} title={statusLabel[status]}>
                <StatusGlyph status={status} />
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {reactions && reactions.length > 0 ? (
        <div className="flex items-center gap-1">
          {reactions.map((reaction) => (
            <span
              key={reaction.emoji}
              className="flex items-center gap-1 rounded-[3px] border border-[color:var(--hairline)] bg-[color:rgba(13,7,21,0.85)] px-1.5 py-0.5 text-xs text-bone/80"
            >
              <span aria-hidden>{reaction.emoji}</span>
              <span className="font-mono text-[0.65rem] text-bone-dim">{reaction.count}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
