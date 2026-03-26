---
name: design
description: >
  This skill produces visual assets for StickerNest — icons, mockups, marketing
  graphics. Use when the user says "design an icon", "create a mockup", "make
  a social media graphic", "marketing visual", or when any visual asset is
  needed for the project.
---

> Produces visual assets for StickerNest — icons, palettes, UI mockups, marketing materials.

---

## When to Run

- UI component needed (from `docs/UI_COMPONENTS_NEEDED.md`)
- Content Strategist needs visual assets for posts
- New feature needs icons or mockups
- On demand: "Design the marketplace card layout"

---

## Visual Identity Foundation

StickerNest is playful but capable. The visual language reflects both qualities:

### Personality
- **Playful**: Rounded corners, vibrant colors, friendly icons. The canvas is fun to use.
- **Capable**: Clean layouts, clear hierarchy, professional spacing. The platform is serious software.
- **Spatial**: Depth cues, layering, dimensionality. Things exist in space, not on a flat page.

### Color Approach
- Vibrant accent colors on clean, neutral backgrounds
- Theme tokens define the palette — all designs must work with the token system
- High contrast between interactive elements and background
- Color is functional first, decorative second

### Typography
- Modern sans-serif for all UI text
- Clear hierarchy: headings, body, captions, labels
- Readable at all sizes — test at minimum target size before shipping

### Icon Style
- Rounded, friendly, consistent stroke weight
- Work at 24x24 minimum — if it's not clear at that size, simplify
- Consistent visual weight across the icon set
- Filled variants for active/selected states, outlined for default

---

## Theme Token Reference

All designs must align with the canonical theme tokens:

| Token | Purpose |
|-------|---------|
| `--sn-bg` | Page/canvas background |
| `--sn-surface` | Card/panel background |
| `--sn-accent` | Primary action color |
| `--sn-text` | Primary text color |
| `--sn-text-muted` | Secondary/helper text |
| `--sn-border` | Borders and dividers |
| `--sn-radius` | Corner radius standard |
| `--sn-font-family` | UI font family |

Designs must work with all three built-in themes: light, dark, and high-contrast. Always test against at least light and dark.

---

## Asset Types and Standards

### Icons

| Spec | Standard |
|------|----------|
| Format | SVG preferred, PNG fallback |
| Sizes | 24x24, 48x48, 96x96 |
| Grid | 24px grid with 2px padding |
| Stroke | 2px consistent weight |
| Corners | 2px radius on sharp corners |
| Export | Include both filled and outlined variants |

### Sticker Assets
- Format: PNG (static), GIF (animated), MP4 (video)
- Must be visually distinct at small sizes (96x96 thumbnail)
- Transparent background preferred
- No embedded logic — stickers are purely visual

### UI Mockups
- Reference existing component patterns from the codebase
- Check `docs/UI_COMPONENTS_NEEDED.md` for pending designs
- Include: default state, hover state, active state, disabled state
- Show responsive behavior if applicable (desktop primary)
- Annotate spacing, colors, and typography with token references

### Marketing Visuals
Platform-specific sizes:

| Platform | Size | Use |
|----------|------|-----|
| Twitter | 1200x675 | Link card |
| Twitter | 1600x900 | In-stream image |
| TikTok | 1080x1920 | Cover/thumbnail |
| YouTube | 1280x720 | Video thumbnail |
| YouTube | 2560x1440 | Channel banner |
| Reddit | 1200x628 | Link preview |
| OG/Meta | 1200x630 | Default share card |

---

## Design Workflow

### Step 1: Understand the Request
Read the design request. Clarify:
- What type of asset? (icon, mockup, marketing visual)
- What context? (where will it appear)
- What size/format?
- Any existing examples to reference?

### Step 2: Check for Existing Designs
Use Figma connector (Framelink MCP) if available:
- `get_figma_data` — read existing design files
- `download_figma_images` — download source assets
- `get_design_context` — understand design system

If Figma designs exist, use them as source of truth.

### Step 3: Create
For code-generated assets:
- Use `canvas-design` skill for visual art and posters
- Use `theme-factory` skill for themed artifacts
- Use Creatie connector (`create_design`) for AI-generated designs

For mockups:
- Reference existing React components in `src/` for patterns
- Use theme tokens for all colors
- Include all interactive states

### Step 4: Save and Deliver
Save outputs to:
```
StickerNest-Agents/assets/
├── icons/          # Icon SVGs and PNGs
├── mockups/        # UI mockup images
├── marketing/      # Social media graphics
└── stickers/       # Sticker asset files
```

---

## Quality Checklist

Before any asset is "done":

- [ ] Consistent with StickerNest visual identity (playful + capable)
- [ ] Works at target display size (not just zoomed in)
- [ ] Text is readable at intended size
- [ ] Colors use theme tokens (not hardcoded values)
- [ ] Tested against light AND dark themes
- [ ] Color contrast passes WCAG AA (4.5:1 for text)
- [ ] Icons: works at 24x24 minimum
- [ ] Marketing: correct platform dimensions
- [ ] Saved in correct format and location
- [ ] Named descriptively (not `asset-1.png`)
