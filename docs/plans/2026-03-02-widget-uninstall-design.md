# Widget Uninstall Feature Design

**Date:** 2026-03-02
**Status:** Approved
**Scope:** `src/shell/pages/MarketplacePageFull.tsx` (UI-only change)

## Problem

Users can install widgets from the Marketplace but have no way to uninstall them.
The "Installed" button in both the detail view and listing cards is disabled with
no further action available. Users need a way to remove third-party widgets they
no longer want, while built-in widgets must remain protected.

## Decision

Add uninstall UI to `MarketplacePageFull.tsx` only. The entire backend chain
already supports uninstall — only the UI layer is missing.

### Approach Chosen: Marketplace-Only Uninstall

The Marketplace is the install/uninstall surface. Users install from here; they
remove from here. This keeps the change to a single file and avoids cluttering
the canvas asset panel with destructive actions.

**Rejected alternative:** Adding uninstall to `AssetPanel.tsx` via right-click
context menu. Deferred as a future follow-up if users request it. The asset
panel is already ~51KB and the risk of accidental uninstall during canvas work
outweighs the convenience.

## Existing Backend (No Changes Needed)

| Module | Function | What It Does |
|--------|----------|--------------|
| `install-flow.ts` | `uninstall(userId, widgetId, { confirmed })` | Orchestrates: emit bus event, call API, remove from store |
| `installation.ts` | `uninstall(userId, widgetId)` | Deletes from `user_installed_widgets` table |
| `widget.store.ts` | `unregisterWidget(widgetId)` | Removes widget from Zustand registry |
| `marketplace-api.ts` | `uninstall` | Exposes `installation.uninstall` |

The `install-flow.ts` service requires `options.confirmed === true` before
proceeding. This enforces the L5 rule: "Do not silently delete widget state
on uninstall -- always confirm."

## UI Changes in MarketplacePageFull.tsx

### New State

```typescript
const [uninstallStatus, setUninstallStatus] = useState<
  Record<string, 'uninstalling' | 'uninstalled' | 'error'>
>({});
const [confirmingUninstall, setConfirmingUninstall] = useState<string | null>(null);
```

### Built-in Protection

```typescript
const isBuiltIn = useCallback((widgetId: string) => {
  return widgetRegistry[widgetId]?.isBuiltIn === true;
}, [widgetRegistry]);
```

Built-in widgets (`isBuiltIn === true`) show a "Built-in" label instead of
"Uninstall". They cannot be removed.

### Button States

**Detail view:**
- Not installed: "Install" button (primary style) -- existing behavior
- Installed + built-in: "Built-in" label (disabled, muted)
- Installed + not built-in: "Uninstall" button (danger style, red)

**Listing cards:**
- Same three states as labels/badges on the card

### Confirmation Flow

When the user clicks "Uninstall":

1. Set `confirmingUninstall` to the widget ID
2. Show inline confirmation: "This will remove the widget and delete all saved
   state. Are you sure?"
3. Two buttons: "Cancel" (dismisses) / "Yes, Uninstall" (proceeds)
4. On confirm: call `installService.uninstall(userId, widgetId, { confirmed: true })`
5. On success: widget removed from registry, button changes to "Install"
6. On error: show error message, restore previous state

### After Uninstall

- Widget disappears from asset panel (removed from `widgetStore.registry`)
- `WIDGET_UNINSTALLED` bus event fires -- Runtime handles canvas instance cleanup
- Widget listing remains visible in Marketplace with "Install" button (re-installable)

### Styling

```typescript
const btnDanger = {
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  background: '#dc2626',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const labelBuiltIn = {
  padding: '4px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 12,
  fontWeight: 500,
};
```

## Files Modified

| File | Action |
|------|--------|
| `src/shell/pages/MarketplacePageFull.tsx` | EDIT -- add uninstall button, confirmation dialog, built-in protection |

## Files NOT Modified

- `src/marketplace/install/install-flow.ts` -- uninstall logic already complete
- `src/marketplace/api/installation.ts` -- API already complete
- `src/marketplace/api/marketplace-api.ts` -- already exposes uninstall
- `src/kernel/stores/widget/widget.store.ts` -- `unregisterWidget` already exists
- `src/shell/canvas/panels/AssetPanel.tsx` -- deferred to future follow-up

## Verification

1. Start dev server, navigate to `/marketplace`
2. Installed non-built-in widget shows "Uninstall" button in detail view
3. Clicking "Uninstall" shows confirmation dialog
4. Clicking "Cancel" dismisses without action
5. Clicking "Yes, Uninstall" removes widget; button changes to "Install"
6. Built-in widgets show "Built-in" label, no uninstall option
7. Uninstalled widget no longer appears in canvas asset panel
8. Widget can be re-installed from Marketplace after uninstall
9. `npm run typecheck` passes
