import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../lib/cn';
import { DustDissolve } from './DustDissolve';

export interface LightboxItem {
  url: string;
  kind: 'IMAGE' | 'VIDEO';
  viewOnce: boolean;
}

export function Lightbox({
  item,
  onClose,
  onBurn,
}: {
  item: LightboxItem | null;
  onClose: () => void;
  onBurn?: () => void;
}) {
  const [burning, setBurning] = useState(false);
  const [zoom, setZoom] = useState(false);
  const closeRef = useRef<() => void>(() => {});

  const close = useCallback(() => {
    if (!item || burning) return;
    if (item.viewOnce) {
      setBurning(true);
      onBurn?.();
      return;
    }
    onClose();
  }, [item, burning, onBurn, onClose]);

  closeRef.current = close;

  // Keyed to the item only: re-running on every render would cancel the burn.
  useEffect(() => {
    if (!item) return;
    setBurning(false);
    setZoom(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [item]);

  const finishBurn = useCallback(() => {
    setBurning(false);
    onClose();
  }, [onClose]);

  if (!item && !burning) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(3,2,6,0.94)]"
    >
      {item && !burning ? (
        <>
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 py-3">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-bone/40">
              {item.viewOnce ? 'view once · closes for good' : item.kind === 'IMAGE' ? 'photo' : 'video'}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={item.url}
                download
                aria-label="Download media"
                className="flex h-9 w-9 items-center justify-center border border-[color:var(--hairline)] text-bone/60 transition-colors hover:text-[color:var(--titan-gold-300)]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <button
                type="button"
                onClick={close}
                aria-label="Close media"
                className="flex h-9 w-9 items-center justify-center border border-[color:var(--hairline)] text-bone/60 transition-colors hover:text-[color:var(--titan-gold-300)]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {item.kind === 'IMAGE' ? (
            <img
              src={item.url}
              alt="Shared media"
              onClick={() => setZoom((value) => !value)}
              className={cn(
                'max-h-[82vh] max-w-[94vw] cursor-zoom-in object-contain transition-transform duration-300',
                zoom && 'scale-[1.8] cursor-zoom-out',
              )}
            />
          ) : (
            <video
              src={item.url}
              controls
              autoPlay
              playsInline
              className="max-h-[82vh] max-w-[94vw] object-contain"
            />
          )}
        </>
      ) : null}

      <DustDissolve active={burning} onDone={finishBurn} />
    </div>,
    document.body,
  );
}
