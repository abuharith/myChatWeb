import { Suspense, lazy, useEffect, useState } from 'react';
import { NebulaFallback } from './NebulaFallback';
import { TitanMonolith } from './TitanMonolith';
import { CursorAura } from './CursorAura';
import { useEffectiveReducedMotion, useUiStore } from '../../store/ui';

const NebulaScene = lazy(() => import('./NebulaScene'));

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Atmosphere stack:
 *   CSS nebula (always, cheap) → lazy WebGL nebula when allowed → monolith art →
 *   cursor aura → film grain. Low-power mode keeps only the CSS layer.
 */
export function BackgroundScene() {
  const lowPower = useUiStore((state) => state.lowPower);
  const reducedMotion = useEffectiveReducedMotion();
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    const cores = navigator.hardwareConcurrency ?? 8;
    setWebgl(supportsWebGL() && cores >= 4);
  }, []);

  const showScene = webgl && !lowPower && !reducedMotion;

  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden">
      <NebulaFallback />

      {showScene ? (
        <div className="absolute inset-0 opacity-90">
          <Suspense fallback={null}>
            <NebulaScene />
          </Suspense>
        </div>
      ) : null}

      <TitanMonolith />
      <CursorAura />
      <div className="grain-layer absolute inset-0 z-20" />
    </div>
  );
}
