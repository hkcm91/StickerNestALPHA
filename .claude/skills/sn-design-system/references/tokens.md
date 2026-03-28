# Design Token Reference — Obsidian Edition

## Color Tokens

### Backgrounds (60%)

| Token | Dark | Light | Purpose |
|-------|------|-------|---------|
| `--sn-bg` | `#0C0C10` | `#F5F2ED` | App background |
| `--sn-bg-ground` | `#08080B` | `#EBE7E0` | Canvas ground layer |

Dark backgrounds use warm charcoal with slight purple undertone — never pure black.
Light backgrounds use warm cream — never pure white (#FFF).

### Surfaces (30%)

| Token | Dark | Light | Purpose |
|-------|------|-------|---------|
| `--sn-surface` | `rgba(22,22,28,0.72)` | `rgba(255,254,250,0.72)` | Default glass |
| `--sn-surface-raised` | `#1A1A22` | `#FFFEFA` | Opaque raised surface |
| `--sn-surface-glass` | `rgba(22,22,28,0.55)` | `rgba(255,254,250,0.55)` | Standard glass fill |
| `--sn-surface-glass-heavy` | `rgba(22,22,28,0.82)` | `rgba(255,254,250,0.82)` | Heavy glass (toolbars) |
| `--sn-surface-elevated` | `rgba(30,30,40,0.80)` | `rgba(255,255,255,0.88)` | Modals, dropdowns |

### Accent Colors (10%)

| Token | Dark | Light | Purpose |
|-------|------|-------|---------|
| `--sn-accent` | `#E8806C` | `#C8604A` | Primary accent (warm coral) |
| `--sn-accent-light` | `#F09A88` | `#E8806C` | Lighter variant |
| `--sn-accent-muted` | `rgba(232,128,108,0.18)` | `rgba(200,96,74,0.12)` | Background tint |
| `--sn-accent-glow` | `rgba(232,128,108,0.12)` | `rgba(200,96,74,0.08)` | Glow/shadow color |
| `--sn-storm` | `#4E8E9A` | `#3A7A86` | Secondary accent (teal) |
| `--sn-storm-light` | `#6AABB8` | `#4E8E9A` | Lighter variant |
| `--sn-storm-muted` | `rgba(78,142,154,0.18)` | `rgba(58,122,134,0.12)` | Background tint |

### Chrome / Holographic

| Token | Dark | Light | Purpose |
|-------|------|-------|---------|
| `--sn-chrome-start` | `#B8C4D4` | `#8A96A8` | Chrome gradient start |
| `--sn-chrome-mid` | `#E8D8C8` | `#B8A898` | Chrome gradient mid |
| `--sn-chrome-end` | `#A8B8D0` | `#7888A0` | Chrome gradient end |
| `--sn-holographic` | `linear-gradient(135deg, #E8806C 0%, #B8A0D8 25%, #6AABB8 50%, #E8806C 75%, #D4A074 100%)` | same | Holographic border |

Usage: Chrome text on display headings only. Holographic border on hover only, 60% max opacity.

### Text

| Token | Dark | Light | Purpose |
|-------|------|-------|---------|
| `--sn-text` | `#EDEBE6` | `#1A1820` | Primary text |
| `--sn-text-soft` | `#A8A4AE` | `#5A5560` | Secondary text |
| `--sn-text-muted` | `rgba(237,235,230,0.45)` | `rgba(26,24,32,0.40)` | Tertiary/disabled |
| `--sn-text-faint` | `#3A3842` | `#D0CCD4` | Ghost/placeholder |

### Borders

| Token | Dark | Light | Purpose |
|-------|------|-------|---------|
| `--sn-border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Default border |
| `--sn-border-hover` | `rgba(255,255,255,0.14)` | `rgba(0,0,0,0.14)` | Hover state |
| `--sn-border-accent` | `rgba(232,128,108,0.25)` | `rgba(200,96,74,0.20)` | Selected/active |

### Semantic Colors

| Token | Dark | Light | Purpose |
|-------|------|-------|---------|
| `--sn-success` | `#5AA878` | same | Success states |
| `--sn-warning` | `#D4A04C` | same | Warning states |
| `--sn-error` | `#C85858` | same | Error states |

## Spatial Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--sn-blur-surface` | `20px` | Standard glass blur |
| `--sn-blur-heavy` | `40px` | Heavy glass blur |
| `--sn-radius` | `14px` | Default border radius |
| `--sn-radius-sm` | `8px` | Small elements (buttons, inputs) |
| `--sn-radius-lg` | `20px` | Feature cards, liquid glass |
| `--sn-radius-xl` | `28px` | Full-width panels |
| `--sn-grain-opacity` | `0.035` (dark) / `0.025` (light) | Grain overlay |
| `--sn-hex-opacity` | `0.04` (dark) / `0.03` (light) | Hex pattern |

## Typography Tokens

| Token | Value |
|-------|-------|
| `--sn-font` | `'Outfit', system-ui, sans-serif` |
| `--sn-font-serif` | `'Newsreader', Georgia, serif` |
| `--sn-font-mono` | `'DM Mono', 'Fira Code', monospace` |

## Motion Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--sn-ease-spring` | `cubic-bezier(0.16, 1, 0.3, 1)` | Interactive transitions |
| `--sn-ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | Subtle UI transitions |
| `--sn-ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful emphasis |
| `--sn-dur-fast` | `150ms` | Micro-interactions |
| `--sn-dur-normal` | `300ms` | Standard transitions |
| `--sn-dur-slow` | `500ms` | Deliberate motions |
| `--sn-dur-gentle` | `800ms` | Atmospheric motions |
| `--sn-dur-breathe` | `6s` | Breathing/idle cycle |
