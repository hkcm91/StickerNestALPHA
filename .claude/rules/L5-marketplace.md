# Layer 5 — Marketplace Rules
# Applies to: `src/marketplace/**`

## Identity and Responsibility

Layer 5 is the widget marketplace: discovery, installation, ratings, and
publishing for both first-party and third-party widgets. It is a consumer
of all lower layers — it uses the kernel for types and auth, the event bus
for install events, and Canvas Core types for widget placement previews.

Marketplace layer owns:
- Widget listing and discovery (search, browse, categories, featured)
- Widget detail page (description, screenshots, manifest preview, reviews)
- Installation flow: download manifest + HTML, register in `widgetStore`
- Uninstallation flow: remove from `widgetStore`, confirm state deletion
- Publisher dashboard: submit, update, deprecate widgets (wraps Lab publish pipeline)
- Ratings and reviews
- License metadata per widget (MIT, proprietary, no-fork, etc.)

---

## Import Rules — STRICTLY ENFORCED

- You MAY import from `src/kernel/**` (Layer 0)
- You MAY import from `src/social/**` (Layer 1)
- You MAY import from `src/runtime/**` (Layer 3)
- You MAY import from `src/canvas/core/**` (Layer 4A-1) for entity types only
- You MUST NOT import from `src/lab/**`, `src/canvas/tools/**`,
  `src/canvas/wiring/**`, `src/canvas/panels/**`,
  `src/spatial/**`, or `src/shell/**`

---

## Widget Listing

- Widgets are fetched from the Marketplace API (Supabase backend via kernel client)
- List view: grid of cards (thumbnail, name, author, rating, install count)
- Search: full-text on name, description, tags
- Categories: productivity, games, data, social, utilities, etc.
- Featured section: curated by platform
- Pagination or infinite scroll required — do not load all widgets at once

---

## Installation Flow

1. User clicks Install on a widget
2. Fetch widget HTML + manifest from Marketplace API
3. Validate manifest against `WidgetManifest` schema from `@sn/types`
4. If validation passes: register widget in `widgetStore` via bus event
5. Emit `marketplace.widget.installed` bus event
6. Show success confirmation; widget is now available in the canvas asset panel

If validation fails: show specific error, do not install.

---

## Uninstallation Flow

1. User requests uninstall
2. Show confirmation dialog: "This will also delete all saved state for this widget"
3. On confirm: emit `marketplace.widget.uninstalled` bus event
4. Remove widget from `widgetStore`
5. State deletion is handled by the Runtime layer in response to the bus event

Do not silently delete state — always confirm with the user first.

---

## License Enforcement

- Every widget listing includes a license field
- Licenses that prohibit forking must be respected — the import/fork action in Lab
  checks this field before loading source
- Display license clearly on the widget detail page
- License types to support at minimum: `MIT`, `Apache-2.0`, `proprietary`, `no-fork`

---

## Publisher Dashboard

- Authenticated creators can access their published widgets
- Actions: update (new version), deprecate (hide from discovery, existing installs work),
  delete (removes listing; existing installs show a "deprecated" badge)
- Version history: each publish creates a new version entry
- The publish action here is the final step of the Lab publish pipeline (L2)

---

## Testing Requirements

1. **Install flow** — valid widget installs successfully; `widgetStore` contains the new entry; bus event emitted
2. **Manifest validation on install** — widget with invalid manifest is rejected with specific error message
3. **Uninstall confirmation** — user must confirm before uninstall proceeds; cancelling leaves widget intact
4. **License display** — `no-fork` licensed widget shows correct license badge on detail page
5. **Search** — querying a known widget name returns it in results; empty query returns full list

---

## What You Must Not Do

- Do not import from Lab, canvas tools, wiring, panels, spatial, or shell
- Do not skip manifest validation on install — invalid widgets must never reach widgetStore
- Do not silently delete widget state on uninstall — always confirm
- Do not load all marketplace widgets at once — paginate
- Do not store API keys or secrets in this layer — all external calls go through the kernel Supabase client
