# Motion Design Reference — Adaptive Motion System

## Core Principle: Adaptive Intensity

The StickerNest motion system follows one rule: **motion responds to attention**. Elements at rest are nearly still. Elements being interacted with come alive. Elements being pressed snap back with physical feedback.

This creates a UI that feels like it's breathing — alive but not distracting.

## Easing Functions

| Name | Value | When to Use |
|------|-------|-------------|
| Spring | `cubic-bezier(0.16, 1, 0.3, 1)` | All interactive transitions (default) |
| Smooth | `cubic-bezier(0.4, 0, 0.2, 1)` | Subtle UI transitions, opacity changes |
| Bounce | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful emphasis (notifications, achievements) |
| Linear | `linear` | Looping animations ONLY (gradients, shimmer) |

Spring easing overshoots slightly then settles — this is what gives interactions their "physical" quality. It should be the default for everything interactive.

## Duration Tiers

| Tier | Duration | Use Cases |
|------|----------|-----------|
| Fast | 150ms | Button hover, toggle, tooltip show/hide, press feedback |
| Normal | 300ms | Panel slide, widget open, card lift, tool switch |
| Slow | 500ms | Modal open, page transition, theme change |
| Gentle | 800ms | Canvas zoom, ambient drift, onboarding entrance |
| Breathe | 6s | Idle breathing loop, ambient background cycle |

## Animation Patterns

### P1: Arrival (Staggered Entrance)
```css
@keyframes sn-arrive {
  from { opacity: 0; transform: translateY(20px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```
Used for: widget mount, panel open, list items on load.
Stagger gap: 50ms between siblings.

### P2: Breathing / Idle
```css
@keyframes sn-breathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.008); }
}
/* Applied with: animation: sn-breathe 6s ease-in-out infinite; */
```
Used for: toolbar container, active widget border, selected entity halo.
On hover, speed up to 3s (double the energy).

### P3: Glow Pulse
```css
@keyframes sn-glow {
  0%, 100% { box-shadow: 0 0 8px 0 var(--sn-accent-glow); }
  50%      { box-shadow: 0 0 20px 4px var(--sn-accent-glow); }
}
```
Used for: active tool indicator dot, connection port when available, notification badge.

### P4: Adaptive Lift (The Core Interaction Pattern)
```css
.element {
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.element:hover {
  transform: translateY(-2px) scale(1.005);
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
}
.element:active {
  transform: translateY(0) scale(0.995);
  transition-duration: 150ms; /* Snappy press */
}
```
Used for: cards, buttons, list items, layer items — anything clickable.

### P5: Ambient Drift (Background Orbs)
```css
@keyframes drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(60px, 30px) scale(1.05); }
  66% { transform: translate(-20px, -40px) scale(0.95); }
}
```
Applied to large, blurred, low-opacity background orbs (15% opacity, 80px blur).
Cycle: 20-30s. Three orbs minimum, different phases.

### P6: Holographic Shift
```css
@keyframes holo-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```
Applied to holographic gradient borders. 8s cycle, linear easing. Only visible on hover (fade in via opacity transition).

### P7: Spring Toast Entry
```css
@keyframes toast-arrive {
  from { opacity: 0; transform: translateY(10px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```
500ms with spring easing. Toast exits with opacity fade (300ms smooth).

### P8: 3D Tilt (CSS Perspective)
```javascript
function tiltCard(event, element) {
  const rect = element.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const rotateX = ((y - rect.height/2) / (rect.height/2)) * -8;
  const rotateY = ((x - rect.width/2) / (rect.width/2)) * 8;
  element.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
}
```
Max tilt: 8 degrees. Perspective: 800px. For premium cards and widget previews.

## Accessibility: prefers-reduced-motion

Every animation in the system respects this media query:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .ambient-orb { display: none; }
}
```

This is non-negotiable. The reduced-motion version strips all animation completely. Background orbs are hidden entirely. The UI must be fully usable and attractive without any motion.

## Performance Guidelines

- Use `will-change: transform` sparingly — only on elements currently animating
- Prefer `transform` and `opacity` for animations (compositor-only, no layout/paint)
- Never animate `width`, `height`, `top`, `left`, `margin`, or `padding`
- Cap ambient animations at 3 simultaneous (orbs, breathing, glow)
- Background orbs use `filter: blur(80px)` — ensure GPU compositing
- Throttle mousemove handlers for 3D tilt to 60fps max
