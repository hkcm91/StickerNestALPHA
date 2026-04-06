# Surface & Material Reference — Glass, Grain, Hex

## The Four Glass Tiers

### 1. Standard Glass
```css
.glass {
  background: var(--sn-surface-glass);
  backdrop-filter: blur(var(--sn-blur-surface)) saturate(1.3);
  -webkit-backdrop-filter: blur(var(--sn-blur-surface)) saturate(1.3);
  border: 1px solid var(--sn-border);
  border-radius: var(--sn-radius);
}
```
**Use for**: Panels, cards, list items, standard UI containers.
**Hover state**: Border → `--sn-border-hover`, background → `--sn-surface-glass-heavy`, add box-shadow.

### 2. Heavy Glass
```css
.glass-heavy {
  background: var(--sn-surface-glass-heavy);
  backdrop-filter: blur(var(--sn-blur-heavy)) saturate(1.4);
  -webkit-backdrop-filter: blur(var(--sn-blur-heavy)) saturate(1.4);
  border: 1px solid var(--sn-border);
  border-radius: var(--sn-radius);
}
```
**Use for**: Fixed chrome (toolbar, header), persistent UI that overlays the canvas.
**Why heavier**: Fixed elements need to be readable regardless of what scrolls behind them. The 82% opacity and 40px blur ensure this.

### 3. Liquid Glass
```css
.liquid-glass {
  background: var(--sn-surface-glass);
  backdrop-filter: blur(var(--sn-blur-surface)) saturate(1.5) brightness(1.05);
  border: 1px solid var(--sn-border);
  border-radius: var(--sn-radius-lg);
  position: relative;
  overflow: hidden;
}

/* Refraction highlight gradient */
.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(255,255,255,0.08) 0%,
    transparent 40%,
    transparent 60%,
    rgba(255,255,255,0.04) 100%
  );
  pointer-events: none;
}

/* Top edge light line */
.liquid-glass::after {
  content: '';
  position: absolute;
  top: -1px;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  pointer-events: none;
}
```
**Use for**: Hero elements, feature cards, premium surfaces, widget preview cards.
**What makes it "liquid"**: The brightness(1.05) on the filter + internal gradient + top-edge light line create the illusion of refraction — as if light is bending through the surface. Inspired by Apple's WWDC 2025 Liquid Glass material.

### 4. Elevated Surface
```css
.surface-elevated {
  background: var(--sn-surface-elevated);
  backdrop-filter: blur(var(--sn-blur-heavy));
  border: 1px solid var(--sn-border);
  border-radius: var(--sn-radius);
  box-shadow: 0 16px 48px rgba(0,0,0,0.3);
}
```
**Use for**: Modals, dropdowns, command palette, context menus.
**Key difference**: These float above all other surfaces and need the strongest shadow to communicate z-depth.

## Neo-Skeuomorphic Depth

For elements that need to feel "physical" (buttons, toggles, toolbar containers):

```css
.neo-depth {
  box-shadow:
    0 1px 2px rgba(0,0,0,0.15),      /* Tight contact shadow */
    0 4px 12px rgba(0,0,0,0.1),       /* Medium ambient shadow */
    inset 0 1px 0 rgba(255,255,255,0.05),  /* Top edge highlight */
    inset 0 -1px 0 rgba(0,0,0,0.1);   /* Bottom edge darkening */
}

.neo-inset {
  box-shadow:
    inset 0 2px 4px rgba(0,0,0,0.2),
    inset 0 -1px 0 rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.15);
}
```

## Grain Texture Overlay

Applied globally via `body::before`:

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: var(--sn-grain-opacity); /* 0.035 dark, 0.025 light */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  mix-blend-mode: overlay;
}
```

**Why SVG instead of image**: The SVG is ~200 bytes inline. A raster grain texture would be 50-200KB. The SVG approach is practically zero network cost.

**Performance note**: SVG feTurbulence can be CPU-intensive on initial render. For performance-critical contexts, pre-render to a canvas and use as background-image. For standard use, the inline SVG is fine — it renders once and is cached.

## Hexagonal Pattern

Applied globally via `body::after`:

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: var(--sn-hex-opacity); /* 0.04 dark, 0.03 light */
  /* CSS-only hexagonal grid using overlapping gradients */
  background-image:
    linear-gradient(30deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%),
    linear-gradient(150deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%),
    linear-gradient(30deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%),
    linear-gradient(150deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%),
    linear-gradient(60deg, rgba(128,128,128,0.25) 25%, transparent 25.5%, transparent 75%, rgba(128,128,128,0.25) 75%),
    linear-gradient(60deg, rgba(128,128,128,0.25) 25%, transparent 25.5%, transparent 75%, rgba(128,128,128,0.25) 75%);
  background-size: 30px calc(30px * 1.732);
}
```

**Why hexagons**: They are the most space-efficient tessellation and evoke both organic (honeycomb) and technological (circuit board) patterns. At 4% opacity they add geometric structure without dominating.

## Holographic / Chrome Accents

Used sparingly for emphasis:

```css
/* Chrome text gradient */
.chrome-text {
  background: linear-gradient(135deg, var(--sn-chrome-start), var(--sn-chrome-mid), var(--sn-chrome-end));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Holographic border (hover-only) */
.holo-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: var(--sn-holographic);
  background-size: 300% 300%;
  animation: holo-shift 8s linear infinite;
  opacity: 0; /* Fades in on hover */
  transition: opacity 300ms ease;
  z-index: -1;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: 1px;
}
.holo-border:hover::before { opacity: 0.6; }
```

**Rules for chrome/holo usage**:
- Chrome text: Display headings only, never body text
- Holographic borders: On hover only, 60% max opacity
- Never both at once on the same element
- Never on more than 1-2 elements visible at a time
