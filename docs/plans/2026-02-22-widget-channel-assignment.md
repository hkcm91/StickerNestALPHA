# Widget Channel Assignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional `channel` prop to WidgetFrame that namespaces event routing, then add channel assignment UI to the dev test harness.

**Architecture:** WidgetFrame rewrites bus event types to include a channel prefix when one is set. Empty/missing channel preserves current global broadcast behavior. The SDK, bridge protocol, and widget templates are untouched. The test harness gets a text input per widget for channel assignment.

**Tech Stack:** React, Vitest, Zustand event bus, TypeScript

---

### Task 1: Add `busEventType` helper and `channel` prop to WidgetFrame

**Files:**
- Modify: `src/runtime/WidgetFrame.tsx:46-63` (WidgetFrameProps interface)
- Modify: `src/runtime/WidgetFrame.tsx:120-151` (EMIT, SUBSCRIBE, UNSUBSCRIBE handlers)
- Test: `src/runtime/WidgetFrame.test.tsx`

**Step 1: Write the failing test — channel isolation on EMIT**

Add this test at the end of the existing describe block in `src/runtime/WidgetFrame.test.tsx`:

```tsx
// -----------------------------------------------------------------------
// Channel Routing
// -----------------------------------------------------------------------

it('EMIT with channel routes to widget.{channel}.{eventType} on bus', () => {
  render(<WidgetFrame {...defaultProps} channel="teamA" />);
  const handler = getOnMessageHandler();

  handler({ type: 'EMIT', eventType: 'counter.changed', payload: { count: 5 } });

  expect(bus.emit).toHaveBeenCalledWith('widget.teamA.counter.changed', { count: 5 });
  // Must NOT emit to the global (unchanneled) bus event
  expect(bus.emit).not.toHaveBeenCalledWith('widget.counter.changed', { count: 5 });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/runtime/WidgetFrame.test.tsx --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — `channel` prop doesn't exist on WidgetFrameProps yet.

**Step 3: Add `channel` prop and `busEventType` helper to WidgetFrame**

In `src/runtime/WidgetFrame.tsx`, add to the interface (after line 62):
```ts
  /** Optional channel namespace for event routing isolation */
  channel?: string;
```

Add the helper function before `WidgetIframe` (around line 64):
```ts
/**
 * Computes the bus event type, optionally namespaced by channel.
 * No channel = global: `widget.counter.changed`
 * Channel "A" = isolated: `widget.A.counter.changed`
 */
function busEventType(channel: string | undefined, eventType: string): string {
  return channel ? `widget.${channel}.${eventType}` : `widget.${eventType}`;
}
```

Destructure `channel` from props in `WidgetIframe` (line 69):
```ts
const { widgetId, instanceId, widgetHtml, config, theme, visible, width, height, channel } = props;
```

Modify the EMIT handler (line 122):
```ts
// Old:
bus.emit(`widget.${message.eventType}`, message.payload);
// New:
bus.emit(busEventType(channel, message.eventType), message.payload);
```

Modify the SUBSCRIBE handler (line 127):
```ts
// Old:
const busEventType = `widget.${eventType}`;
// New:
const resolvedBusType = busEventType(channel, eventType);
```
And update the `bus.subscribe` call on line 130 to use `resolvedBusType`:
```ts
const unsubscribe = bus.subscribe(resolvedBusType, (busEvent: unknown) => {
```

Modify the UNSUBSCRIBE handler — no change needed since it uses the map key (which is `eventType`, not the bus type). The stored unsubscribe function already targets the correct bus event.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/runtime/WidgetFrame.test.tsx --reporter=verbose 2>&1 | tail -20`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/runtime/WidgetFrame.tsx src/runtime/WidgetFrame.test.tsx
git commit -m "feat(runtime): add channel prop to WidgetFrame for event routing isolation"
```

---

### Task 2: Test backward compatibility — no channel = global routing

**Files:**
- Test: `src/runtime/WidgetFrame.test.tsx`

**Step 1: Write the test — no channel preserves current behavior**

```tsx
it('EMIT without channel routes to global widget.{eventType} (backward-compatible)', () => {
  render(<WidgetFrame {...defaultProps} />);
  const handler = getOnMessageHandler();

  handler({ type: 'EMIT', eventType: 'counter.changed', payload: { count: 10 } });

  expect(bus.emit).toHaveBeenCalledWith('widget.counter.changed', { count: 10 });
});
```

**Step 2: Run test to verify it passes**

This should already pass since empty channel = current behavior.

Run: `npx vitest run src/runtime/WidgetFrame.test.tsx --reporter=verbose 2>&1 | tail -20`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/runtime/WidgetFrame.test.tsx
git commit -m "test(runtime): verify channel-less WidgetFrame backward compatibility"
```

---

### Task 3: Test SUBSCRIBE with channel

**Files:**
- Test: `src/runtime/WidgetFrame.test.tsx`

**Step 1: Write the failing test — SUBSCRIBE with channel subscribes to namespaced bus event**

```tsx
it('SUBSCRIBE with channel subscribes to widget.{channel}.{eventType}', () => {
  render(<WidgetFrame {...defaultProps} channel="teamB" />);
  const handler = getOnMessageHandler();

  handler({ type: 'SUBSCRIBE', eventType: 'counter.changed' });

  // bus.subscribe should have been called with the channeled event type
  expect(bus.subscribe).toHaveBeenCalledWith(
    'widget.teamB.counter.changed',
    expect.any(Function),
  );
});
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run src/runtime/WidgetFrame.test.tsx --reporter=verbose 2>&1 | tail -20`
Expected: ALL PASS (the SUBSCRIBE handler was updated in Task 1)

**Step 3: Commit**

```bash
git add src/runtime/WidgetFrame.test.tsx
git commit -m "test(runtime): verify SUBSCRIBE with channel targets correct bus namespace"
```

---

### Task 4: Test cleanup on unmount with channel

**Files:**
- Test: `src/runtime/WidgetFrame.test.tsx`

**Step 1: Write the test — bus subscriptions cleaned up on unmount with channel**

```tsx
it('channel bus subscriptions are cleaned up on unmount', () => {
  const mockUnsub = vi.fn();
  (bus.subscribe as ReturnType<typeof vi.fn>).mockReturnValue(mockUnsub);

  const { unmount } = render(<WidgetFrame {...defaultProps} channel="cleanup" />);
  const handler = getOnMessageHandler();

  handler({ type: 'SUBSCRIBE', eventType: 'some.event' });

  unmount();

  expect(mockUnsub).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run src/runtime/WidgetFrame.test.tsx --reporter=verbose 2>&1 | tail -20`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/runtime/WidgetFrame.test.tsx
git commit -m "test(runtime): verify channel subscription cleanup on unmount"
```

---

### Task 5: Update TestHarness widget state type

**Files:**
- Modify: `src/shell/dev/TestHarness.tsx:64` (activeWidgets state type)
- Modify: `src/shell/dev/TestHarness.tsx:175-178` (addWidget function)
- Modify: `src/shell/dev/panels/WidgetRuntimePanel.tsx:14-16` (props interface)

**Step 1: Update `activeWidgets` state type in TestHarness**

In `src/shell/dev/TestHarness.tsx` line 64, change:
```ts
// Old:
const [activeWidgets, setActiveWidgets] = useState<{ id: string; type: string }[]>([]);
// New:
const [activeWidgets, setActiveWidgets] = useState<{ id: string; type: string; channel: string }[]>([]);
```

**Step 2: Update `addWidget` function in TestHarness**

In `src/shell/dev/TestHarness.tsx` lines 175-178, change:
```ts
// Old:
const addWidget = (type: string) => {
  const id = `widget-${Date.now()}`;
  setActiveWidgets((prev) => [...prev, { id, type }]);
  bus.emit(WidgetEvents.MOUNTED, { widgetId: id, type });
};
// New:
const addWidget = (type: string, channel = '') => {
  const id = `widget-${Date.now()}`;
  setActiveWidgets((prev) => [...prev, { id, type, channel }]);
  bus.emit(WidgetEvents.MOUNTED, { widgetId: id, type });
};
```

**Step 3: Update WidgetRuntimePanel props interface**

In `src/shell/dev/panels/WidgetRuntimePanel.tsx` line 14, change:
```ts
// Old:
activeWidgets: { id: string; type: string }[];
// New:
activeWidgets: { id: string; type: string; channel: string }[];
```

**Step 4: Run build to verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (or only pre-existing ones)

**Step 5: Commit**

```bash
git add src/shell/dev/TestHarness.tsx src/shell/dev/panels/WidgetRuntimePanel.tsx
git commit -m "feat(shell): update widget state type to include channel field"
```

---

### Task 6: Add channel UI to WidgetRuntimePanel

**Files:**
- Modify: `src/shell/dev/panels/WidgetRuntimePanel.tsx`

**Step 1: Add `updateWidgetChannel` prop and channel text input**

Update the props interface:
```ts
export interface WidgetRuntimePanelProps {
  activeWidgets: { id: string; type: string; channel: string }[];
  addWidget: (type: string, channel?: string) => void;
  removeWidget: (id: string) => void;
  clearWidgets: () => void;
  updateWidgetChannel: (id: string, channel: string) => void;
}
```

Add `updateWidgetChannel` to the component destructuring.

In the widget card rendering (inside the `.map()` around line 46), add a channel input between the header bar and the WidgetFrame:
```tsx
<div style={{ padding: '2px 5px', background: '#2a2a2a', display: 'flex', alignItems: 'center', gap: 4 }}>
  <span style={{ fontSize: 9, color: '#888' }}>ch:</span>
  <input
    type="text"
    value={w.channel}
    onChange={(e) => updateWidgetChannel(w.id, e.target.value)}
    placeholder="(global)"
    style={{
      width: 60, fontSize: 9, padding: '1px 3px',
      background: '#444', color: '#fff', border: '1px solid #555',
    }}
  />
</div>
```

Pass channel to WidgetFrame:
```tsx
<WidgetFrame
  widgetId={w.type}
  instanceId={w.id}
  widgetHtml={getWidgetHtml(w.type)}
  config={{}}
  theme={DEFAULT_WIDGET_THEME}
  visible={true}
  width={180}
  height={100}
  channel={w.channel || undefined}
/>
```

**Step 2: Add `updateWidgetChannel` to TestHarness**

In `src/shell/dev/TestHarness.tsx`, add after `removeWidget`:
```ts
const updateWidgetChannel = (id: string, channel: string) => {
  setActiveWidgets((prev) =>
    prev.map((w) => (w.id === id ? { ...w, channel } : w)),
  );
};
```

Update the `<WidgetRuntimePanel>` props at line 251:
```tsx
<WidgetRuntimePanel
  activeWidgets={activeWidgets} addWidget={addWidget}
  removeWidget={removeWidget} clearWidgets={() => setActiveWidgets([])}
  updateWidgetChannel={updateWidgetChannel}
/>
```

**Step 3: Update bus action buttons to target channels**

In `WidgetRuntimePanel.tsx`, replace the existing bus action buttons section (around line 36-41) with channel-aware versions. Add a channel input for the bus actions:

```tsx
<div style={{ marginBottom: 10 }}>
  <label style={{ fontSize: 10, marginRight: 5 }}>Bus channel:</label>
  <input
    id="bus-channel"
    type="text"
    placeholder="(global)"
    style={{
      width: 60, fontSize: 10, padding: '1px 3px', marginRight: 5,
      background: '#444', color: '#fff', border: '1px solid #555',
    }}
  />
  <button
    onClick={() => {
      const ch = (document.getElementById('bus-channel') as HTMLInputElement)?.value || '';
      const prefix = ch ? `widget.${ch}.` : 'widget.';
      bus.emit(`${prefix}counter.set`, { value: 42 });
    }}
    style={{ marginRight: 5 }}
  >
    Set Counter=42
  </button>
  <button
    onClick={() => {
      const ch = (document.getElementById('bus-channel') as HTMLInputElement)?.value || '';
      const prefix = ch ? `widget.${ch}.` : 'widget.';
      bus.emit(`${prefix}display.ping`, {});
    }}
    style={{ marginRight: 5 }}
  >
    Ping Display
  </button>
</div>
```

**Step 4: Verify in browser**

Run: Start/reload dev server, navigate to `/dev/test`.
1. Add two Counters, set one channel to "A" and the other to "B"
2. Add a Display, set channel to "A"
3. Click Counter A — Display should update. Click Counter B — Display should NOT update.
4. Use "Set Counter=42" with bus channel "A" — only Counter A should update.

**Step 5: Commit**

```bash
git add src/shell/dev/panels/WidgetRuntimePanel.tsx src/shell/dev/TestHarness.tsx
git commit -m "feat(shell): add channel assignment UI to widget runtime test panel"
```

---

### Task 7: Final verification

**Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass including new channel tests.

**Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new type errors.

**Step 3: Manual verification in test harness**

Verify in browser at `/dev/test`:
- Two Counters on different channels don't interfere
- Counter and Display on same channel communicate correctly
- Widgets with no channel still work (global broadcast)
- Bus action buttons with channel input target correct namespace

**Step 4: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore(runtime): channel assignment cleanup and verification"
```
