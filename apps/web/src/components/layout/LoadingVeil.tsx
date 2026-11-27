import { motion } from 'framer-motion';
import { GEM_KEYS, GEMS } from '../../lib/gems';
import { GemIcon } from '../ui/GemIcon';

/** Six gems assemble into a socketed ring, then the app opens. */
export function LoadingVeil() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8">
      <div className="relative h-40 w-40">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full opacity-60 blur-2xl"
          style={{
            background:
              'radial-gradient(circle, rgba(155,92,255,0.35), rgba(201,162,39,0.12) 55%, transparent 70%)',
          }}
        />
        {GEM_KEYS.map((gem, index) => {
          const angle = (index / GEM_KEYS.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 58;
          return (
            <motion.div
              key={gem}
              className="absolute left-1/2 top-1/2"
              initial={{ opacity: 0, scale: 0.4, x: -12, y: -12 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: Math.cos(angle) * radius - 12,
                y: Math.sin(angle) * radius - 12,
              }}
              transition={{
                delay: 0.12 * index,
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{ filter: `drop-shadow(0 0 8px ${GEMS[gem].base}55)` }}
            >
              <GemIcon gem={gem} size={26} active />
            </motion.div>
          );
        })}
        <motion.div
          className="absolute inset-0 rounded-full border border-[color:var(--hairline)]"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="text-center">
        <p className="gold-text font-display text-lg uppercase tracking-[0.3em]">VoidLink</p>
        <p className="mt-2 text-inscribed">socketing the six gems</p>
      </div>
    </div>
  );
}
