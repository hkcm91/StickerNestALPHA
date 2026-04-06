# StickerNest V5 — Canvas UI Overhaul Plan
## "Her" / Futuristic Warm Aesthetic

---

## Vision

The film *Her* creates intimacy through restraint: warm coral tones, generous whitespace, soft typography, and interfaces that feel like they're breathing. StickerNest already has strong bones — the RothkoField ambient backgrounds, CursorGlow, bioluminescent dev swatches, glass-morphism panels. This plan promotes those experimental elements into a cohesive production identity, strips away visual noise, and pushes the canvas toward an environment that feels alive, warm, and quietly intelligent.

The goal isn't to mimic *Her* literally. It's to absorb its emotional register — softness over sharpness, warmth over coolness, presence over clutter — and apply that to a spatial OS that still needs to be functional and powerful.

---

## Part 1: Theme Token Evolution

### Current State
Five themes exist in `theme-tokens.ts` with ~30 tokens each. The default (Midnight Aurora) leans cool-purple. The warm theme (Autumn Fireflies) is the closest to the *Her* palette but is buried as an alternate.

### Changes

**1.1 — New default theme: "Ember"**

A dedicated warm-core theme that becomes the first-run default. Not replacing Midnight Aurora — adding alongside it and promoting it.

| Token | Value | Rationale |
|---|---|---|
| `--sn-bg` | `#1A1210` | Deep warm charcoal, not black. Like a room at dusk. |
| `--sn-surface` | `rgba(45, 32, 28, 0.72)` | Warm brown glass, semi-transparent for layering. |
| `--sn-surface-elevated` | `rgba(58, 42, 36, 0.80)` | Slightly lighter surface for popovers, dropdowns. |
| `--sn-accent` | `#E8806C` | Soft coral — the signature "Her" tone. Already exists as `ember` in Midnight Aurora. |
| `--sn-accent-muted` | `rgba(232, 128, 108, 0.35)` | Coral at low opacity for hover states, focus rings. |
| `--sn-text` | `#F2E8E4` | Warm off-white. Never pure `#FFF`. |
| `--sn-text-muted` | `rgba(242, 232, 228, 0.55)` | Readable but receded. |
| `--sn-border` | `rgba(232, 128, 108, 0.12)` | Whisper of coral in borders. |
| `--sn-glow` | `rgba(232, 128, 108, 0.08)` | New token — ambient glow tint for RothkoField, CursorGlow, hover halos. |
| `--sn-radius` | `14px` | Slightly more rounded than current 12px. Softer. |
| `--sn-font-family` | `'Outfit', sans-serif` | Keep Outfit — its geometric softness fits perfectly. |
| `--sn-font-serif` | `'Newsreader', serif` | For canvas name, section headers — adds warmth. |

**1.2 — Token additions (all themes)**

New tokens needed across every theme to support the overhaul:

- `--sn-surface-elevated` — second glass tier for popovers and dropdowns
- `--sn-glow` — ambient glow color (theme-specific: coral for Ember, violet for Midnight Aurora, cyan for Bubbles)
- `--sn-accent-muted` — low-opacity accent for hover/focus states
- `--sn-transition-spring` — standardize `cubic-bezier(0.16, 1, 0.3, 1)` as a token
- `--sn-blur-surface` — backdrop blur amount (`16px` default, `20px` for elevated)

**1.3 — Crystal Light (light theme) warmth pass**

Current Crystal Light is cool and sterile (`#FAF8F5` bg). Shift it warmer:
- Bg: `#FAF6F1` (warm parchment)
- Accent: keep or warm slightly toward peach
- Borders: warm gray instead of cool gray

---

## Part 2: Canvas Surface

### Current State
CanvasWorkspace composites layers: RothkoField → CursorGlow → CanvasOverlayLayer → entities → tools → selection overlays. The ambient effects are already excellent but disconnected from the UI chrome.

### Changes

**2.1 — RothkoField refinement**

The existing RothkoField is the single strongest "Her" element already in the codebase. Refinements:

- **Ember theme palette**: Shift the three color bands to `ember (#E8806C)`, `warm sienna (#C4684A)`, and `soft gold (#D4A574)`. Current violet band feels cool for this direction.
- **Slower drift**: Reduce phase speed by 30%. The current 8fps cycle is good; make the color shifts even more glacial. The effect should feel like breathing, not moving.
- **Vignette**: Add a subtle radial vignette (dark at edges, lighter center) to create depth and draw focus inward. CSS `radial-gradient` overlay, no performance cost.
- **Grain intensity**: Reduce grain opacity from current level to ~0.015. It should be barely perceptible — texture, not noise.

**2.2 — CursorGlow warmth**

Currently uses `color-mix(in srgb, var(--sn-accent) 5%, transparent)`. This is already theme-aware, but:

- Increase glow radius from 280px to 340px for a more expansive, atmospheric feel
- Add a second, larger outer glow ring (500px) at 2% opacity — creates depth
- Use `--sn-glow` token instead of `--sn-accent` for the glow color — allows per-theme tuning
- Increase transition duration from 0.8s to 1.2s for dreamier lag

**2.3 — Frosted glass canvas pane** *(NEW — from reference screenshots)*

The canvas viewport itself becomes a frosted glass surface. This is clearly visible in all four reference screenshots — the canvas is a distinct rounded rectangle floating over the ambient background, and the ambient elements (blobs, nebula, bubbles, fireflies) are softly blurred *through* the canvas surface.

Implementation:
- The canvas viewport container gets `backdrop-filter: blur(12px)` + a semi-transparent background tinted with `--sn-surface` at ~20% opacity
- Border: 1px `--sn-border` (the thin whisper border visible in every reference screenshot)
- Border radius: 16px (the rounded corners are clearly visible in all references — slightly larger than `--sn-radius` for the main pane)
- Subtle inner glow: `inset 0 0 60px rgba(var(--sn-glow-rgb), 0.03)` — the faint warm tint visible inside the canvas area in screenshot 4 (Autumn Fireflies)
- The frosted effect means the ambient background (RothkoField, BubblesField, FirefliesField) renders *behind* the canvas pane and bleeds through the blur, creating the layered depth visible in all references
- In the Bubbles & Sky reference, you can clearly see the soap bubbles are blurred through the canvas surface — this confirms the ambient layer renders at full-viewport size, behind the canvas pane
- The grid, entities, tools, and selection overlays all render *on top of* the frosted pane
- Performance: `backdrop-filter` is GPU-composited — no per-frame cost beyond the initial compositing

Layer composition order (updated):
```
Full viewport:    RothkoField / BubblesField / FirefliesField → CursorGlow
Canvas pane:      FrostedGlassPane (backdrop-filter: blur) → CanvasOverlayLayer (grid) → entities → tools → selection
```

This is the key architectural insight from the references: the ambient background is **not** clipped to the canvas area. It fills the entire viewport. The canvas is a frosted window looking *through* to the ambient layer beneath.

**2.4 — Interactive parallax background** *(NEW — from reference screenshots)*

The ambient background responds to mouse position with a multi-layer parallax effect, creating a sense of physical depth — as if the background elements exist at different distances behind the frosted canvas pane.

Implementation:
- Track mouse position relative to viewport center (already tracked by CursorGlow, reuse the same listener)
- Apply CSS `transform: translate3d(x, y, 0)` to ambient background layers based on mouse offset from center
- Three parallax depth tiers:
  - **Deep layer** (RothkoField color bands): ±8px max displacement, 0.8s CSS transition lag. Barely moves — feels distant.
  - **Mid layer** (secondary effects — the organic blobs in screenshot 1, nebula swirls in screenshot 2): ±16px max displacement, 0.5s transition lag.
  - **Near layer** (particles — bubbles in screenshot 3, fireflies in screenshot 4, CursorGlow): ±24px max displacement, 0.3s transition lag. Moves most — feels close.
- All movement uses the spring easing `--sn-transition-spring` for the transition property
- Movement is inverted (mouse moves right → layers shift left) for natural parallax feel
- Cap displacement so content never shifts off-viewport — the ±px values above ensure this
- On touch devices / no mouse: disable parallax (no tilt-based fallback needed for desktop-first)
- Performance: only CSS transforms are animated — no JS per-frame. The mouse position updates the CSS custom properties `--parallax-x` and `--parallax-y` via a throttled (30fps) mousemove handler, and each layer reads those via `calc()` in its transform.

The parallax creates the sense that the frosted canvas pane is a physical window, and the ambient environment behind it has depth. This is the "interactive" part of the request — the background responds to the user's presence.

**2.5 — Canvas background gradient**

Below RothkoField, add a barely-visible radial gradient centered on viewport that uses `--sn-glow`. This creates the sense that the canvas itself is warm, not just the floating elements.

**2.6 — Grid styling**

The CanvasOverlayLayer renders a dot grid. Make it feel softer:
- Grid dot color: `--sn-border` at 40% opacity (currently likely harder)
- Grid dot size: 1px (crisp but tiny)
- At high zoom: dots fade to 0 opacity below 0.3x zoom — the grid should vanish at distance

---

## Part 3: Toolbar Overhaul

### Current State
933-line Toolbar.tsx with a two-tier design: compact top bar + expandable categorized tray. Inline styles throughout. Functional but visually utilitarian.

### Changes

**3.1 — Top bar: Floating glass island**

Transform the top bar from a full-width strip to a floating centered island:

- **Width**: Content-hugging with generous horizontal padding (24px). Not full-width.
- **Position**: Centered horizontally, 12px from top of viewport.
- **Background**: `--sn-surface` with `backdrop-filter: blur(var(--sn-blur-surface))`
- **Border**: 1px `--sn-border` — the thin coral whisper border
- **Border radius**: `--sn-radius` (14px) for pill-like shape
- **Shadow**: `0 4px 24px rgba(0,0,0,0.15)` — soft float, not hard drop
- **Height**: 44px (compact, not imposing)

Contents (left to right):
1. Canvas name in `--sn-font-serif` (Newsreader). Editable on double-click. Warm, personal.
2. Thin vertical divider (`--sn-border`)
3. Spatial mode tabs (2D / 3D / VR) — pill-shaped toggle, active state uses `--sn-accent-muted` background
4. Center gap (flex spacer)
5. Presence avatars — overlapping circles with `--sn-glow` ring on hover
6. Thin divider
7. Edit/Preview toggle — the most important control. Pill toggle with `--sn-accent` active background.
8. Overflow menu (⋯) for zoom, camera, fullscreen, settings

**3.2 — Tool tray: Sliding glass drawer**

The expandable tool tray becomes a separate floating element below the top bar:

- **Trigger**: Click a tool icon in the top bar (or keyboard shortcut) to toggle
- **Appearance**: Glass panel matching top bar material, slides down with spring easing
- **Layout**: Horizontal icon strip organized by category with subtle label dividers
- **Categories**: Pointer (select, pan) → Draw (pen, shapes, text) → Place (sticker, widget, artboard) → Arrange (layers, align, distribute)
- **Active tool**: Filled icon with `--sn-accent-muted` background pill
- **Hover**: Icon scales to 1.08x with `--sn-glow` halo (the bioluminescent proximity effect from swatches)
- **Dismiss**: Click outside, press Escape, or toggle button again
- **Max width**: Same as top bar island — maintains visual alignment

**3.3 — Toolbar animation**

- All transitions use `--sn-transition-spring` (`cubic-bezier(0.16, 1, 0.3, 1)`)
- Tool tray entrance: translate-Y from -8px + opacity 0→1, 280ms spring
- Tool icons: scale on hover, 180ms spring
- Presence avatars: stagger-in on load (the `useStaggerReveal` pattern from swatches)

**3.4 — Toolbar in preview mode**

In preview mode, the toolbar minimizes to just:
- Canvas name
- Presence avatars
- Preview/Edit toggle
- Share button

No tool tray, no spatial tabs. The island shrinks to fit. Spring-animated width transition.

---

## Part 4: Side Panels

### Current State
ShellLayout renders overlay tray panels that slide from edges with spring transforms. Resizable 200-480px. Glass-morphism background.

### Changes

**4.1 — Panel material upgrade**

- Background: `--sn-surface` with `backdrop-filter: blur(var(--sn-blur-surface))`
- Border: 1px `--sn-border` on the inner edge only (no outer border against viewport edge)
- No hard corners against the viewport edge — use 0px radius on the edge side, `--sn-radius` on the inner side
- Header area: slightly elevated surface (`--sn-surface-elevated`) for the panel title row
- Subtle inner shadow at top: `inset 0 1px 0 rgba(255,255,255,0.04)` — light catch on glass

**4.2 — Panel typography**

- Panel titles: `--sn-font-serif` (Newsreader), 14px, `--sn-text-muted`. Warm and understated.
- Section labels: 10px uppercase tracking `0.08em`, `--sn-text-muted` at 60% opacity. The whisper-quiet category labels.
- Body text/values: `--sn-font-family` (Outfit), 13px, `--sn-text`.

**4.3 — Panel interactions**

- Hover states: `--sn-accent-muted` background, 180ms spring fade
- Active/selected rows (Layers panel): left 2px accent bar instead of full-row highlight. Minimal.
- Scrollbars: 3px thin, `--sn-border` color, visible on hover only, rounded caps
- Resize handle: invisible by default, shows a subtle vertical line on hover with cursor change

**4.4 — Properties panel specifics**

- Input fields: Use the `GlowInput` pattern from swatches — bottom-border-only inputs that glow coral on focus
- Color pickers: Soft rounded thumbnails with the `GlowDot` treatment from swatches
- Sliders: The `GlowSlider` with accent track fill and soft handle
- Toggles: The `LiquidToggle` from swatches — the blob-morphing toggle

**4.5 — Layers panel specifics**

- Entity rows: 32px height, icon + name + visibility toggle
- Drag reorder: The dragged row gets a glass-elevated treatment with soft shadow
- Multi-select: Shift+click range shows `--sn-accent-muted` wash across selected rows
- Collapsed groups: Subtle indent + rotation animation on the chevron

---

## Part 5: Context Menu & Floating Actions

### Current State
CanvasContextMenu and EntityFloatingToolbar exist but need visual alignment.

### Changes

**5.1 — Context menu**

- Background: `--sn-surface-elevated` with `backdrop-filter: blur(20px)`
- Border: 1px `--sn-border`
- Radius: `--sn-radius`
- Shadow: `0 8px 32px rgba(0,0,0,0.2)` — lifted, atmospheric
- Items: 32px height, Outfit 13px, `--sn-text`
- Hover: `--sn-accent-muted` background fill, spring transition
- Dividers: 1px `--sn-border`, 8px horizontal margin
- Keyboard hint text: `--sn-text-muted`, DM Mono 11px
- Entrance: scale from 0.95 + opacity, 200ms spring. Origin at cursor position.

**5.2 — Entity floating toolbar**

- Appears 8px above selected entity, centered horizontally
- Same glass material as top bar island
- Icon-only, 36px height, horizontal strip
- Actions: duplicate, delete, z-order, lock, color, more (⋯)
- Entrance: translate-Y from 4px + opacity, 220ms spring
- Follows entity during drag (with slight lag for fluidity)

---

## Part 6: Selection & Interaction Feedback

### Current State
SelectionOverlay and ConstellationLines handle selection visualization.

### Changes

**6.1 — Selection indicator**

Replace the current selection box with a softer treatment:
- No sharp blue selection rectangle
- Instead: `--sn-accent` 1.5px border with `border-radius: 4px` (slightly rounded corners on the selection box)
- Corner resize handles: 6px circles filled with `--sn-accent`, not squares
- Soft outer glow: `0 0 0 3px var(--sn-accent-muted)` — the bioluminescent halo effect
- On hover (before select): 1px dashed `--sn-accent-muted` border preview

**6.2 — ConstellationLines warmth**

Currently SVG dashed lines between selected entities. Make them warmer:
- Stroke color: `--sn-accent` at 30% opacity
- Dash pattern: `4 8` (more gap than dash — lighter, airier)
- Add small 4px circular nodes at each entity center — filled `--sn-accent` at 50%
- Animate dash offset slowly (CSS `stroke-dashoffset` animation, 4s loop) — the lines feel alive

**6.3 — Drag feedback**

- During entity drag: the entity gets a subtle lift shadow (`0 8px 24px rgba(0,0,0,0.15)`) and scales to 1.01x
- Snap guides: 1px `--sn-accent` at 40% opacity, not the typical bright blue
- Drop zone preview: soft `--sn-accent-muted` rectangle where the entity will land

**6.4 — FocusOverlay warmth**

The existing cinematic focus mode is already beautiful. Small tuning:
- Background blur overlay: tint with `--sn-glow` instead of pure dark
- Navigation arrows: soft glass pills instead of raw arrow shapes
- Transition: 400ms spring (slightly longer for the cinematic feel)

---

## Part 7: Presence Layer

### Current State
PresenceAvatarBar in the toolbar and PresenceCursorsLayer on the canvas.

### Changes

**7.1 — Cursor presence**

- Remote cursors: Retain arrow shape but smooth the SVG path slightly
- Cursor label: Rounded pill below cursor with user name, glass-morphism background
- Cursor trail: Very subtle 3-point trail that fades (opacity 0.3 → 0.1 → 0.03), using the user's assigned color
- Cursor color: Assigned from a warm palette: coral, amber, sage, mauve, sienna (not primary RGB)

**7.2 — Avatar bar**

- Overlapping circles with 2px `--sn-bg` ring (gap between avatars)
- On hover: avatar lifts (scale 1.1) with name tooltip in glass pill
- "More" indicator: `+3` counter in a small pill, `--sn-surface-elevated` background
- Stagger entrance animation when joining a canvas

---

## Part 8: Typography & Micro-copy

### Changes

**8.1 — Hierarchy system**

| Role | Font | Size | Weight | Color |
|---|---|---|---|---|
| Canvas title | Newsreader | 16px | 500 | `--sn-text` |
| Panel title | Newsreader | 14px | 500 | `--sn-text-muted` |
| Section label | Outfit | 10px caps | 500 | `--sn-text-muted` @ 60% |
| Body / values | Outfit | 13px | 400 | `--sn-text` |
| Input text | Outfit | 13px | 400 | `--sn-text` |
| Button label | Outfit | 12px | 500 | `--sn-text` |
| Tooltip | Outfit | 11px | 400 | `--sn-text-muted` |
| Keyboard hint | DM Mono | 11px | 400 | `--sn-text-muted` |

**8.2 — Tone principles**

All UI copy follows the *Her* emotional register:
- Use sentence case everywhere (not Title Case, not ALL CAPS except section labels)
- Prefer soft verbs: "Place" not "Insert", "Remove" not "Delete", "Adjust" not "Modify"
- Confirmation dialogs: conversational, warm. "Remove this widget? Its saved state will be cleared too."
- Empty states: encouraging, not sterile. "Nothing here yet — drop a widget to get started."

---

## Part 9: Animation Principles

Codify the animation language across the entire canvas UI:

| Category | Duration | Easing | Example |
|---|---|---|---|
| Micro (hover, focus) | 150-180ms | spring | Button hover glow, icon scale |
| Transition (panels, menus) | 250-300ms | spring | Panel slide, menu appear |
| Spatial (drag, move) | 200-250ms | spring | Entity snap, toolbar follow |
| Ambient (background) | 2-8s | linear/sine | RothkoField drift, dash offset |
| Cinematic (focus mode) | 400-500ms | spring | FocusOverlay enter/exit |

Spring easing everywhere: `cubic-bezier(0.16, 1, 0.3, 1)` — this is already used but should be the only easing in the system. No `ease`, no `ease-in-out`, no `linear` except ambient loops.

---

## Part 10: Implementation Phases

### Phase 1 — Foundations + Frosted Glass + Parallax (estimated: 3-4 sessions)
1. Add new tokens to `theme-tokens.ts`: `--sn-surface-elevated`, `--sn-glow`, `--sn-accent-muted`, `--sn-transition-spring`, `--sn-blur-surface`
2. Create the "Ember" theme definition
3. Warm-pass Crystal Light theme
4. Update RothkoField with Ember-specific color bands and vignette
5. Update CursorGlow with dual-ring and `--sn-glow` token
6. **Frosted glass canvas pane**: Restructure CanvasWorkspace layer composition so ambient backgrounds render full-viewport behind a `backdrop-filter: blur(12px)` canvas pane with rounded corners and whisper border
7. **Interactive parallax**: Add mouse-position-driven parallax to ambient background layers (deep/mid/near tiers with different displacement amounts and transition lag)

**Deliverable**: The canvas feels like a frosted glass window floating over a living, breathing, parallax-responsive ambient environment. This is the single most impactful visual change — get it right first.

### Phase 2 — Toolbar Island (estimated: 2-3 sessions)
1. Refactor Toolbar.tsx from full-width bar to floating centered island
2. Extract inline styles to use theme tokens
3. Implement sliding glass tool tray as separate floating element
4. Add spring animations for tray entrance, tool hover, presence stagger
5. Implement preview mode minimization (shrinking island)

**Deliverable**: The toolbar is the most visible UI element. Getting it right sets the tone for everything else.

### Phase 3 — Panel Polish (estimated: 2-3 sessions)
1. Update ShellLayout panel material to new glass treatment
2. Implement `--sn-font-serif` for panel headers
3. Port GlowInput, LiquidToggle, GlowSlider from dev swatches to production panel components
4. Update Layers panel row treatment (accent bar, drag style)
5. Update Properties panel with warm input styling

**Deliverable**: Panels feel like part of the same warm, glassy environment as the toolbar.

### Phase 4 — Selection & Interactions (estimated: 1-2 sessions)
1. Update SelectionOverlay to rounded, glowing treatment
2. Warm ConstellationLines with accent color and animated dash offset
3. Update drag feedback (lift shadow, snap guide colors)
4. Refine FocusOverlay tinting

**Deliverable**: Every interaction on the canvas reinforces the warm, bioluminescent aesthetic.

### Phase 5 — Context Menu & Floating UI (estimated: 1 session)
1. Update CanvasContextMenu with glass material and spring entrance
2. Update EntityFloatingToolbar material and animation
3. Warm the cursor presence layer (trail, label pills, warm color palette)
4. Stagger animation for PresenceAvatarBar

**Deliverable**: The last pieces of chrome are aligned.

### Phase 6 — Typography & Copy Pass (estimated: 1 session)
1. Audit all UI text for case consistency (sentence case)
2. Apply Newsreader to canvas title and panel titles
3. Review all confirmation dialogs and empty states for warm tone
4. Ensure DM Mono is used consistently for keyboard hints

**Deliverable**: The words match the warmth of the visuals.

---

## Architecture Notes

All changes live in `src/shell/**` and `src/canvas/panels/**` — no layer boundary violations. Specifically:

- **Theme tokens**: `src/shell/theme/theme-tokens.ts` (L6)
- **Toolbar**: `src/shell/canvas/panels/Toolbar.tsx` (L4A-4 via shell mount)
- **Panels**: `src/shell/canvas/panels/*` (L4A-4 via shell mount)
- **Ambient effects**: `src/shell/canvas/components/*` (L6)
- **Layout**: `src/shell/layout/ShellLayout.tsx` (L6)
- **Selection overlays**: `src/shell/canvas/components/SelectionOverlay.tsx` (L6)

The bioluminescent primitives from `src/shell/dev/panels/swatches/` (GlowInput, LiquidToggle, GlowSlider, etc.) should be extracted into a shared `src/shell/ui/` directory so both dev swatches and production panels can import them. This is a lateral move within L6 — no boundary issues.

---

## What This Plan Does NOT Change

- **Layer architecture**: No structural changes to L0-L6 boundaries
- **Event bus**: No new event types required (existing `canvas.*` and `shell.theme.*` events suffice)
- **Store schema**: No Zustand store changes beyond adding panel visibility flags to `uiStore` if missing
- **Functional behavior**: All tools, wiring, and pipeline logic remain identical
- **Performance contracts**: RothkoField stays at ~8fps, CursorGlow stays GPU-composited, no new per-frame work

This is a visual-only overhaul. The warm, futuristic aesthetic is achieved entirely through material changes (glass, blur, tokens), color shifts (coral, warm neutrals), typography (serif headers), and refined animation (spring easing, stagger). No new features, no new architecture.
