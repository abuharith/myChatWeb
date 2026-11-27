import { useState, type ReactNode } from 'react';
import { Avatar, Bubble, Button, GemIcon, Input, Modal, Panel } from '../components/ui';
import { GEM_KEYS, GEMS } from '../lib/gems';
import { useUiStore } from '../store/ui';

const SURFACES = [
  { name: 'Void Black', token: '--void-black', hex: '#05030A', note: 'base' },
  { name: 'Abyss', token: '--abyss', hex: '#0D0715', note: 'panels' },
  { name: 'Obsidian', token: '--obsidian', hex: '#141020', note: 'raised' },
  { name: 'Basalt', token: '--basalt', hex: '#1C1729', note: 'inputs' },
  { name: 'Slag', token: '--slag', hex: '#2A2338', note: 'disabled' },
];

const ENERGY = [
  { name: 'Titan 900', token: '--titan-purple-900', hex: '#2A0F45' },
  { name: 'Titan 700', token: '--titan-purple-700', hex: '#4B1D7A' },
  { name: 'Titan 500', token: '--titan-purple-500', hex: '#7B2FBE' },
  { name: 'Titan 300', token: '--titan-purple-300', hex: '#A768E8' },
  { name: 'Gold 700', token: '--titan-gold-700', hex: '#8A6E14' },
  { name: 'Gold 500', token: '--titan-gold-500', hex: '#C9A227' },
  { name: 'Gold 300', token: '--titan-gold-300', hex: '#F2D472' },
  { name: 'Ember', token: '--ember', hex: '#FF5A1F' },
  { name: 'Ash', token: '--ash', hex: '#8C8599' },
  { name: 'Bone', token: '--bone', hex: '#EDE7F6' },
];

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-3 flex items-center gap-3">
        <span aria-hidden className="h-px w-7 bg-[color:var(--hairline-strong)]" />
        <p className="text-inscribed">{eyebrow}</p>
      </div>
      <h2 className="font-display text-xl tracking-[0.1em] text-bone md:text-2xl">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bone-dim">{description}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Swatch({ name, token, hex, note }: { name: string; token: string; hex: string; note?: string }) {
  return (
    <div className="chamfer-sm group relative overflow-hidden border border-[color:var(--hairline)] bg-[color:rgba(13,7,21,0.55)]">
      <div className="h-16 w-full" style={{ background: hex }} />
      <div className="flex items-baseline justify-between gap-2 px-2.5 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-bone">{name}</p>
          <p className="truncate font-mono text-[0.6rem] text-bone/40">{token}</p>
        </div>
        {note ? <span className="font-mono text-[0.6rem] text-bone/35">{note}</span> : null}
      </div>
    </div>
  );
}

export function DesignSystem() {
  const [modalOpen, setModalOpen] = useState(false);
  const lowPower = useUiStore((state) => state.lowPower);
  const forceReduced = useUiStore((state) => state.forceReducedMotion);
  const toggleLowPower = useUiStore((state) => state.toggleLowPower);
  const toggleReducedMotion = useUiStore((state) => state.toggleReducedMotion);

  return (
    <div className="relative mx-auto w-full max-w-5xl px-5 pb-32 pt-14 md:px-8 md:pb-20 md:pr-28">
      {/* ── masthead ─────────────────────────────────────────── */}
      <header className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <img src="/logo.svg" alt="" width={54} height={54} className="drop-shadow-[0_0_18px_rgba(155,92,255,0.35)]" />
            <div>
              <p className="text-inscribed">VoidLink · Design System</p>
              <p className="font-mono text-[0.65rem] text-bone/35">phase 02 / v0.2.0</p>
            </div>
          </div>

          <h1 className="gold-text font-display text-display font-semibold uppercase leading-[1.05] tracking-[0.1em]">
            The Cosmic Titan
          </h1>
          <p className="mt-3 max-w-xl text-balance text-sm leading-relaxed text-bone/65">
            Obsidian plates, gold hairlines, six power gems. A war-room built inside a dead
            titan — heavy, quiet, cinematic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={forceReduced ? 'primary' : 'metal'}
            onClick={toggleReducedMotion}
            aria-pressed={forceReduced}
          >
            {forceReduced ? 'Motion stilled' : 'Reduce motion'}
          </Button>
          <Button
            size="sm"
            variant={lowPower ? 'primary' : 'metal'}
            onClick={toggleLowPower}
            aria-pressed={lowPower}
          >
            {lowPower ? 'Low power' : 'Full power'}
          </Button>
          <Button size="sm" variant="gold" onClick={() => setModalOpen(true)}>
            Summon modal
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-16">
        {/* ── palette ────────────────────────────────────────── */}
        <Section
          id="palette"
          eyebrow="01 · Chromatic law"
          title="Void, titan and armour"
          description="Purple is energy, gold is civilisation, and the six gems are the only saturated colours in the product. Surfaces are stone; accents are jewellery."
        >
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
            {SURFACES.map((color) => (
              <Swatch key={color.token} {...color} />
            ))}
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
            {ENERGY.map((color) => (
              <Swatch key={color.token} {...color} />
            ))}
          </div>
        </Section>

        {/* ── gems ───────────────────────────────────────────── */}
        <Section
          id="gems"
          eyebrow="02 · Six power gems"
          title="Semantic jewellery"
          description="Each gem is a socketed object with a soft glow, used for one meaning only. The dock maps them to the six surfaces of the product."
        >
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {GEM_KEYS.map((key) => {
              const gem = GEMS[key];
              return (
                <div
                  key={key}
                  className="chamfer-sm flex flex-col items-center gap-2 border border-[color:var(--hairline)] bg-[color:rgba(13,7,21,0.55)] px-2 py-4"
                >
                  <GemIcon gem={key} size={34} active title={gem.label} />
                  <p className="text-xs font-medium text-bone">{gem.label}</p>
                  <p className="text-center text-[0.6rem] leading-tight text-bone/40">{gem.meaning}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" iconLeft={<GemIcon gem="emerald" size={14} />}>
              Call
            </Button>
            <Button size="sm" variant="metal" iconLeft={<GemIcon gem="cyan" size={14} />}>
              Voice note
            </Button>
            <Button size="sm" variant="danger" iconLeft={<GemIcon gem="crimson" size={14} />}>
              Report
            </Button>
            <Button size="sm" variant="ghost" iconLeft={<GemIcon gem="amber" size={14} />}>
              Media
            </Button>
          </div>
        </Section>

        {/* ── typography ─────────────────────────────────────── */}
        <Section
          id="type"
          eyebrow="03 · Inscription"
          title="Cinzel, Space Grotesk, JetBrains Mono"
          description="Wide, engraved headings for names and titles; a geometric UI face for reading; monospace numerals for timestamps, call timers and file sizes."
        >
          <Panel eyebrow="Display" title="The Titan Remembers">
            <div className="space-y-4">
              <p className="gold-text font-display text-2xl uppercase tracking-[0.14em]">
                VoidLink · Est. MMXXVI
              </p>
              <p className="font-display text-lg uppercase tracking-[0.3em] text-bone/70">
                Awaken the link
              </p>
              <p className="max-w-2xl text-sm leading-relaxed text-bone/75">
                Every message is an ember cast into the dark. The UI face is Space Grotesk at
                15px / 1.55, tuned for long reading in low light without the flatness of a
                generic dark theme.
              </p>
              <p className="font-mono text-xs text-bone/45">
                03:41:07 · 12.4 MB · last seen 2 min ago
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[color:var(--hairline)] pt-3 font-mono text-[0.65rem] text-bone/40">
                <span>--text-display: clamp(2rem, 4vw, 3rem)</span>
                <span>--text-sm: 0.8125rem</span>
                <span>--font-display: Cinzel</span>
              </div>
            </div>
          </Panel>
        </Section>

        {/* ── buttons ────────────────────────────────────────── */}
        <Section
          id="buttons"
          eyebrow="04 · Forged controls"
          title="Buttons and fields"
          description="Metal plates with a gold rim and a light sweep. Focus is always gold; the primary action carries a violet aura."
        >
          <Panel className="p-5">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <Button variant="primary">Send message</Button>
                <Button variant="metal">Cancel</Button>
                <Button variant="gold">Accept call</Button>
                <Button variant="danger">Delete for everyone</Button>
                <Button variant="ghost">Not now</Button>
                <Button variant="metal" loading>
                  Uploading
                </Button>
                <Button variant="metal" disabled>
                  Disabled
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button size="sm" variant="metal">
                  Small
                </Button>
                <Button size="md" variant="metal">
                  Medium
                </Button>
                <Button size="lg" variant="metal">
                  Large
                </Button>
              </div>

              <div className="rule-fade" />

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Username"
                  placeholder="titan_of_the_void"
                  hint="3–32 characters, letters, numbers and underscores."
                  icon={<GemIcon gem="azure" size={16} />}
                />
                <Input
                  label="Invite code"
                  placeholder="VL-4F2C-9A10"
                  error="This invite has expired."
                  defaultValue="VL-0000-0000"
                  icon={<GemIcon gem="amber" size={16} />}
                />
              </div>
            </div>
          </Panel>
        </Section>

        {/* ── bubbles ────────────────────────────────────────── */}
        <Section
          id="bubbles"
          eyebrow="05 · Conversation"
          title="Chamfered armour bubbles"
          description="Sent messages carry the titan gradient and a gold edge; received messages are obsidian glass. Corners are cut, never rounded, and the sending edge is chamfered."
        >
          <Panel
            title="Ashka Vorn"
            eyebrow="Direct link"
            actions={
              <div className="flex items-center gap-2">
                <GemIcon gem="emerald" size={16} active />
                <span className="font-mono text-[0.65rem] text-bone/45">online</span>
              </div>
            }
            footer={
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-bone/35">
                  <span className="h-1 w-1 animate-ember-rise rounded-full bg-[color:var(--ember)]" />
                  <span
                    className="h-1 w-1 animate-ember-rise rounded-full bg-[color:var(--ember)]"
                    style={{ animationDelay: '160ms' }}
                  />
                  <span
                    className="h-1 w-1 animate-ember-rise rounded-full bg-[color:var(--ember)]"
                    style={{ animationDelay: '320ms' }}
                  />
                </span>
                <span className="text-xs text-bone/40">Ashka is typing…</span>
              </div>
            }
          >
            <div className="flex flex-col gap-3 py-1">
              <Bubble author="Ashka" time="21:04" status="read">
                The eastern gate is sealed. We hold until the ember tide turns.
              </Bubble>
              <Bubble mine time="21:05" status="read">
                Then we do not fall. I am bringing the sixth gem.
              </Bubble>
              <Bubble
                author="Ashka"
                time="21:05"
                reactions={[
                  { emoji: '🜂', count: 2 },
                  { emoji: '✦', count: 1 },
                ]}
              >
                Good. The monolith answers when all six are socketed.
              </Bubble>
              <Bubble
                mine
                time="21:06"
                status="delivered"
                replyTo={{ author: 'Ashka', body: 'The monolith answers when all six are socketed.' }}
              >
                Then light them.
              </Bubble>
              <Bubble mine time="21:06" status="sending">
                Sending the coordinates now…
              </Bubble>
              <Bubble author="Ashka" time="21:07">
                Received. Two minutes out. Keep the gate burning.
              </Bubble>
            </div>
          </Panel>
        </Section>

        {/* ── avatars + panels ───────────────────────────────── */}
        <Section
          id="avatars"
          eyebrow="06 · Presence"
          title="Hexagonal frames, gem rings"
          description="Avatars are chamfered hexagons ringed by the gem of their role. Presence is a single bead — emerald, amber, crimson — never a badge cloud."
        >
          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
            <Panel title="The six" eyebrow="Participants">
              <div className="flex flex-wrap items-end gap-5">
                <div className="flex flex-col items-center gap-2">
                  <Avatar name="Ashka Vorn" presence="online" gem="violet" size="xl" />
                  <span className="font-mono text-[0.6rem] text-bone/40">xl · violet</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar name="Rune Kael" presence="away" gem="azure" size="lg" />
                  <span className="font-mono text-[0.6rem] text-bone/40">lg · azure</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar name="Sable Orr" presence="online" gem="emerald" size="md" />
                  <span className="font-mono text-[0.6rem] text-bone/40">md</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar name="Tov Marn" presence="dnd" gem="amber" size="md" />
                  <span className="font-mono text-[0.6rem] text-bone/40">dnd</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar name="Ilsa Vehn" presence="offline" gem="cyan" size="sm" />
                  <span className="font-mono text-[0.6rem] text-bone/40">sm</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar name="Cyr" gem="crimson" presence="away" size="xs" />
                  <span className="font-mono text-[0.6rem] text-bone/40">xs</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button size="sm" variant="metal" iconLeft={<GemIcon gem="violet" size={13} />}>
                  Audio call
                </Button>
                <Button size="sm" variant="metal" iconLeft={<GemIcon gem="amber" size={13} />}>
                  Share media
                </Button>
                <Button size="sm" variant="ghost">
                  View profile
                </Button>
              </div>
            </Panel>

            <Panel
              variant="heavy"
              eyebrow="Pinned"
              title="The sixth gem"
              footer="Pinned by Ashka · 21:05"
              actions={<GemIcon gem="amber" size={18} active />}
            >
              <p className="text-sm leading-relaxed text-bone/75">
                “The monolith answers when all six are socketed.”
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-2/3 bg-gold" />
                </div>
                <span className="font-mono text-[0.6rem] text-bone/40">4 / 6 gems</span>
              </div>
            </Panel>
          </div>
        </Section>

        {/* ── atmosphere ─────────────────────────────────────── */}
        <Section
          id="atmosphere"
          eyebrow="07 · Atmosphere"
          title="Nebula, monolith, cursor light"
          description="A 5-octave fbm nebula renders on a single full-screen plane (lazy-loaded Three.js), under a colossal original monolith silhouette. Low power drops the shader, blur and grain; reduced motion stills the drift."
        >
          <Panel className="p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-bone/50">
                  Active layers
                </p>
                <ul className="space-y-1.5 text-sm text-bone/70">
                  <li className="flex items-center gap-2">
                    <GemIcon gem="violet" size={12} active /> WebGL nebula (5-octave fbm)
                  </li>
                  <li className="flex items-center gap-2">
                    <GemIcon gem="azure" size={12} active /> 360-point parallax star field
                  </li>
                  <li className="flex items-center gap-2">
                    <GemIcon gem="emerald" size={12} active /> Titan monolith vector art
                  </li>
                  <li className="flex items-center gap-2">
                    <GemIcon gem="amber" size={12} active /> Cursor aura · film grain
                  </li>
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-bone/50">
                  Fallback ladder
                </p>
                <p className="text-sm leading-relaxed text-bone/60">
                  No WebGL, &lt; 4 cores, low power or reduced motion → static CSS nebula with
                  deterministic stars. No layout shift, no jank, no empty background.
                </p>
                <p className="mt-3 font-mono text-[0.65rem] text-bone/35">
                  mode: {lowPower ? 'low-power' : forceReduced ? 'reduced-motion' : 'full'}
                </p>
              </div>
            </div>
          </Panel>
        </Section>

        {/* ── dock note ──────────────────────────────────────── */}
        <Section
          id="dock"
          eyebrow="08 · Gem dock"
          title="Six sockets, six destinations"
          description="Fixed right on desktop, bottom on mobile. The active gem brightens and sheds particles; arrow keys move roving focus. Try it — it is live on this page."
        >
          <div className="chamfer flex flex-wrap gap-x-6 gap-y-2 border border-[color:var(--hairline)] bg-[color:rgba(13,7,21,0.5)] px-5 py-4 font-mono text-[0.65rem] text-bone/40">
            <span>chats → azure</span>
            <span>calls → violet</span>
            <span>status → emerald</span>
            <span>media → amber</span>
            <span>contacts → crimson</span>
            <span>settings → gold</span>
          </div>
        </Section>
      </div>

      <footer className="mt-16 border-t border-[color:var(--hairline)] pt-5 font-mono text-[0.65rem] text-bone/30">
        VoidLink design system · tokens live in src/styles/tokens.css · Tailwind mirrors every
        value
      </footer>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        eyebrow="Portal"
        title="Summoning ritual"
        description="Modals ride a cosmic portal: blurred violet bloom behind a chamfered obsidian plate. Focus is trapped, Esc closes."
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setModalOpen(false)}>
              Withdraw
            </Button>
            <Button size="sm" variant="primary" onClick={() => setModalOpen(false)}>
              Enter the void
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Sigil name" placeholder="Sixth gem" />
          <Input label="Ward phrase" placeholder="••••••••••" type="password" />
          <p className="text-xs leading-relaxed text-bone/40">
            The modal closes on Esc, on backdrop click and on either footer action. Body scroll is
            locked while it is open and focus returns to the trigger.
          </p>
        </div>
      </Modal>
    </div>
  );
}
