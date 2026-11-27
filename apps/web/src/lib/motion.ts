import type { Transition, Variants } from 'framer-motion';

/** Heavy, inevitable motion — the titan waking, not a consumer app. */
export const EASE_INERTIA = [0.16, 1, 0.3, 1] as const;
export const EASE_COLLAPSE = [0.7, 0, 0.84, 0] as const;

export const transitionBase: Transition = {
  duration: 0.26,
  ease: EASE_INERTIA,
};

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: transitionBase },
  exit: { opacity: 0, y: 6, transition: { duration: 0.18, ease: EASE_COLLAPSE } },
};

export const portalIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.52, ease: EASE_INERTIA },
  },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.22, ease: EASE_COLLAPSE } },
};

export const dustDissolve: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, filter: 'blur(6px)', transition: { duration: 1.2, ease: EASE_COLLAPSE } },
};
