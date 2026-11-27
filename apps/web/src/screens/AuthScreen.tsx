import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { GemIcon } from '../components/ui/GemIcon';
import { Input } from '../components/ui/Input';
import { Panel } from '../components/ui/Panel';
import { GEMS } from '../lib/gems';
import { useAuthStore } from '../store/auth';

type Mode = 'login' | 'register';

const DEMO = [
  { name: 'Ashka Vorn', gem: 'violet' as const, username: 'ashka' },
  { name: 'Rune Kael', gem: 'azure' as const, username: 'rune' },
  { name: 'Sable Orr', gem: 'emerald' as const, username: 'sable' },
];

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const pending = useAuthStore((state) => state.pending);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'login') await login(identifier, password);
    else await register({ username, displayName, email, password });
  };

  const switchMode = (next: Mode) => {
    clearError();
    setMode(next);
  };

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl items-center px-5 py-12 md:px-8">
      <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        {/* ── masthead ─────────────────────────────────────── */}
        <div className="max-w-xl">
          <div className="mb-6 flex items-center gap-4">
            <img
              src="/logo.svg"
              alt="VoidLink crest"
              width={66}
              height={66}
              className="drop-shadow-[0_0_24px_rgba(155,92,255,0.35)]"
            />
            <div>
              <p className="text-inscribed">Real-time · cosmic war-room</p>
              <p className="font-mono text-[0.65rem] text-bone/35">v0.3 · the link awakens</p>
            </div>
          </div>

          <h1 className="gold-text font-display text-display font-semibold uppercase leading-[1.02] tracking-[0.08em]">
            Speak across
            <br />
            the void
          </h1>

          <p className="mt-5 max-w-md text-balance text-sm leading-relaxed text-bone/65">
            Messages travel on embers. Presence is a bead of light. Six gems guard the chambers
            of the interface. Sign in and take your seat in the war-room.
          </p>

          <div className="mt-8 hidden gap-3 sm:flex">
            {DEMO.map((person) => (
              <button
                key={person.username}
                type="button"
                onClick={() => {
                  setMode('login');
                  setIdentifier(person.username);
                  setPassword('voidlink-dev');
                }}
                className="group flex items-center gap-2.5 rounded-[3px] border border-[color:var(--hairline)] bg-[color:rgba(13,7,21,0.55)] px-3 py-2 text-left transition-colors hover:border-[color:var(--titan-gold-500)]/60"
              >
                <Avatar name={person.name} gem={person.gem} size="sm" presence="online" />
                <span>
                  <span className="block text-xs text-bone/80">{person.name}</span>
                  <span className="block font-mono text-[0.6rem] text-bone/35">
                    @{person.username}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-[0.6rem] text-bone/25">
            demo accounts are seeded with the password voidlink-dev
          </p>
        </div>

        {/* ── form ─────────────────────────────────────────── */}
        <Panel variant="heavy" className="w-full">
          <div className="p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-inscribed">{mode === 'login' ? 'Return to the gate' : 'Forge a new sigil'}</p>
                <h2 className="mt-1 font-display text-xl tracking-[0.08em] text-bone">
                  {mode === 'login' ? 'Enter VoidLink' : 'Take your seat'}
                </h2>
              </div>
              <GemIcon gem={mode === 'login' ? 'violet' : 'gold'} size={34} active socket />
            </div>

            <div className="mb-5 grid grid-cols-2 gap-1 border border-[color:var(--hairline)] p-1">
              {(['login', 'register'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => switchMode(option)}
                  className={`h-8 text-xs uppercase tracking-[0.16em] transition-colors ${
                    mode === option
                      ? 'bg-[color:rgba(123,47,190,0.28)] text-bone shadow-[inset_0_0_0_1px_rgba(201,162,39,0.35)]'
                      : 'text-bone/45 hover:text-bone/75'
                  }`}
                >
                  {option === 'login' ? 'Sign in' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  {mode === 'login' ? (
                    <>
                      <Input
                        label="Sigil or email"
                        placeholder="ashka"
                        autoComplete="username"
                        value={identifier}
                        onChange={(event) => setIdentifier(event.target.value)}
                        icon={<GemIcon gem="azure" size={15} />}
                        required
                      />
                      <Input
                        label="Ward phrase"
                        type="password"
                        placeholder="••••••••••••"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        icon={<GemIcon gem="violet" size={15} />}
                        required
                      />
                    </>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          label="Sigil"
                          placeholder="new_titan"
                          autoComplete="username"
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          hint="3–32 letters, numbers, underscores"
                          required
                        />
                        <Input
                          label="Display name"
                          placeholder="Ashka Vorn"
                          value={displayName}
                          onChange={(event) => setDisplayName(event.target.value)}
                          required
                        />
                      </div>
                      <Input
                        label="Email"
                        type="email"
                        placeholder="you@voidlink.app"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                      <Input
                        label="Ward phrase"
                        type="password"
                        placeholder="at least 10 characters"
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        hint="10–128 characters. Hashed with Argon2id."
                        required
                      />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {error ? (
                <div
                  role="alert"
                  className="border border-[color:rgba(255,90,31,0.45)] bg-[color:rgba(255,90,31,0.08)] px-3 py-2 text-xs text-[color:var(--ember)]"
                >
                  {error}
                </div>
              ) : null}

              <Button type="submit" variant="primary" size="lg" block loading={pending}>
                {mode === 'login' ? 'Open the gate' : 'Bind the sigil'}
              </Button>

              <p className="text-center text-[0.65rem] leading-relaxed text-bone/30">
                Sessions rotate on every refresh. Your password never leaves the server in
                plaintext — Argon2id at rest, JWT in flight.
              </p>
            </form>
          </div>
        </Panel>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 hidden items-center gap-2 md:flex">
        <span className="h-1 w-1 rounded-full" style={{ background: GEMS.emerald.base }} />
        <span className="font-mono text-[0.6rem] text-bone/25">api · socket.io · postgres</span>
      </div>
    </div>
  );
}
