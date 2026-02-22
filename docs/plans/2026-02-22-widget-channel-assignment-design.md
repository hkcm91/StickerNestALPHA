# Widget Channel Assignment

## Problem

When multiple widgets of the same type exist on a canvas, they all share the
same event channel. Two Counter widgets and a Display widget all emit and
subscribe to `widget.counter.changed`, making it impossible to pair specific
widgets for isolated communication.

## Decision

Add an optional `channel` prop to `WidgetFrame` that namespaces all event
routing for that instance. Widgets remain unmodified — the host rewrites event
types transparently. Empty channel preserves current global broadcast behavior.

## Event Routing

```
channel = undefined:  widget.counter.changed        (global, current behavior)
channel = "teamA":    widget.teamA.counter.changed   (isolated to teamA)
channel = "teamB":    widget.teamB.counter.changed   (isolated to teamB)
```

A widget on channel "teamA" only hears events from other widgets on "teamA".
A widget with no channel hears all global (unchanneled) events. There is no
cross-channel leakage.

## Production Changes (L3: Runtime)

### WidgetFrame.tsx

1. Add `channel?: string` to `WidgetFrameProps`.

2. Add helper:
   ```ts
   function busEventType(channel: string | undefined, eventType: string): string {
     return channel ? `widget.${channel}.${eventType}` : `widget.${eventType}`;
   }
   ```

3. Modify three message handlers:
   - **EMIT**: `bus.emit(busEventType(channel, message.eventType), message.payload)`
   - **SUBSCRIBE**: subscribe to `busEventType(channel, eventType)` on the bus
   - **UNSUBSCRIBE**: unsubscribe from `busEventType(channel, eventType)`

### What does NOT change

- SDK template (`sdk-template.ts`)
- Bridge protocol (`message-types.ts`)
- Widget HTML templates
- All existing bus patterns when channel is empty

## Dev Tool Changes (L6: Shell)

### WidgetRuntimePanel.tsx

1. Expand widget instance shape: `{ id: string; type: string; channel: string }`.
2. Add a text input per widget instance for free-form channel name.
3. Pass `channel={w.channel}` to `WidgetFrame`.
4. Update bus action buttons (e.g., "Set Counter=42") to include a channel
   input so they target the correct namespace.

### TestHarness.tsx

1. Update `addWidget` to accept a channel parameter (default empty string).
2. Update `activeWidgets` state type.

## Testing

| Test | What it verifies |
|------|-----------------|
| Two WidgetFrames, same widgetId, different channels — EMIT from one does not reach the other | Channel isolation |
| WidgetFrame with no channel works identically to current behavior | Backward compatibility |
| SUBSCRIBE with channel subscribes to `widget.{channel}.{eventType}` | Correct bus subscription |
| UNSUBSCRIBE with channel removes the correct bus subscription | Cleanup correctness |
| Channel-specific bus buttons in test harness target correct namespace | Dev tool UX |

## Future

The `channel` prop maps directly to what the Pipeline layer (L4A-3) will need
for wiring widget outputs to widget inputs. A pipeline edge connecting Counter A
to Display A would set both to the same channel. This design intentionally
prepares for that without depending on it.
