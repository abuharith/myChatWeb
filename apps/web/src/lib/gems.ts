export const GEM_KEYS = ['violet', 'azure', 'emerald', 'amber', 'crimson', 'cyan'] as const;
export type GemKey = (typeof GEM_KEYS)[number];
export type GemTone = GemKey | 'gold';

export interface GemDefinition {
  key: GemTone;
  label: string;
  cssVar: string;
  glowVar: string;
  base: string;
  light: string;
  deep: string;
  meaning: string;
}

export const GEMS: Record<GemTone, GemDefinition> = {
  violet: {
    key: 'violet',
    label: 'Violet',
    cssVar: 'var(--gem-violet)',
    glowVar: 'var(--gem-violet-glow)',
    base: '#9b5cff',
    light: '#d7bcff',
    deep: '#4c1d95',
    meaning: 'Calls · primary action',
  },
  azure: {
    key: 'azure',
    label: 'Azure',
    cssVar: 'var(--gem-azure)',
    glowVar: 'var(--gem-azure-glow)',
    base: '#3fa9ff',
    light: '#b9e2ff',
    deep: '#0b4d80',
    meaning: 'Messages',
  },
  emerald: {
    key: 'emerald',
    label: 'Emerald',
    cssVar: 'var(--gem-emerald)',
    glowVar: 'var(--gem-emerald-glow)',
    base: '#2fd39b',
    light: '#b6ffe4',
    deep: '#0b5c42',
    meaning: 'Online · success',
  },
  amber: {
    key: 'amber',
    label: 'Amber',
    cssVar: 'var(--gem-amber)',
    glowVar: 'var(--gem-amber-glow)',
    base: '#ffb63d',
    light: '#ffe4b3',
    deep: '#7a4a06',
    meaning: 'Media · uploads',
  },
  crimson: {
    key: 'crimson',
    label: 'Crimson',
    cssVar: 'var(--gem-crimson)',
    glowVar: 'var(--gem-crimson-glow)',
    base: '#ff4d6d',
    light: '#ffc2cd',
    deep: '#7a0c22',
    meaning: 'Alerts · danger',
  },
  cyan: {
    key: 'cyan',
    label: 'Cyan',
    cssVar: 'var(--gem-cyan)',
    glowVar: 'var(--gem-cyan-glow)',
    base: '#3fe0e0',
    light: '#c2ffff',
    deep: '#0a5f63',
    meaning: 'Voice messages',
  },
  gold: {
    key: 'gold',
    label: 'Armour Gold',
    cssVar: 'var(--titan-gold-500)',
    glowVar: 'var(--gold-soft, rgba(242,212,114,.35))',
    base: '#c9a227',
    light: '#f7e6a8',
    deep: '#5e4a0c',
    meaning: 'Structure · creed',
  },
};

/** Hex values for canvas/SVG contexts that cannot read CSS variables cheaply. */
export const GEM_HEX: Record<GemTone, { base: string; light: string; deep: string }> = {
  violet: { base: '#9b5cff', light: '#d7bcff', deep: '#4c1d95' },
  azure: { base: '#3fa9ff', light: '#b9e2ff', deep: '#0b4d80' },
  emerald: { base: '#2fd39b', light: '#b6ffe4', deep: '#0b5c42' },
  amber: { base: '#ffb63d', light: '#ffe4b3', deep: '#7a4a06' },
  crimson: { base: '#ff4d6d', light: '#ffc2cd', deep: '#7a0c22' },
  cyan: { base: '#3fe0e0', light: '#c2ffff', deep: '#0a5f63' },
  gold: { base: '#c9a227', light: '#f7e6a8', deep: '#5e4a0c' },
};
