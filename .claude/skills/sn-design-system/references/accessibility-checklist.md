# Accessibility Checklist — Run Before Shipping Any Component

## Contrast (WCAG 2.1 AA)

- [ ] Normal text (< 18pt): contrast ratio >= 4.5:1 against its background
- [ ] Large text (>= 18pt or >= 14pt bold): contrast ratio >= 3:1
- [ ] UI components and graphical objects: contrast ratio >= 3:1
- [ ] Verify in BOTH dark and light themes
- [ ] Glass surfaces: check contrast against the WORST-CASE background (what if a bright image is behind the glass?)

### Quick Contrast Checks for Common Token Pairs

**Dark theme:**
| Text Token | On Surface | Ratio | Pass? |
|-----------|------------|-------|-------|
| --sn-text (#EDEBE6) | --sn-bg (#0C0C10) | ~16:1 | AA |
| --sn-text-soft (#A8A4AE) | --sn-bg (#0C0C10) | ~8:1 | AA |
| --sn-text-muted (45% opacity) | --sn-bg (#0C0C10) | ~5.5:1 | AA |
| --sn-accent (#E8806C) | --sn-bg (#0C0C10) | ~5.8:1 | AA |
| --sn-text (#EDEBE6) | --sn-surface-raised (#1A1A22) | ~12:1 | AA |

**Light theme:**
| Text Token | On Surface | Ratio | Pass? |
|-----------|------------|-------|-------|
| --sn-text (#1A1820) | --sn-bg (#F5F2ED) | ~14:1 | AA |
| --sn-text-soft (#5A5560) | --sn-bg (#F5F2ED) | ~6.5:1 | AA |
| --sn-accent (#C8604A) | --sn-bg (#F5F2ED) | ~4.8:1 | AA |

## Focus Indicators

- [ ] Every interactive element has `:focus-visible` styling
- [ ] Focus ring: 2px solid var(--sn-accent), 2px offset
- [ ] Focus ring is visible against ALL backgrounds (dark, light, glass)
- [ ] Tab order follows visual reading order
- [ ] No focus traps (except modals, which must trap focus intentionally)

## Motion

- [ ] All animations respect `prefers-reduced-motion: reduce`
- [ ] Reduced motion: duration → 0.01ms, iteration-count → 1
- [ ] Background ambient orbs are hidden in reduced-motion mode
- [ ] No auto-playing video or looping animation without pause control
- [ ] No flashing content (>3 flashes per second)

## Keyboard

- [ ] All interactive elements reachable via Tab key
- [ ] Escape closes panels, modals, dropdowns
- [ ] Arrow keys navigate within toolbars and lists
- [ ] Enter/Space activates focused element
- [ ] Keyboard shortcuts don't conflict with screen reader shortcuts

## Screen Reader

- [ ] Meaningful alt text on images and icons
- [ ] Decorative elements have `aria-hidden="true"` or empty alt
- [ ] ARIA landmarks: `<main>`, `<nav>`, `<aside>` for major regions
- [ ] Live regions for toast notifications: `aria-live="polite"`
- [ ] Error messages linked to inputs via `aria-describedby`
- [ ] Toolbar buttons have `aria-label` when icon-only

## Touch

- [ ] Touch targets >= 44x44px (WCAG 2.5.5)
- [ ] Adequate spacing between touch targets (>= 8px)
- [ ] No hover-only features — all hover content accessible via tap

## Color Independence

- [ ] Information not conveyed by color alone (add icons, text, patterns)
- [ ] Error states use icon + color, not just red
- [ ] Selected states use border/background change + visual indicator, not just color

## High Contrast Theme

- [ ] Component works correctly in the `high-contrast` theme
- [ ] High contrast: 0px border-radius, opaque backgrounds, solid borders
- [ ] No information lost when glass effects are removed
- [ ] All text remains readable with high-contrast borders

## Glass-Specific Accessibility

Glass surfaces create unique challenges because their appearance depends on the background:

- [ ] Text on glass surfaces maintains AA contrast even with bright backgrounds behind the blur
- [ ] Provide fallback `background-color` for browsers without backdrop-filter support
- [ ] Glass opacity is high enough that text remains readable in all conditions
- [ ] Consider adding a subtle text-shadow for legibility on light glass surfaces
