import { useEffect, useRef } from 'react';
import { decode } from 'blurhash';
import { cn } from '../../../lib/cn';

/** Decodes the tiny blurhash into a 32px canvas stretched behind the image. */
export function Blurhash({ hash, className }: { hash: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    try {
      const pixels = decode(hash, 32, 32);
      const image = context.createImageData(32, 32);
      image.data.set(pixels);
      context.putImageData(image, 0, 0);
    } catch {
      // A malformed hash should never break the message.
    }
  }, [hash]);

  return (
    <canvas
      ref={canvasRef}
      width={32}
      height={32}
      aria-hidden
      className={cn('absolute inset-0 h-full w-full scale-105 blur-[2px]', className)}
    />
  );
}
