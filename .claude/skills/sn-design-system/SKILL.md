---
name: sn-design-system
description: "StickerNest V5 Obsidian Design System — the definitive visual identity reference. Use this skill whenever creating UI components, reviewing designs, generating theme tokens, auditing accessibility, applying glass/grain/hex/motion effects, or making ANY visual decision for StickerNest. Triggers on: 'design system', 'theme tokens', 'glass effect', 'UI component', 'color palette', 'dark mode', 'accessibility audit', 'contrast check', 'motion design', 'grain texture', 'hex pattern', 'liquid glass', 'chrome accent', 'breathing animation', 'adaptive motion', 'create a component', 'style this', 'make it look right', 'design review', 'visual QA'. Use this skill even if the user doesn't explicitly mention design — any visual output for StickerNest should conform to this system."
---

# StickerNest V5 — Obsidian Design System

## Philosophy

StickerNest's visual identity sits at the intersection of six design movements, refined for 2026 production use:

1. **Liquid Glass** — Apple WWDC 2025's material language: translucent surfaces with backdrop blur, saturation boost, and refraction edge highlights. Not just "glassmorphism" — the surface responds to what's behind it.

2. **Neo-Skeuomorphism** — Depth through soft shadows, inset effects, and physical-feeling interactions. Not mimicking leather textures — evoking the *feel* of physical objects through light and shadow.

3. **Y2K Futurism (Chrome Edition)** — Holographic gradients, chrome text, metallic shimmers. Used surgically as accent, never as wallpaper. The 2026 refined version, not the campy nostalgic one.

4. **Film Grain + Hex Patterns** — SVG feTurbulence noise overlay and CSS hexagonal grid. Adds analog warmth and geometric structure. Always subtle (3-4% opacity).

5. **Breathing/Living UI** — Nothing is static. Ambient orbs drift, surfaces pulse, active states glow. But motion is adaptive: subtle at rest, intensifies on interaction, respects `prefers-reduced-motion`.

6. **Deep Charcoal Dark Mode** — Never pure black (#000). Warm charcoal (#0C0C10) with purple undertones. Preserves glass depth effects and feels premium.

## Anti-Patterns (Things We Actively Reject)

Read `references/anti-patterns.md` for the full list. Key ones:
- No autumn/cozy AI aesthetic (pumpkin orange, leaf brown, cabin vibes)
- No pure black (#000) backgrounds
- No over-rounded corners (pill shapes on containers)
- No pastel-everything palettes
- No full-saturation gradient blob backgrounds
- No gratuitous animation (bouncing logos, parallax scroll)
- No "cute" — we are warm but sophisticated

## Token System

Read `references/tokens.md` for the complete token reference with values for both dark and light themes.

The 60/30/10 rule governs color usage:
- **60%** — Background (`--sn-bg`, `--sn-bg-ground`)
- **30%** — Structure (`--sn-surface-*`, `--sn-border-*`)
- **10%** — Accent (`--sn-accent`, `--sn-storm`, semantic colors)

## Surface Hierarchy

Four glass tiers, each with increasing opacity and blur:

| Surface | Use | Backdrop Blur | Opacity |
|---------|-----|---------------|---------|
| `glass` | Standard panels, cards | 20px, saturate(1.3) | 55% |
| `glass-heavy` | Toolbars, fixed chrome | 40px, saturate(1.4) | 82% |
| `liquid-glass` | Hero elements, premium cards | 20px, saturate(1.5), brightness(1.05) | 55% + refraction edge |
| `surface-elevated` | Modals, dropdowns | 40px | 80% |

Every glass surface must show the grain texture and hex pattern bleeding through — this is what makes the canvas feel "present" behind the UI.

## Motion System

Read `references/motion.md` for the complete animation token reference.

Core principle: **Adaptive intensity**. Every interactive element has three states:

1. **Rest** — Subtle breathing (scale 1.008 oscillation over 6s). Nearly imperceptible.
2. **Hover** — Lift (translateY -2px), glow intensifies, breathing speeds up to 3s.
3. **Active/Press** — Snap down (scale 0.995), instant (150ms). Physical feedback.

Spring easing (`cubic-bezier(0.16, 1, 0.3, 1)`) is the default for all interactive transitions. Linear easing is reserved exclusively for looping/continuous animations.

## Component Patterns

When building components, follow these patterns:

### Cards
```css
.card {
  background: var(--sn-surface-glass);
  backdrop-filter: blur(var(--sn-blur-surface)) saturate(1.3);
  border: 1px solid var(--sn-border);
  border-radius: var(--sn-radius);
  /* Adaptive lift on hover */
  transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.card:hover {
  transform: translateY(-2px) scale(1.005);
  border-color: var(--sn-border-hover);
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
}
```

### Buttons
- **Primary**: Solid accent background, glow shadow, lift on hover
- **Glass**: Translucent with backdrop blur, border highlight on hover
- **Chrome**: Metallic gradient background, reserved for emphasis CTAs

### Toolbar
- Glass-heavy material with neo-skeuomorphic depth shadows
- Breathing animation on the container (6s cycle)
- Active tool indicator: accent-colored dot with glow-pulse animation
- Tool buttons: 40×40px, 8px radius, transparent bg → glass on hover

### Panels
- Glass material, 16px padding
- Panel headers: uppercase mono label, 0.8125rem, border-bottom separator
- Properties use mono font for values, muted color for labels
- Layer items: 8px padding, accent-muted bg when selected

### Toasts
- Glass material with semantic color tint (15% opacity fill, 25% opacity border)
- Spring-in animation from below (translateY 10px → 0, scale 0.96 → 1)
- Never modal — always non-blocking

## Typography

| Role | Font | Weight | Size | Use |
|------|------|--------|------|-----|
| Display | Outfit | 700 | clamp(3rem, 8vw, 5.5rem) | Hero headings |
| Headline | Outfit | 600 | clamp(1.5rem, 4vw, 2.5rem) | Section heads |
| Body | Outfit | 400 | 1rem | UI text |
| Content | Newsreader | 400 | 1.125rem | Long-form, descriptions |
| Mono | DM Mono | 400 | 0.8125rem | Coordinates, code, tokens |

Chrome text (metallic gradient fill) is used for display headings on dark backgrounds. Never on body text.

## Accessibility Requirements

Every design decision must pass these checks:

1. **Contrast**: WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
2. **Motion**: All animations respect `prefers-reduced-motion: reduce` — zero duration, single iteration
3. **Focus**: Every interactive element has a visible `:focus-visible` ring (2px solid accent, 2px offset)
4. **High Contrast**: The `high-contrast` theme exists as an escape hatch — 0px radius, opaque borders, no glass effects

Run `references/accessibility-checklist.md` mentally before signing off on any component.

## Workflow

When asked to create or review a StickerNest UI element:

1. Check which surface tier it needs (glass, glass-heavy, liquid-glass, elevated)
2. Apply the correct token set from `references/tokens.md`
3. Add adaptive motion (rest → hover → active states)
4. Verify grain and hex pattern visibility through the surface
5. Run the accessibility checklist
6. Confirm it avoids all anti-patterns
