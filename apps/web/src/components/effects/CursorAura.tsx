import { useEffect, useRef } from 'react';
import { useEffectiveReducedMotion } from '../../store/ui';

/** Soft violet-gold light that trails the cursor. Skipped on touch and reduced motion. */
export function CursorAura() {
  const auraRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useEffectiveReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight * 0.35;
    let currentX = targetX;
    let currentY = targetY;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
    };

    const render = () => {
      currentX += (targetX - currentX) * 0.09;
      currentY += (targetY - currentY) * 0.09;
      const node = auraRef.current;
      if (node) {
        node.style.transform = `translate3d(${currentX - 240}px, ${currentY - 240}px, 0)`;
      }
      frame = window.requestAnimationFrame(render);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    frame = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        ref={auraRef}
        className="absolute h-[480px] w-[480px] will-change-transform"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(123,47,190,0.13) 0%, rgba(201,162,39,0.06) 38%, transparent 68%)',
        }}
      />
    </div>
  );
}
