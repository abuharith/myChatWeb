import { GemIcon } from '../components/ui/GemIcon';
import { Panel } from '../components/ui/Panel';
import type { GemTone } from '../lib/gems';

interface Placeholder {
  title: string;
  eyebrow: string;
  description: string;
  gem: GemTone;
  phase: string;
  details: string[];
}

const CONTENT: Record<string, Placeholder> = {
  calls: {
    eyebrow: 'Chamber of voices',
    title: 'Calls',
    description:
      'The summoning circle is being carved. One-to-one WebRTC and eight-seat group calls arrive in Phase 5.',
    gem: 'violet',
    phase: 'Phase 5',
    details: [
      'Ringing portal with accept, decline and busy states',
      '1-to-1 peer-to-peer WebRTC with coturn fallback',
      'LiveKit SFU rooms for up to eight titans',
      'Screen sharing, active-speaker spotlight and call history',
    ],
  },
  status: {
    eyebrow: 'Fleeting visions',
    title: 'Status',
    description:
      'Stories burn for twenty-four hours. The composer and viewer arrive with Phase 6.',
    gem: 'emerald',
    phase: 'Phase 6',
    details: [
      'Photo, video and text stories with a 24h fuse',
      'Close-circle visibility and view receipts',
      'Replies that thread back into the direct channel',
    ],
  },
  media: {
    eyebrow: 'Reliquary',
    title: 'Media',
    description:
      'Photos, video, voice notes and the Dust Dissolve vault are forged in Phase 4.',
    gem: 'amber',
    phase: 'Phase 4',
    details: [
      'Presigned MinIO / R2 uploads with client compression',
      'Blurhash placeholders and FFmpeg thumbnails',
      'Waveform voice messages with speed control',
      'Lightbox with zoom, swipe and view-once burn',
    ],
  },
  contacts: {
    eyebrow: 'The bound',
    title: 'Contacts',
    description:
      'Sigil search, QR invitations, blocks and reports land with Phase 6.',
    gem: 'crimson',
    phase: 'Phase 6',
    details: [
      'Add by sigil, QR code or invite link',
      'Block, report and trust tiers',
      'Fuzzy contact search powered by pg_trgm',
    ],
  },
  settings: {
    eyebrow: 'The creed',
    title: 'Settings',
    description:
      'Theme intensity, motion, sound packs, privacy and device sessions arrive with Phase 6.',
    gem: 'gold',
    phase: 'Phase 6',
    details: [
      'Reduced motion and low-power switches',
      'Sound pack and master volume',
      'Read receipt and last-seen privacy',
      'Active device sessions with remote logout',
    ],
  },
};

export function PlaceholderScreen({ id }: { id: string }) {
  const content = CONTENT[id] ?? CONTENT.calls;
  if (!content) return null;

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-5 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-7 flex flex-col items-center text-center">
          <GemIcon gem={content.gem} size={46} socket active />
          <p className="text-inscribed mt-4">{content.eyebrow}</p>
          <h1 className="mt-1.5 font-display text-2xl tracking-[0.1em] text-bone">
            {content.title}
          </h1>
          <p className="mt-3 text-balance text-sm leading-relaxed text-bone/45">
            {content.description}
          </p>
        </div>

        <Panel
          eyebrow="Sealed"
          title={content.phase}
          actions={
            <span className="border border-[color:var(--hairline)] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-bone/35">
              upcoming
            </span>
          }
        >
          <ul className="space-y-2.5">
            {content.details.map((detail) => (
              <li key={detail} className="flex gap-2.5 text-sm text-bone/60">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[color:var(--titan-gold-500)]" />
                {detail}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
