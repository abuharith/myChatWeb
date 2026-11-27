import { useEffect, useRef, useState } from 'react';
import type { AttachmentDTO, ConversationDTO } from '@voidlink/shared';
import { formatBytes } from '../../lib/format';
import { cn } from '../../lib/cn';
import { uploadMedia } from '../../lib/media';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useChatStore } from '../../store/chat';
import { getChatSocket } from '../../lib/socket';
import { GemIcon } from '../ui/GemIcon';

const TYPING_INTERVAL = 2200;
const ACCEPT = 'image/*,video/*,audio/*,application/pdf,text/plain,application/zip';

function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function Composer({ conversation }: { conversation: ConversationDTO }) {
  const [value, setValue] = useState('');
  const [staged, setStaged] = useState<AttachmentDTO[]>([]);
  const [uploading, setUploading] = useState<{ name: string; percent: number } | null>(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);

  const send = useChatStore((state) => state.send);
  const online = useChatStore((state) => state.online);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastTypingRef = useRef(0);
  const recorder = useVoiceRecorder();

  useEffect(() => {
    setValue('');
    setStaged([]);
    setViewOnce(false);
    setError(null);
    lastTypingRef.current = 0;
  }, [conversation.id]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [value]);

  const addFiles = async (files: FileList | File[]) => {
    const room = 10 - staged.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (list.length === 0) return;
    setError(null);

    for (const file of list) {
      setUploading({ name: file.name, percent: 0 });
      try {
        const attachment = await uploadMedia(file, {
          onProgress: (percent) => setUploading({ name: file.name, percent }),
        });
        setStaged((current) => [...current, attachment]);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
      } finally {
        setUploading(null);
      }
    }
  };

  const removeStaged = (id: string) => {
    setStaged((current) => current.filter((attachment) => attachment.id !== id));
    if (staged.length <= 1) setViewOnce(false);
  };

  const signalTyping = (next: string) => {
    setValue(next);
    if (!next.trim()) return;
    const now = Date.now();
    if (now - lastTypingRef.current < TYPING_INTERVAL) return;
    lastTypingRef.current = now;
    getChatSocket()?.emit('typing:start', { conversationId: conversation.id });
  };

  const submit = async () => {
    const body = value.trim();
    if ((!body && staged.length === 0) || recorder.recording || sendingVoice) return;
    const attachments = staged;
    const once = viewOnce && attachments.length === 1;
    setValue('');
    setStaged([]);
    setViewOnce(false);
    setError(null);
    getChatSocket()?.emit('typing:stop', { conversationId: conversation.id });
    await send(body, attachments, { viewOnce: once });
    textareaRef.current?.focus();
  };

  const finishRecording = async () => {
    const clip = await recorder.stop();
    if (!clip) return;
    setSendingVoice(true);
    setError(null);
    setUploading({ name: 'Voice note', percent: 0 });
    try {
      const attachment = await uploadMedia(
        new File([clip.blob], `voice-${Date.now()}.webm`, { type: clip.mimeType }),
        {
          kind: 'VOICE',
          durationMs: clip.durationMs,
          waveform: clip.waveform,
          onProgress: (percent) => setUploading({ name: 'Voice note', percent }),
        },
      );
      await send('', [attachment]);
    } catch (voiceError) {
      setError(voiceError instanceof Error ? voiceError.message : 'Voice note failed to upload');
    } finally {
      setUploading(null);
      setSendingVoice(false);
    }
  };

  const canSend = Boolean(value.trim()) || staged.length > 0;
  const canBeViewOnce =
    staged.length === 1 && (staged[0]?.kind === 'IMAGE' || staged[0]?.kind === 'VIDEO');

  return (
    <div
      className={cn(
        'relative border-t border-[color:var(--hairline)] bg-[color:rgba(9,5,16,0.8)] px-3 pb-24 pt-3 backdrop-blur-md transition-colors md:px-4 md:pb-4',
        dragging && 'bg-[rgba(75,29,122,0.25)]',
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (event.dataTransfer.files.length > 0) void addFiles(event.dataTransfer.files);
      }}
      onPaste={(event) => {
        const files = Array.from(event.clipboardData.files);
        if (files.length > 0) {
          event.preventDefault();
          void addFiles(files);
        }
      }}
    >
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        aria-label="Attach media files"
        onChange={(event) => {
          if (event.target.files) void addFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {!online ? (
        <p className="mb-2 text-center font-mono text-[0.6rem] text-[color:var(--ember)]/80">
          offline · messages queue and send on reconnect
        </p>
      ) : null}

      {dragging ? (
        <p className="mb-2 text-center font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--titan-gold-300)]">
          drop to forge an attachment
        </p>
      ) : null}

      {uploading ? (
        <div className="mb-2">
          <div className="flex items-center justify-between font-mono text-[0.58rem] text-bone/50">
            <span className="truncate">{uploading.name}</span>
            <span>{uploading.percent}%</span>
          </div>
          <div className="mt-1 h-[2px] w-full bg-white/10">
            <div
              className="h-full bg-[linear-gradient(90deg,var(--titan-gold-500),var(--gem-violet))] transition-[width] duration-200"
              style={{ width: `${uploading.percent}%` }}
            />
          </div>
        </div>
      ) : null}

      {staged.length > 0 ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {staged.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 border border-[color:var(--hairline)] bg-black/30 p-1 pr-1.5"
            >
              {attachment.thumbnailUrl ? (
                <img
                  src={attachment.thumbnailUrl}
                  alt=""
                  className="h-9 w-9 object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center text-[color:var(--titan-gold-300)]">
                  <GemIcon gem={attachment.kind === 'VOICE' ? 'cyan' : 'amber'} size={16} />
                </span>
              )}
              <span className="max-w-[120px]">
                <span className="block truncate font-mono text-[0.58rem] uppercase tracking-[0.1em] text-bone/60">
                  {attachment.kind.toLowerCase()}
                </span>
                <span className="block font-mono text-[0.55rem] text-bone/35">
                  {formatBytes(attachment.sizeBytes)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeStaged(attachment.id)}
                aria-label="Remove attachment"
                className="ml-1 flex h-6 w-6 items-center justify-center text-bone/40 hover:text-[color:var(--ember)]"
              >
                ×
              </button>
            </div>
          ))}

          {canBeViewOnce ? (
            <button
              type="button"
              aria-pressed={viewOnce}
              onClick={() => setViewOnce((current) => !current)}
              className={cn(
                'border px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.12em] transition-colors',
                viewOnce
                  ? 'border-[color:var(--titan-gold-500)] bg-[rgba(201,162,39,0.16)] text-[color:var(--titan-gold-300)]'
                  : 'border-[color:var(--hairline)] text-bone/45',
              )}
            >
              view once
            </button>
          ) : null}
        </div>
      ) : null}

      {error || recorder.error ? (
        <p className="mb-2 font-mono text-[0.6rem] text-[color:var(--ember)]">
          {error ?? recorder.error}
        </p>
      ) : null}

      {recorder.recording ? (
        <div className="flex items-center gap-3 border border-[color:rgba(255,107,61,0.4)] bg-[rgba(30,8,10,0.5)] px-3 py-2">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[color:var(--ember)]" />
          <span className="shrink-0 font-mono text-[0.65rem] text-bone/70">
            {clock(recorder.elapsedMs)}
          </span>
          <span className="flex h-8 min-w-0 flex-1 items-center gap-[2px]">
            {(recorder.levels.length > 0 ? recorder.levels.slice(-48) : [0.15, 0.25, 0.15]).map(
              (level, index) => (
                <span
                  key={index}
                  className="w-full min-w-[1px] rounded-full bg-[color:var(--titan-gold-300)]/80"
                  style={{ height: `${Math.max(12, Math.min(100, level * 100))}%` }}
                />
              ),
            )}
          </span>
          <button
            type="button"
            onClick={recorder.cancel}
            aria-label="Cancel recording"
            className="shrink-0 px-2 py-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-bone/50"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={() => void finishRecording()}
            aria-label="Send voice message"
            disabled={sendingVoice}
            className="shrink-0 border border-[color:rgba(201,162,39,0.5)] px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[color:var(--titan-gold-300)] disabled:opacity-50"
          >
            send
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-0.5 pb-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Attach photo, video or file"
              aria-label="Attach media"
              className="flex h-8 w-8 items-center justify-center text-bone/50 transition-colors hover:text-[color:var(--titan-gold-300)]"
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
              onClick={() => void recorder.start()}
              title="Record a voice message"
              aria-label="Record a voice message"
              className="flex h-8 w-8 items-center justify-center text-bone/50 transition-colors hover:text-[color:var(--gem-cyan)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <rect x="9" y="3.5" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
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
            disabled={!canSend}
            aria-label="Send message"
            title={canSend ? 'Send (Enter)' : 'Write or attach something first'}
            className={
              canSend
                ? 'mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:rgba(201,162,39,0.5)] bg-titan text-bone shadow-[var(--glow-violet)] transition-transform duration-200 hover:scale-[1.04]'
                : 'mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--hairline)] text-bone/30'
            }
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M4 12 20 4l-6 16-2.6-6.4L4 12Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      <p className="mt-1.5 hidden px-1 font-mono text-[0.55rem] text-bone/20 md:block">
        Enter to send · Shift+Enter for a new line · drag, paste or attach media
      </p>
    </div>
  );
}
