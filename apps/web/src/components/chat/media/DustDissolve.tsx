import { useEffect, useRef } from 'react';

/**
 * The Dust Dissolve: media that has been burned collapses into gold and violet
 * motes. It is decorative, so reduced-motion users get a short fade instead.
 */
export function DustDissolve({ active, onDone }: { active: boolean; onDone?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!active) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      const timeout = window.setTimeout(() => onDoneRef.current?.(), 220);
      return () => window.clearTimeout(timeout);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    context.scale(ratio, ratio);

    const colors = ['#f2d472', '#c9a227', '#9b5cff', '#e8d9ff', '#ff6b3d'];
    const particles = Array.from({ length: 120 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 3.4;
      return {
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 90,
        y: window.innerHeight / 2 + (Math.random() - 0.5) * 90,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.1,
        size: 0.8 + Math.random() * 2.6,
        life: 0.7 + Math.random() * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)]!,
      };
    });

    let raf = 0;
    const started = performance.now();

    const draw = (now: number) => {
      const elapsed = now - started;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.035;
        particle.vx *= 0.992;
        const alpha = Math.max(0, 1 - elapsed / (1100 * particle.life));
        context.globalAlpha = alpha;
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      if (elapsed < 1100) {
        raf = requestAnimationFrame(draw);
      } else {
        onDoneRef.current?.();
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      data-testid="dust-dissolve"
      className="pointer-events-none fixed inset-0 z-[120] h-full w-full"
    />
  );
}
