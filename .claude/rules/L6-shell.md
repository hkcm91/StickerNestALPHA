# Layer 6 — Shell Rules
# Applies to: `src/shell/**`

## Identity and Responsibility

Layer 6 is the outermost application shell — the top-level React tree that
composes all layers together into the running application. It owns routing,
authentication gating, layout, global keyboard shortcuts, and the app-level
theme system. Shell is the only layer that may import from all other layers.

Shell owns:
- Application router (React Router or similar)
- Route guards: auth-required routes, role-based access, tier-gating
- Top-level layout: sidebar, header, canvas viewport, panel slots
- Global keyboard shortcut registry
- Theme system: dark/light/custom themes, CSS variable injection
- Onboarding flows: workspace creation, invite acceptance
- Error boundary at the application level
- PWA / offline shell behavior

---

## Import Rules

Shell is the integration layer. It MAY import from all layers:
- `src/kernel/**` (Layer 0)
- `src/social/**` (Layer 1)
- `src/runtime/**` (Layer 3)
- `src/canvas/core/**` (Layer 4A-1)
- `src/spatial/**` (Layer 4B)
- `src/marketplace/**` (Layer 5)

Shell MUST NOT import from:
- `src/lab/**` (L2) — Lab has its own route; shell only mounts it at the route level
- `src/canvas/tools/**`, `src/canvas/wiring/**`, `src/canvas/panels/**`
  — these mount themselves via Canvas Core; shell doesn't orchestrate them directly

Do not use Shell as a dumping ground for logic that belongs in a specific layer.
If it is not routing, layout, theming, or auth gating — it does not belong here.

---

## Routing

- Routes:
  - `/` — workspace home / dashboard
  - `/canvas/:canvasId` — canvas view (edit or preview depending on role)
  - `/canvas/:slug` — public/embed view (always preview mode)
  - `/lab` — Widget Lab (Creator+ tier only; gated at route level)
  - `/marketplace` — Marketplace
  - `/settings` — user and workspace settings
  - `/invite/:token` — invite acceptance flow
- Route guards run before component mount — do not gate inside components
- Unauthenticated users hitting a protected route are redirected to `/login`
- Creator+ tier gate on `/lab` — redirect non-creators to upgrade prompt

---

## Authentication Gating

- Auth state comes from `authStore` (Layer 0)
- Protected routes check `authStore.session` before rendering
- Role checks (owner, editor, viewer) are enforced at the canvas route level
- Do not re-implement auth logic in Shell — use the kernel auth API

---

## Layout

- Shell provides named layout slots: `<CanvasViewport>`, `<SidebarLeft>`,
  `<SidebarRight>`, `<TopBar>`, `<BottomBar>`
- Canvas panels mount into these slots based on the active mode
- Shell does not know the details of what is in each slot — it only provides
  the mounting points
- Layout is responsive for desktop browsers; canvas route shows a mobile
  redirect prompt on narrow viewports (same rule as Lab)

---

## Theme System

- Theme tokens are defined here and injected as CSS custom properties on `<html>`
- Standard tokens: `--sn-bg`, `--sn-surface`, `--sn-accent`, `--sn-text`,
  `--sn-text-muted`, `--sn-border`, `--sn-radius`, `--sn-font-family`
- Theme changes emit a `shell.theme.changed` bus event so Runtime can forward
  updated tokens to widget iframes
- Built-in themes: `light`, `dark`, `high-contrast`
- Custom workspace themes override the built-ins

---

## Global Keyboard Shortcuts

- Registered in a central shortcut registry (not scattered across components)
- Shortcuts are scoped: canvas shortcuts are inactive in Lab; Lab shortcuts are
  inactive on canvas
- Common shortcuts: Undo (Cmd/Ctrl+Z), Redo (Cmd/Ctrl+Shift+Z), Save (Cmd/Ctrl+S),
  toggle sidebar, toggle preview/edit mode
- Emit bus events for shortcuts — do not call store actions directly from shortcut handlers

---

## Error Boundary

- Application-level error boundary wraps the entire app
- On unhandled error: show a recovery UI with "Reload" option; log the error
- Canvas-level errors (widget crash) are caught by WidgetFrame (Layer 3), not here
- Shell error boundary is the last resort — not the first line of defense

---

## Testing Requirements

1. **Auth guard** — unauthenticated request to `/canvas/:id` redirects to `/login`
2. **Lab tier gate** — non-Creator+ user hitting `/lab` sees upgrade prompt, not IDE
3. **Theme token injection** — switching to dark theme injects correct CSS variables on `<html>`
4. **Theme bus event** — theme change emits `shell.theme.changed` with full token map
5. **Route rendering** — each top-level route renders its root component without errors (smoke test)

---

## What You Must Not Do

- Do not implement business logic in Shell — it is layout and routing only
- Do not import from Lab internals, canvas tools, canvas wiring, or canvas panels
- Do not re-implement auth — use kernel auth API
- Do not scatter keyboard shortcut handlers across components — use the central registry
- Do not catch widget crashes here — WidgetFrame handles those
- Do not use Shell as a catch-all for logic that belongs in a specific layer
