import { cn } from '../lib/cn';
import { useAuthStore } from '../store/auth';
import { useChatStore } from '../store/chat';
import { ConversationList } from '../components/chat/ConversationList';
import { MessageList } from '../components/chat/MessageList';
import { Composer } from '../components/chat/Composer';
import { PeerPanel } from '../components/chat/PeerPanel';
import { Avatar } from '../components/ui/Avatar';
import { GemIcon } from '../components/ui/GemIcon';
import { formatLastSeen } from '../lib/format';
import { useChatStore as useChat } from '../store/chat';

function ChatHeader() {
  const conversation = useChat((state) =>
    state.conversations.find((item) => item.id === state.activeId),
  );
  const presence = useChat((state) => state.presence);
  const closeActive = useChat((state) => state.closeActive);
  const online = useChat((state) => state.online);

  if (!conversation) return null;

  const peer = conversation.peer;
  const title = conversation.title ?? peer?.displayName ?? 'Unknown';
  const status = peer ? (presence[peer.id]?.presence ?? peer.presence) : undefined;
  const lastSeen = peer ? (presence[peer.id]?.lastSeenAt ?? peer.lastSeenAt) : null;
  const isGroup = conversation.type === 'GROUP';

  return (
    <header className="flex items-center gap-3 border-b border-[color:var(--hairline)] bg-[color:rgba(9,5,16,0.72)] px-3 py-3 backdrop-blur-md md:px-5">
      <button
        type="button"
        onClick={closeActive}
        aria-label="Back to conversations"
        className="flex h-8 w-8 items-center justify-center text-bone/50 transition-colors hover:text-bone md:hidden"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
          <path d="M14 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <Avatar
        name={title}
        src={conversation.avatarUrl ?? peer?.avatarUrl ?? undefined}
        size="md"
        gem={isGroup ? 'amber' : 'violet'}
        presence={
          !isGroup && status === 'ONLINE'
            ? 'online'
            : !isGroup && status === 'AWAY'
              ? 'away'
              : !isGroup && status === 'DND'
                ? 'dnd'
                : !isGroup
                  ? 'offline'
                  : undefined
        }
      />

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-base tracking-[0.05em] text-bone">{title}</h1>
        <p className="truncate font-mono text-[0.62rem] text-bone/40">
          {isGroup
            ? `${conversation.participants.length} titans`
            : status === 'ONLINE'
              ? 'online'
              : lastSeen
                ? `seen ${formatLastSeen(lastSeen)}`
                : 'offline'}
          {!online ? ' · reconnecting…' : ''}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled
          title="Voice & video calls arrive in Phase 5"
          aria-label="Start a call (arrives in Phase 5)"
          className="flex h-9 w-9 items-center justify-center rounded-full text-bone/25 disabled:cursor-not-allowed"
        >
          <GemIcon gem="violet" size={18} className="opacity-50" />
        </button>
        <span className="hidden items-center gap-1.5 border border-[color:var(--hairline)] px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.12em] text-bone/30 sm:flex">
          <GemIcon gem="emerald" size={9} active /> live
        </span>
      </div>
    </header>
  );
}

function EmptyChannel() {
  const me = useAuthStore((state) => state.user);
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(155,92,255,0.22), transparent 70%)' }}
        />
        <GemIcon gem="violet" size={54} socket active />
      </div>
      <h2 className="mt-6 font-display text-xl tracking-[0.1em] text-bone/85">
        Choose a channel, {me?.displayName.split(' ')[0] ?? 'titan'}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-bone/40">
        Every link is a thread in the dark. Select a conversation, or open a new one with the{" "}
        <span className="text-[color:var(--titan-gold-300)]">+</span> in the channel list.
      </p>
      <p className="mt-6 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-bone/25">
        typing · presence · read receipts are live
      </p>
    </div>
  );
}

export function ChatsScreen() {
  const activeId = useChatStore((state) => state.activeId);
  const conversation = useChatStore((state) =>
    state.conversations.find((item) => item.id === state.activeId),
  );

  return (
    <div className="flex h-full min-h-0 w-full">
      <aside
        className={cn(
          'h-full w-full shrink-0 border-r border-[color:var(--hairline)] md:w-[330px]',
          activeId && 'hidden md:block',
        )}
      >
        <ConversationList />
      </aside>

      <section
        className={cn(
          'flex h-full min-h-0 min-w-0 flex-1 flex-col',
          !conversation && 'hidden md:flex',
        )}
      >
        {conversation ? (
          <>
            <ChatHeader />
            <MessageList conversation={conversation} />
            <Composer conversation={conversation} />
          </>
        ) : (
          <EmptyChannel />
        )}
      </section>

      {conversation ? <PeerPanel conversation={conversation} /> : null}
    </div>
  );
}
