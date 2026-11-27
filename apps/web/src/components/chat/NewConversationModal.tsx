import { useEffect, useState } from 'react';
import type { ConversationDTO, UserSummaryDTO } from '@voidlink/shared';
import { api, ApiError } from '../../lib/api';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { GemIcon } from '../ui/GemIcon';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useChatStore } from '../../store/chat';
import { useAuthStore } from '../../store/auth';

export function NewConversationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummaryDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addConversation = useChatStore((state) => state.addConversation);
  const select = useChatStore((state) => state.select);
  const me = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setError(null);
      return;
    }
  }, [open]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.get<{ users: UserSummaryDTO[] }>(
          `/v1/users/search?q=${encodeURIComponent(term)}`,
          controller.signal,
        );
        setResults(data.users);
        setError(null);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof ApiError ? requestError.message : 'Search failed');
        }
      } finally {
        setSearching(false);
      }
    }, 260);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const startConversation = async (user: UserSummaryDTO) => {
    setCreating(user.id);
    setError(null);
    try {
      const data = await api.post<{ conversation: ConversationDTO }>('/v1/conversations', {
        type: 'DIRECT',
        participantId: user.id,
      });
      addConversation(data.conversation);
      select(data.conversation.id);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not open the link');
    } finally {
      setCreating(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="New link"
      title="Seek a titan"
      description="Find someone by sigil or display name, then open a direct channel."
      footer={
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          autoFocus
          label="Search"
          placeholder="rune, sable, ashka…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          icon={<GemIcon gem="azure" size={15} />}
          hint="At least two characters."
        />

        {error ? <p className="text-xs text-[color:var(--ember)]">{error}</p> : null}

        <div className="min-h-[120px] space-y-1">
          {searching && results.length === 0 ? (
            <p className="py-6 text-center text-xs text-bone/35">Searching the void…</p>
          ) : null}

          {!searching && query.trim().length >= 2 && results.length === 0 && !error ? (
            <p className="py-6 text-center text-xs text-bone/35">No titan answers that name.</p>
          ) : null}

          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              disabled={creating !== null || user.id === me?.id}
              onClick={() => void startConversation(user)}
              className="flex w-full items-center gap-3 border border-transparent px-2 py-2 text-left transition-colors hover:border-[color:var(--hairline)] hover:bg-white/[0.03] disabled:opacity-40"
            >
              <Avatar
                name={user.displayName}
                src={user.avatarUrl ?? undefined}
                size="sm"
                gem="azure"
                presence={user.presence === 'ONLINE' ? 'online' : user.presence === 'AWAY' ? 'away' : user.presence === 'DND' ? 'dnd' : 'offline'}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-bone/85">{user.displayName}</span>
                <span className="block truncate font-mono text-[0.65rem] text-bone/35">
                  @{user.username}
                </span>
              </span>
              <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[color:var(--titan-gold-300)]/70">
                {creating === user.id ? 'Opening…' : 'Message'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
