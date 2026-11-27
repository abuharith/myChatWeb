import { useEffect, useRef, useState } from 'react';
import type { ConversationDTO } from '@voidlink/shared';
import { useChatStore } from '../../store/chat';
import { getChatSocket } from '../../lib/socket';
import { GemIcon } from '../ui/GemIcon';

const TYPING_INTERVAL = 2200;

export function Composer({ conversation }: { conversation: ConversationDTO }) {
  const [value, setValue] = useState('');
  const send = useChatStore((state) => state.send);
  const online = useChatStore((state) => state.online);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingRef = useRef(0);

  useEffect(() => {
    setValue('');
    lastTypingRef.current = 0;
  }, [conversation.id]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [value]);

  const submit = async () => {
    const body = value.trim();
    if (!body) return;
    setValue('');
    getChatSocket()?.emit('typing:stop', { conversationId: conversation.id });
    await send(body);
    textareaRef.current?.focus();
  };

  const signalTyping = (next: string) => {
    setValue(next);
    if (!next.trim()) return;
    const now = Date.now();
    if (now - lastTypingRef.current < TYPING_INTERVAL) return;
    lastTypingRef.current = now;
    getChatSocket()?.emit('typing:start', { conversationId: conversation.id });
  };

  return (
    <div className="border-t border-[color:var(--hairline)] bg-[color:rgba(9,5,16,0.8)] px-3 pb-24 pt-3 backdrop-blur-md md:px-4 md:pb-4">
      {!online ? (
        <p className="mb-2 text-center font-mono text-[0.6rem] text-[color:var(--ember)]/80">
          offline · messages queue and send on reconnect
        </p>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="flex items-center gap-0.5 pb-2">
          <button
            type="button"
            disabled
            title="Photo & video uploads arrive in Phase 4"
            aria-label="Attach media (arrives in Phase 4)"
            className="flex h-8 w-8 items-center justify-center text-bone/30 disabled:cursor-not-allowed"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M12 6.5v11M6.5 12h11"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            disabled
            title="Voice messages arrive in Phase 4"
            aria-label="Record voice message (arrives in Phase 4)"
            className="flex h-8 w-8 items-center justify-center text-bone/30 disabled:cursor-not-allowed"
          >
            <GemIcon gem="cyan" size={15} className="opacity-40" />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-end border border-[color:var(--hairline)] bg-[color:rgba(5,3,10,0.6)] px-3 py-2 transition-colors focus-within:border-[color:var(--titan-gold-500)]">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => signalTyping(event.target.value)}
            onBlur={() => getChatSocket()?.emit('typing:stop', { conversationId: conversation.id })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder={`Message ${conversation.title ?? conversation.peer?.displayName ?? 'the channel'}…`}
            aria-label="Message text"
            className="max-h-40 w-full resize-none bg-transparent text-sm leading-relaxed text-bone outline-none placeholder:text-bone/25"
          />
        </div>

        <button
          type="button"
          onClick={() => void submit()}
          disabled={!value.trim()}
          aria-label={value.trim() ? 'Send message' : 'Record a voice message'}
          title={value.trim() ? 'Send (Enter)' : 'Voice messages arrive in Phase 4'}
          className={
            value.trim()
              ? 'mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:rgba(201,162,39,0.5)] bg-titan text-bone shadow-[var(--glow-violet)] transition-transform duration-200 hover:scale-[1.04]'
              : 'mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--hairline)] text-bone/30'
          }
        >
          {value.trim() ? (
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M4 12 20 4l-6 16-2.6-6.4L4 12Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <rect x="9" y="3.5" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      <p className="mt-1.5 hidden px-1 font-mono text-[0.55rem] text-bone/20 md:block">
        Enter to send · Shift+Enter for a new line · reactions and editing land with Phase 6
      </p>
    </div>
  );
}
