import { useEffect, useRef } from 'react';
import type { ConversationDTO, MessageDTO } from '@voidlink/shared';
import { cn } from '../../lib/cn';
import { formatDay, formatTime } from '../../lib/format';
import { useAuthStore } from '../../store/auth';
import { useChatStore } from '../../store/chat';
import { Bubble, type DeliveryState } from '../ui/Bubble';
import { Button } from '../ui/Button';
import { GemIcon } from '../ui/GemIcon';

function deliveryOf(message: MessageDTO): DeliveryState {
  if (message.id.startsWith('temp-')) return 'sending';
  if (message.status === 'READ') return 'read';
  if (message.status === 'DELIVERED') return 'delivered';
  return 'sent';
}

export function MessageList({ conversation }: { conversation: ConversationDTO }) {
  const messages = useChatStore((state) => state.messages[conversation.id] ?? []);
  const hasMore = useChatStore((state) => state.hasMore[conversation.id] ?? false);
  const loading = useChatStore((state) => state.loadingMessages);
  const loadMessages = useChatStore((state) => state.loadMessages);
  const retry = useChatStore((state) => state.retry);
  const sendErrors = useChatStore((state) => state.sendErrors);
  const typing = useChatStore((state) => state.typing[conversation.id] ?? []);
  const me = useAuthStore((state) => state.user);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const element = scrollRef.current;
    const nearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 220;
    if (nearBottom) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, typing.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [conversation.id]);

  let lastDay = '';

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6"
      aria-live="polite"
    >
      {hasMore ? (
        <div className="mb-4 flex justify-center">
          <Button
            size="sm"
            variant="ghost"
            loading={loading}
            onClick={() => void loadMessages(conversation.id, messages[0]?.seq)}
          >
            Load earlier messages
          </Button>
        </div>
      ) : null}

      {messages.length === 0 && !loading ? (
        <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
          <GemIcon gem="azure" size={38} socket />
          <p className="mt-4 font-display text-lg tracking-[0.08em] text-bone/80">
            The channel is silent
          </p>
          <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-bone/35">
            Send the first ember. Messages travel instantly and record their delivery state.
          </p>
        </div>
      ) : null}

      <div className="space-y-2.5">
        {messages.map((message) => {
          const day = formatDay(message.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;

          const mine = message.sender?.id === me?.id;
          const error = sendErrors[message.clientId];

          return (
            <div key={message.id}>
              {showDay ? (
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-[linear-gradient(90deg,transparent,rgba(201,162,39,0.18))]" />
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-bone/30">
                    {day}
                  </span>
                  <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(201,162,39,0.18),transparent)]" />
                </div>
              ) : null}

              <Bubble
                mine={mine}
                author={
                  !mine && conversation.type === 'GROUP'
                    ? (message.sender?.displayName ?? 'Unknown')
                    : undefined
                }
                time={formatTime(message.createdAt)}
                status={deliveryOf(message)}
              >
                {message.body}
              </Bubble>

              {error ? (
                <div className={cn('mt-1 flex items-center gap-2', mine ? 'justify-end' : 'justify-start')}>
                  <span className="text-[0.65rem] text-[color:var(--ember)]">{error}</span>
                  <button
                    type="button"
                    onClick={() => retry(message.clientId)}
                    className="text-[0.65rem] uppercase tracking-[0.12em] text-[color:var(--titan-gold-300)] underline decoration-dotted"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {typing.length > 0 ? (
        <div className="mt-4 flex items-center gap-2 px-1">
          <span className="flex items-end gap-1">
            {[0, 1, 2].map((ember) => (
              <span
                key={ember}
                className="h-1 w-1 animate-ember-rise rounded-full bg-[color:var(--ember)]"
                style={{ animationDelay: `${ember * 160}ms` }}
              />
            ))}
          </span>
          <span className="text-[0.65rem] text-bone/40">
            {typing.map((entry) => entry.displayName).join(', ')}{' '}
            {typing.length === 1 ? 'is' : 'are'} typing…
          </span>
        </div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}
