import { create } from 'zustand';
import { usePrefersReducedMotion } from '../hooks/useReducedMotion';

interface UiState {
  lowPower: boolean;
  forceReducedMotion: boolean;
  toggleLowPower: () => void;
  toggleReducedMotion: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  lowPower: false,
  forceReducedMotion: false,
  toggleLowPower: () => set((state) => ({ lowPower: !state.lowPower })),
  toggleReducedMotion: () =>
    set((state) => ({ forceReducedMotion: !state.forceReducedMotion })),
}));

/**
 * Single source of truth for motion: OS preference OR the in-app switch.
 * Every effect reads this, so one toggle stills the whole product.
 */
export function useEffectiveReducedMotion(): boolean {
  const prefers = usePrefersReducedMotion();
  const forced = useUiStore((state) => state.forceReducedMotion);
  return prefers || forced;
}
