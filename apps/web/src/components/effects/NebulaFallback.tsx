import { useMemo } from 'react';

/** Deterministic star field so the fallback never flickers between renders. */
function buildStars(count: number) {
  let seed = 1337;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  return Array.from({ length: count }, () => ({
    x: next() * 100,
    y: next() * 100,
    size: 0.6 + next() * 1.4,
    opacity: 0.15 + next() * 0.55,
    delay: next() * 6,
  }));
}

export function NebulaFallback() {
  const stars = useMemo(() => buildStars(90), []);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* base void */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,#120A20_0%,#0A0512_45%,#05030A_100%)]" />

      {/* nebula clouds */}
      <div
        className="absolute -left-[20%] -top-[15%] h-[75vh] w-[85vw] rounded-full opacity-70 blur-[110px]"
        style={{
          background:
            'radial-gradient(circle at 40% 40%, rgba(75,29,122,0.45), rgba(42,15,69,0.18) 55%, transparent 72%)',
        }}
      />
      <div
        className="absolute -right-[25%] top-[18%] h-[65vh] w-[70vw] rounded-full opacity-50 blur-[130px]"
        style={{
          background:
            'radial-gradient(circle at 60% 50%, rgba(138,110,20,0.28), rgba(201,162,39,0.08) 50%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-[-30%] left-[15%] h-[60vh] w-[70vw] rounded-full opacity-60 blur-[130px]"
        style={{
          background:
            'radial-gradient(circle at 50% 60%, rgba(43,15,69,0.5), transparent 68%)',
        }}
      />

      {/* stars */}
      <div className="absolute inset-0">
        {stars.map((star, index) => (
          <span
            key={index}
            className="absolute rounded-full bg-[color:var(--bone)]"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animation: `aura-pulse ${5 + star.delay}s ease-in-out ${star.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* deep-space vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(100%_100%_at_50%_50%,transparent_35%,rgba(5,3,10,0.75)_100%)]" />
    </div>
  );
}
