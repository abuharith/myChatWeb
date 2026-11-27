# VoidLink — Design Tokens ("The Cosmic Titan")

Every token exists as a CSS custom property and a Tailwind theme key, so "theme
intensity", "low power mode" and `prefers-reduced-motion` can retune the product at
runtime without a rebuild.

---

## 1. Colour

### Void scale (surfaces)
| Token | Hex | Use |
| --- | --- | --- |
| `--void-black` | `#05030A` | app backdrop |
| `--abyss` | `#0D0715` | sidebar / panels |
| `--obsidian` | `#141020` | raised panels, received bubbles |
| `--basalt` | `#1C1729` | inputs, hover surfaces |
| `--slag` | `#2A2338` | dividers on glass, disabled fills |

### Titan purple (energy)
| Token | Hex | Use |
| --- | --- | --- |
| `--titan-purple-900` | `#2A0F45` | deep gradient stop |
| `--titan-purple-700` | `#4B1D7A` | primary gradient start |
| `--titan-purple-500` | `#7B2FBE` | primary gradient end, focus bloom |
| `--titan-purple-300` | `#A768E8` | hover light, icons on dark |

### Armour gold (civilisation)
| Token | Hex | Use |
| --- | --- | --- |
| `--titan-gold-700` | `#8A6E14` | pressed states, hairlines on light glass |
| `--titan-gold-500` | `#C9A227` | borders, active gem socket |
| `--titan-gold-300` | `#F2D472` | titles, sweep highlight, focus ring |

### Semantic
| Token | Hex | Use |
| --- | --- | --- |
| `--ember` | `#FF5A1F` | destructive, missed calls, recording dot |
| `--ash` | `#8C8599` | secondary text (AA on `--abyss` at 14px+) |
| `--bone` | `#EDE7F6` | primary text |
| `--bone-dim` | `rgba(237,231,246,.62)` | tertiary text, timestamps |

### Six Power Gems (only saturated full-chroma colours in the product)
| Gem | Token | Hex | Semantic slot |
| --- | --- | --- | --- |
| Violet | `--gem-violet` | `#9B5CFF` | calls, primary action aura |
| Azure | `--gem-azure` | `#3FA9FF` | messages, links |
| Emerald | `--gem-emerald` | `#2FD39B` | online, success, connected |
| Amber | `--gem-amber` | `#FFB63D` | media, uploads, pinned |
| Crimson | `--gem-crimson` | `#FF4D6D` | alerts, reports, blocked |
| Cyan | `--gem-cyan` | `#3FE0E0` | voice messages, recording |

Each gem ships as `--gem-{name}` plus `--gem-{name}-glow: color-mix(in oklab, var(--gem-{name}) 55%, transparent)`.
Gem rings on avatars: `box-shadow: 0 0 0 1px var(--gem-x), 0 0 18px -4px var(--gem-x-glow)`.

### Structure
```css
--hairline:        rgba(201, 162, 39, 0.18);
--hairline-strong: rgba(201, 162, 39, 0.34);
--hairline-inner:  rgba(237, 231, 246, 0.06);
--glass:           rgba(20, 16, 32, 0.62);
--glass-heavy:     rgba(13, 7, 21, 0.86);
--blur-panel:      18px;
--noise-opacity:   0.035;
--inner-glow:      inset 0 1px 0 rgba(237,231,246,0.06);
```

### Gradients
```css
--grad-titan:   linear-gradient(135deg, var(--titan-purple-700), var(--titan-purple-500) 62%, #9A47D6);
--grad-gold:    linear-gradient(100deg, #8A6E14, var(--titan-gold-300) 46%, #C9A227 78%, #F7E6A8);
--grad-gold-text: linear-gradient(92deg, #F7E6A8 0%, var(--titan-gold-300) 38%, #C9A227 68%, #F7E6A8 100%);
--grad-obsidian: linear-gradient(180deg, rgba(20,16,32,.92), rgba(5,3,10,.96));
--grad-ember:   linear-gradient(135deg, #FF5A1F, #FF2D55);
```

---

## 2. Typography

| Role | Family | Weights | Tracking |
| --- | --- | --- | --- |
| Display / titles | **Cinzel** (fallback `Cormorant SC`, serif) | 500–700 | `0.14em` uppercase for labels, `0.06em` for headlines |
| UI / body | **Space Grotesk** (fallback Inter) | 400/500/600 | `0` body, `0.02em` buttons |
| Numerals / timers | **JetBrains Mono** | 400/500 | `0.04em`, `tabular-nums` |

All three are SIL Open Font License; self-hosted WOFF2 in `apps/web/public/fonts`
(`font-display: swap`, `unicode-range` latin subset only for first paint).

```css
--font-display: "Cinzel", "Cormorant SC", ui-serif, Georgia, serif;
--font-ui:      "Space Grotesk", Inter, ui-sans-serif, system-ui, sans-serif;
--font-mono:    "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
```

### Scale (1.25 ratio, clamped)
| Token | Size | Line-height | Use |
| --- | --- | --- | --- |
| `--text-xs` | `0.75rem` | 1.35 | timestamps, meta |
| `--text-sm` | `0.8125rem` | 1.45 | message body, list previews |
| `--text-base` | `0.9375rem` | 1.55 | inputs, body |
| `--text-lg` | `1.125rem` | 1.4 | panel titles |
| `--text-xl` | `1.375rem` | 1.3 | screen titles |
| `--text-2xl` | `1.75rem` | 1.2 | section headers |
| `--text-display` | `clamp(2rem, 4vw, 3rem)` | 1.05 | auth headline |

Gold gradient text utility:
```css
.text-gold {
  background: var(--grad-gold-text);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  letter-spacing: .06em;
}
```

---

## 3. Space, radius, chamfer

- Spacing scale: 4px base — `--space-1..12` = 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.
- Debossed 0.5px inset on every panel top edge; 1px hairline all around.
- **No border-radius above 6px** except avatars (hexagon) and the gem sockets (circle).
- Chamfer recipes:
```css
/* armour plate — panels, modals */
--chamfer-sm: 8px;  --chamfer-md: 12px;  --chamfer-lg: 18px;
clip-path: polygon(var(--chamfer-md) 0, 100% 0, 100% calc(100% - var(--chamfer-md)),
                   calc(100% - var(--chamfer-md)) 100%, 0 100%, 0 var(--chamfer-md));
/* sent bubble: chamfer the top-right (sending) corner only */
clip-path: polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%);
```
Hexagonal avatar:
```css
clip-path: polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%);
```

---

## 4. Elevation & light

| Token | Shadow |
| --- | --- |
| `--shadow-sink` | `inset 0 2px 10px rgba(0,0,0,.55)` |
| `--shadow-plate` | `0 18px 44px -20px rgba(0,0,0,.9), 0 2px 8px rgba(0,0,0,.5)` |
| `--shadow-gem` | `0 0 0 1px var(--hairline), 0 12px 30px -14px rgba(155,92,255,.55)` |
| `--glow-violet` | `0 0 24px -4px rgba(123,47,190,.7), 0 0 60px -18px rgba(155,92,255,.55)` |
| `--glow-gold` | `0 0 18px -6px rgba(242,212,114,.6)` |
| `--focus-ring` | `0 0 0 2px var(--void-black), 0 0 0 4px var(--titan-gold-500), 0 0 22px -6px var(--titan-gold-300)` |

Light sweeps: `linear-gradient(105deg, transparent 35%, rgba(242,212,114,.22) 50%, transparent 65%)`
translated `-120% → 120%` over 620ms on hover/focus of forged-metal buttons.

---

## 5. Motion

```css
--ease-inertia:  cubic-bezier(.16, 1, .3, 1);     /* entrances */
--ease-collapse: cubic-bezier(.7, 0, .84, 0);     /* exits */
--ease-emphasis: cubic-bezier(.34, 1.56, .64, 1); /* gem ignite only, never >1.06 scale */
--dur-instant: 90ms;
--dur-fast:    140ms;
--dur-base:    260ms;
--dur-slow:    520ms;
--dur-dissolve: 1200ms;
--dur-portal:  900ms;
--stagger-gem: 110ms;
```

| Signature | Spec | Reduced motion |
| --- | --- | --- |
| Gem Ignite | gem socket flash 260ms + 1.5px edge ripple travelling the viewport perimeter 700ms | single 120ms outline flash |
| Dust Dissolve | canvas particles, 260 target particles, 1.2s, upward drift 40–120px, gold→ember palette | 180ms opacity fade |
| Call Summon | radial portal swirl 900ms (`--ease-inertia`), ring pulse 1.1s ×∞, collapse into video 520ms | fade + instant layout |
| Typing Embers | 3 embers, 1.4s loop, staggered 160ms, rise 10px, fade 0→1→0 | static "typing" text |
| Void Wipe | radial mask reveals from pointer origin, 420ms | 160ms crossfade |
| Loading | 6 gems assemble into socketed ring, 110ms stagger, then 400ms settle | static ring + fade |
| Nebula | 60s drift loop, parallax 0.02 × pointer | frozen gradient |
| Cursor Aura | 420px radial violet-gold bloom, lerp 0.12 | disabled |

Rules: never animate `width`/`height`/`top`/`left`; transform & opacity only. Nothing
scales above 1.06. All loops pause when `document.hidden` or tab not focused.

---

## 6. Component tokens

```css
/* Buttons — forged metal */
--btn-bg: linear-gradient(180deg, #241C34, #15101F);
--btn-bg-primary: var(--grad-titan);
--btn-rim: 1px solid rgba(201,162,39,.34);
--btn-h: 40px; --btn-h-sm: 32px; --btn-h-lg: 48px;
--btn-font: 500 var(--text-sm)/1 var(--font-ui); letter-spacing: .04em;

/* Bubbles */
--bubble-sent: var(--grad-titan);
--bubble-received: rgba(20,16,32,.72);
--bubble-edge: 1px solid rgba(201,162,39,.16);
--bubble-max: min(68ch, 72%);

/* Composer */
--composer-bg: rgba(13,7,21,.82);
--composer-focus: var(--hairline-strong);

/* Gem Dock */
--dock-socket: radial-gradient(circle at 30% 25%, #2A2338, #0B0713 70%);
--dock-gem-size: 22px;
--dock-active-glow: 0 0 22px -2px var(--gem-x);
```

Contrast: body text `--bone` on `--abyss` = 15.2:1; `--ash` on `--abyss` = 5.4:1 (AA);
gold `--titan-gold-300` on `--obsidian` = 11.8:1. Gem colours are used for accents, icons
and ≥16px semibold labels, never for paragraph text.

---

## 7. Sound tokens

| Cue | File | Character |
| --- | --- | --- |
| send | `send-thud.ogg` | 48 Hz sine + noise transient, 180ms, −18 dBFS |
| receive | `receive-chime.ogg` | struck crystal, 2.4 kHz + 3.6 kHz partials, 900ms decay |
| call ring | `call-summon.ogg` | rising harmonic swell, 2.4s loop, 88 Hz fundamental |
| dissolve | `dust-whoosh.ogg` | filtered noise sweep 1.2 kHz → 200 Hz, 900ms |
| error | `ember-deny.ogg` | 120 Hz square, 90ms, gentle |
| connect | `gem-lock.ogg` | two-note fifth, 220 → 330 Hz, 400ms |

Master bus −18 LUFS, limiter at −1 dBTP, sounds debounced 40ms to avoid stacking.
