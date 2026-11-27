import type { ConversationDTO } from '@voidlink/shared';
import { formatLastSeen } from '../../lib/format';
import { useChatStore } from '../../store/chat';
import { Avatar } from '../ui/Avatar';
import { GemIcon } from '../ui/GemIcon';
import { Panel } from '../ui/Panel';

function presenceLabel(presence: string | undefined): string {
  if (presence === 'ONLINE') return 'online';
  if (presence === 'AWAY') return 'away';
  if (presence === 'DND') return 'do not disturb';
  return 'offline';
}

export function PeerPanel({ conversation }: { conversation: ConversationDTO }) {
  const live = useChatStore((state) => state.presence);
  const peer = conversation.peer;
  const peerPresence = peer ? (live[peer.id]?.presence ?? peer.presence) : undefined;
  const lastSeen = peer ? (live[peer.id]?.lastSeenAt ?? peer.lastSeenAt) : null;
  const title = conversation.title ?? peer?.displayName ?? 'Unknown';
  const isGroup = conversation.type === 'GROUP';

  return (
    <aside className="hidden h-full w-[300px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-[color:var(--hairline)] bg-[color:rgba(9,5,16,0.6)] px-3 py-4 backdrop-blur-md xl:flex">
      <div className="flex flex-col items-center px-2 pt-2 text-center">
        <Avatar
          name={title}
          src={conversation.avatarUrl ?? peer?.avatarUrl ?? undefined}
          size="xl"
          gem={isGroup ? 'amber' : 'violet'}
          presence={!isGroup && peerPresence === 'ONLINE' ? 'online' : !isGroup && peerPresence === 'AWAY' ? 'away' : !isGroup && peerPresence === 'DND' ? 'dnd' : !isGroup ? 'offline' : undefined}
        />
        <h2 className="mt-3 font-display text-lg tracking-[0.06em] text-bone">{title}</h2>
        {peer ? <p className="font-mono text-[0.65rem] text-bone/40">@{peer.username}</p> : null}
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-bone/45">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background:
                peerPresence === 'ONLINE'
                  ? 'var(--gem-emerald)'
                  : peerPresence === 'AWAY'
                    ? 'var(--gem-amber)'
                    : peerPresence === 'DND'
                      ? 'var(--gem-crimson)'
                      : 'var(--ash)',
            }}
          />
          {presenceLabel(peerPresence)}
          {peerPresence !== 'ONLINE' && lastSeen ? ` · seen ${formatLastSeen(lastSeen)}` : ''}
        </p>
      </div>

      <Panel eyebrow="Channel" title="Details" className="mt-2">
        <dl className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <dt className="text-bone/40">Type</dt>
            <dd className="text-bone/75">{isGroup ? 'Group' : 'Direct'}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-bone/40">Members</dt>
            <dd className="font-mono text-bone/75">{conversation.participants.length}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-bone/40">Encryption</dt>
            <dd className="flex items-center gap-1.5 text-bone/75">
              <GemIcon gem="emerald" size={11} active /> at rest
            </dd>
          </div>
        </dl>
      </Panel>

      {isGroup ? (
        <Panel eyebrow="Roster" title="Titans present">
          <ul className="space-y-2">
            {conversation.participants.map((participant) => {
              const status = live[participant.id]?.presence ?? participant.presence;
              return (
                <li key={participant.id} className="flex items-center gap-2.5">
                  <Avatar
                    name={participant.displayName}
                    src={participant.avatarUrl ?? undefined}
                    size="sm"
                    gem="azure"
                    presence={status === 'ONLINE' ? 'online' : status === 'AWAY' ? 'away' : status === 'DND' ? 'dnd' : 'offline'}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-bone/80">
                      {participant.displayName}
                    </span>
                    <span className="block truncate font-mono text-[0.6rem] text-bone/30">
                      @{participant.username}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      <Panel eyebrow="Shared" title="Media">
        <div className="flex flex-col items-center justify-center border border-dashed border-[color:var(--hairline)] px-3 py-6 text-center">
          <GemIcon gem="amber" size={22} className="opacity-60" />
          <p className="mt-2 text-[0.7rem] leading-relaxed text-bone/35">
            Photos, video and voice notes arrive with Phase 4.
          </p>
        </div>
      </Panel>

      <Panel eyebrow="Security" title="The ward">
        <p className="text-[0.7rem] leading-relaxed text-bone/40">
          Access tokens live 15 minutes; refresh tokens rotate every use and reuse revokes the
          session family. Message bodies are stored behind Postgres at rest.
        </p>
      </Panel>
    </aside>
  );
}
