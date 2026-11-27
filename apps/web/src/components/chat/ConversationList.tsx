import { useState } from 'react';
import type { ConversationDTO } from '@voidlink/shared';
import { cn } from '../../lib/cn';
import { formatTime, previewOf } from '../../lib/format';
import { badgeLabel } from '../../lib/unread';
import { useAuthStore } from '../../store/auth';
import { useChatStore } from '../../store/chat';
import { Avatar } from '../ui/Avatar';
import { GemIcon } from '../ui/GemIcon';
import { NewConversationModal } from './NewConversationModal';

function presenceOf(conversation: ConversationDTO, map: ReturnType<typeof useChatStore.getState>['presence']) {
  const peerId = conversation.peer?.id;
  const live = peerId ? map[peerId]?.presence : undefined;
  const fallback = conversation.peer?.presence;
  const value = live ?? fallback ?? 'OFFLINE';
  return value === 'ONLINE' ? 'online' : value === 'AWAY' ? 'away' : value === 'DND' ? 'dnd' : 'offline';
}

export function ConversationList() {
  const [modalOpen, setModalOpen] = useState(false);
  const conversations = useChatStore((state) => state.conversations);
  const presence = useChatStore((state) => state.presence);
  const activeId = useChatStore((state) => state.activeId);
  const select = useChatStore((state) => state.select);
  const loading = useChatStore((state) => state.loadingConversations);
  const online = useChatStore((state) => state.online);

  const me = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-[color:rgba(9,5,16,0.72)] backdrop-blur-md">
        {/* profile bar */}
        <header className="flex items-center gap-3 border-b border-[color:var(--hairline)] px-4 py-3.5">
          <Avatar name={me?.displayName ?? 'Void'} src={me?.avatarUrl ?? undefined} size="md" presence="online" gem="gold" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm tracking-[0.06em] text-bone">
              {me?.displayName ?? 'Unknown'}
            </p>
            <p className="flex items-center gap-1.5 font-mono text-[0.6rem] text-bone/35">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: online ? 'var(--gem-emerald)' : 'var(--ember)' }}
              />
              {online ? 'linked' : 'reconnecting'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center text-bone/35 transition-colors hover:text-[color:var(--titan-gold-300)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M9 4H5.5v16H9M15 8l4 4-4 4M19 12H9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>

        {/* header row */}
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div>
            <p className="text-inscribed">Channels</p>
            <h2 className="mt-0.5 font-display text-lg tracking-[0.08em] text-bone">Conversations</h2>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label="New conversation"
            title="New conversation"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--hairline)] text-bone/60 transition-colors hover:border-[color:var(--titan-gold-500)] hover:text-[color:var(--titan-gold-300)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-24 md:pb-3">
          {loading && conversations.length === 0 ? (
            <div className="space-y-2 px-2 pt-2">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex animate-pulse items-center gap-3 py-2">
                  <div className="h-10 w-10 rounded-full bg-white/[0.05]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 w-2/3 rounded bg-white/[0.06]" />
                    <div className="h-2 w-1/2 rounded bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!loading && conversations.length === 0 ? (
            <div className="mx-2 mt-4 border border-dashed border-[color:var(--hairline)] px-4 py-8 text-center">
              <GemIcon gem="azure" size={30} socket className="mx-auto" />
              <p className="mt-3 font-display text-sm tracking-[0.08em] text-bone/80">
                No links yet
              </p>
              <p className="mt-1 text-xs leading-relaxed text-bone/35">
                Seek a titan by sigil and open the first channel.
              </p>
            </div>
          ) : null}

          {conversations.map((conversation) => {
            const title = conversation.title ?? conversation.peer?.displayName ?? 'Unknown';
            const last = conversation.lastMessage;
            const isActive = activeId === conversation.id;
            const badge = badgeLabel(conversation.unreadCount);

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => select(conversation.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'group relative flex w-full items-center gap-3 px-2.5 py-2.5 text-left transition-colors',
                  isActive
                    ? 'bg-[linear-gradient(90deg,rgba(75,29,122,0.35),rgba(75,29,122,0.05))]'
                    : 'hover:bg-white/[0.03]',
                )}
              >
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-1 left-0 w-[2px] bg-[linear-gradient(180deg,var(--titan-gold-300),var(--titan-gold-700))]"
                  />
                ) : null}

                <Avatar
                  name={title}
                  src={conversation.avatarUrl ?? conversation.peer?.avatarUrl ?? undefined}
                  size="md"
                  gem={conversation.type === 'GROUP' ? 'amber' : 'azure'}
                  presence={conversation.type === 'DIRECT' ? presenceOf(conversation, presence) : undefined}
                />

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-bone/85">{title}</span>
                    <span className="shrink-0 font-mono text-[0.6rem] text-bone/30">
                      {last ? formatTime(last.createdAt) : ''}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-bone/40">
                      {last ? previewOf(last.body, last.type, last.senderId === me?.id) : 'No messages yet'}
                    </span>
                    {badge ? (
                      <span
                        aria-label={`${conversation.unreadCount} unread messages`}
                        className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[color:var(--titan-gold-500)] px-1 font-mono text-[0.55rem] font-medium text-[#100a02]"
                      >
                        {badge}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <NewConversationModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
