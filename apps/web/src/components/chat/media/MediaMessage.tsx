import { useState } from 'react';
import type { AttachmentDTO, MessageDTO } from '@voidlink/shared';
import { cn } from '../../../lib/cn';
import { formatBytes } from '../../../lib/format';
import { Blurhash } from './Blurhash';
import { VoiceNote } from './VoiceNote';

function ViewOnceShroud({
  attachment,
  onOpen,
}: {
  attachment: AttachmentDTO;
  onOpen: (attachment: AttachmentDTO) => void;
}) {
  const opened = Boolean(attachment.openedAt);
  return (
    <button
      type="button"
      disabled={opened}
      onClick={() => onOpen(attachment)}
      aria-label={opened ? 'View-once media already opened' : 'Open view-once media'}
      className={cn(
        'relative flex h-[150px] w-[230px] max-w-full flex-col items-center justify-center overflow-hidden border text-center',
        opened
          ? 'border-[color:var(--hairline)] bg-black/40 text-bone/35'
          : 'border-[color:rgba(201,162,39,0.45)] text-[color:var(--titan-gold-300)]',
      )}
    >
      {!opened && attachment.blurhash ? <Blurhash hash={attachment.blurhash} /> : null}
      {!opened && !attachment.blurhash ? (
        <span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(155,92,255,0.35),rgba(8,5,14,0.9))]"
        />
      ) : null}
      <span className="relative z-10 flex flex-col items-center gap-1.5 px-3">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          {opened ? (
            <path d="M4 4l16 16M10.6 6.2A9.9 9.9 0 0 1 12 6c5 0 9 4.2 9 6 0 .8-.9 2.2-2.5 3.5M6.4 8.1C4.6 9.5 3 11.3 3 12c0 1.8 4 6 9 6 1.6 0 3-.4 4.2-1.1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          ) : (
            <>
              <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </>
          )}
        </svg>
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em]">
          {opened ? 'opened once' : 'view once'}
        </span>
        {!opened ? (
          <span className="text-[0.65rem] text-bone/45">tap · burns after closing</span>
        ) : null}
      </span>
    </button>
  );
}

function MediaImage({
  attachment,
  onOpen,
}: {
  attachment: AttachmentDTO;
  onOpen: (url: string, kind: 'IMAGE' | 'VIDEO') => void;
}) {
  const [loaded, setLoaded] = useState(false);
  if (!attachment.url) return null;

  return (
    <button
      type="button"
      onClick={() => onOpen(attachment.url!, 'IMAGE')}
      aria-label="Open photo"
      className="relative block w-[250px] max-w-full overflow-hidden border border-[color:var(--hairline)] bg-black/40"
      style={{
        aspectRatio:
          attachment.width && attachment.height
            ? `${attachment.width} / ${attachment.height}`
            : '4 / 3',
      }}
    >
      {attachment.blurhash && !loaded ? <Blurhash hash={attachment.blurhash} /> : null}
      <img
        src={attachment.url}
        alt="Shared photo"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </button>
  );
}

function MediaVideo({
  attachment,
  onOpen,
}: {
  attachment: AttachmentDTO;
  onOpen: (url: string, kind: 'IMAGE' | 'VIDEO') => void;
}) {
  if (!attachment.url) return null;
  return (
    <button
      type="button"
      onClick={() => onOpen(attachment.url!, 'VIDEO')}
      aria-label="Play video"
      className="relative flex h-[160px] w-[250px] max-w-full items-center justify-center overflow-hidden border border-[color:var(--hairline)] bg-black/50"
    >
      {attachment.thumbnailUrl ? (
        <img
          src={attachment.thumbnailUrl}
          alt="Video preview"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
      ) : attachment.blurhash ? (
        <Blurhash hash={attachment.blurhash} />
      ) : null}
      <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[color:rgba(242,212,114,0.55)] bg-black/55 text-[color:var(--titan-gold-300)]">
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
          <path d="M7 4.5 19 12 7 19.5Z" fill="currentColor" />
        </svg>
      </span>
      {attachment.durationMs ? (
        <span className="absolute bottom-2 right-2 z-10 rounded-[2px] bg-black/65 px-1.5 py-0.5 font-mono text-[0.55rem] text-bone/75">
          {Math.floor(attachment.durationMs / 60000)}:
          {String(Math.round((attachment.durationMs % 60000) / 1000)).padStart(2, '0')}
        </span>
      ) : null}
    </button>
  );
}

function FileRow({ attachment }: { attachment: AttachmentDTO }) {
  if (!attachment.url) return null;
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="flex w-[250px] max-w-full items-center gap-2.5 border border-[color:var(--hairline)] bg-black/25 px-3 py-2.5"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-[color:var(--hairline)] text-[color:var(--titan-gold-300)]">
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
          <path d="M7 3.5h7l4 4V20H7V3.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M14 3.5V8h4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-bone/85">
          {attachment.kind === 'FILE' ? 'Shared file' : attachment.mimeType}
        </span>
        <span className="block font-mono text-[0.58rem] text-bone/40">
          {formatBytes(attachment.sizeBytes)} · open
        </span>
      </span>
    </a>
  );
}

export function MediaMessage({
  message,
  onOpen,
  onViewOnce,
}: {
  message: MessageDTO;
  onOpen: (url: string, kind: 'IMAGE' | 'VIDEO') => void;
  onViewOnce: (attachment: AttachmentDTO) => void;
}) {
  if (message.attachments.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {message.attachments.map((attachment) => {
        if (attachment.viewOnce) {
          return <ViewOnceShroud key={attachment.id} attachment={attachment} onOpen={onViewOnce} />;
        }
        if (attachment.kind === 'IMAGE') {
          return <MediaImage key={attachment.id} attachment={attachment} onOpen={onOpen} />;
        }
        if (attachment.kind === 'VIDEO') {
          return <MediaVideo key={attachment.id} attachment={attachment} onOpen={onOpen} />;
        }
        if (attachment.kind === 'VOICE' || attachment.kind === 'AUDIO') {
          return <VoiceNote key={attachment.id} attachment={attachment} />;
        }
        return <FileRow key={attachment.id} attachment={attachment} />;
      })}
    </div>
  );
}
