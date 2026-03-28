# Anti-Patterns — What StickerNest Actively Rejects

These are design choices that have become cliches, accessibility problems, or simply don't align with the Obsidian design language. When reviewing any StickerNest visual output, check against this list.

## Color Anti-Patterns

### Autumn AI Aesthetic
The warm-toned "cozy AI" look that dominated 2024-2025 AI products: pumpkin oranges, leaf browns, cabin-fire ambers, dried-flower mauves. This palette has become a visual shorthand for "I'm an AI product" and reads as generic.

**Why we reject it**: Our warm coral (#E8806C) is warm WITHOUT being autumn. It's closer to a Her-film peach than a fall harvest.

### Pure Black (#000000)
Pure black kills glass effects because there's no depth behind the transparency. It also creates harsh contrast that strains eyes.

**What to use instead**: Deep charcoal with warmth. Our dark bg is #0C0C10 — notice the slight blue-purple undertone. This preserves glass depth and feels premium.

### Pastel Everything
Washed-out accent colors that lack presence. Pastels read as timid and get lost against glass surfaces.

**What to use instead**: Full-saturation accents at controlled usage (10% of surface area). Our coral is vivid. Our teal has depth. Use `--sn-accent-muted` for tinted backgrounds, not pastel versions of the accent.

## Layout Anti-Patterns

### Over-Rounded Corners
`border-radius: 9999px` on containers, pill-shaped cards, bubble layouts. This was the 2023-2024 "friendly AI" look.

**Our standard**: 14px default, 8px for small elements, 20px for feature cards. 28px maximum for full-width panels. Never pill shapes on rectangles.

### Gradient Blob Backgrounds
Full-saturation CSS gradient mesh backgrounds that dominate the visual space. These were everywhere on landing pages in 2023-2025.

**What we do instead**: Ambient orbs at 15% opacity with 80px blur, moving slowly (20-30s cycle). The effect is atmospheric, not decorative. The background serves the content, not the other way around.

## Motion Anti-Patterns

### Gratuitous Animation
Bouncing logos on load. Spinning elements. Parallax scrolling. Lottie confetti on every action. Animation for the sake of animation.

**Our rule**: Every motion must serve one of three purposes:
1. Indicate state (breathing = alive/active)
2. Provide feedback (lift = hoverable, snap = pressed)
3. Guide attention (arrival = new content)

If a motion doesn't serve one of these, remove it.

### Uniform Motion Speed
Everything animating at the same speed flattens the motion hierarchy. If a tooltip and a page transition both take 300ms, neither feels special.

**Our approach**: Fast (150ms) for micro-interactions, Normal (300ms) for standard UI, Slow (500ms) for deliberate reveals, Gentle (800ms) for atmospheric. The speed itself communicates importance.

### Ignoring prefers-reduced-motion
Not just an anti-pattern — it's an accessibility violation. Some users experience motion sickness from UI animation.

**Non-negotiable**: All StickerNest animations respect `prefers-reduced-motion: reduce`. Zero exceptions. The UI must be fully functional and attractive without any motion.

## Interaction Anti-Patterns

### Hover-Only Features
Features or information only accessible via mouse hover. This fails on touch devices and assistive tech.

**Our rule**: Hover enhances, never gates. Everything accessible via hover must also be accessible via click/tap/keyboard.

### Modal Overuse
Using modals for confirmations, settings, information displays. Modals block the user and break flow.

**What to use instead**: Toasts for feedback. Panels for settings. Inline expansion for details. Modals only for destructive confirmations (delete, uninstall).

## Typography Anti-Patterns

### Decorative Fonts Everywhere
Using display fonts for body text, or novelty fonts that harm readability.

**Our system**: Outfit (geometric, clean) for all UI. Newsreader (warm serif) for long-form content. DM Mono for data. Chrome gradient only on Display-size headings.

### Text Over Uncontrolled Backgrounds
Placing text directly over images, videos, or gradient backgrounds without ensuring contrast.

**Our rule**: Text always lives on a glass surface. The backdrop-filter blur guarantees readable contrast regardless of what's behind it.

## Implementation Anti-Patterns

### Hardcoded Colors
Using hex values directly in components instead of CSS custom properties.

**Our rule**: Every color reference goes through a token. No exceptions. This is how theme switching works.

### Inconsistent Spacing
Magic numbers for padding and margin scattered across components.

**Our approach**: Use the spatial tokens (radius-sm, radius, radius-lg, radius-xl) and consistent padding patterns (16px panels, 12px items, 8px compact).

### Browser-Specific CSS Without Fallbacks
Using `-webkit-backdrop-filter` without also providing `backdrop-filter`. Using features without checking support.

**Our rule**: Always include both prefixed and unprefixed. Provide fallback opaque backgrounds for browsers that don't support backdrop-filter.
