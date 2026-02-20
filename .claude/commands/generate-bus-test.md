# Generate Event Bus Integration Test

Generate a full integration test for event bus communication between two widget types.

## Usage

```
/generate-bus-test <widget-a-path> <widget-b-path>
```

## Instructions

When invoked, this command will:

1. **Read both widget source files** to understand their event contracts
2. **Extract event types** from their manifests (emits/subscribes)
3. **Generate integration test** that verifies cross-widget communication

## Test Pattern

```
Widget A emits → EventRecorder captures → assert Widget B updated state
```

## Generated Test Structure

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from '@sn/types';
import { EventRecorder } from '../test-utils/event-recorder';

// Import widget types
import { WidgetA } from './path-to-widget-a';
import { WidgetB } from './path-to-widget-b';

describe('WidgetA → WidgetB Integration', () => {
  let bus: EventBus;
  let recorder: EventRecorder;
  let widgetA: WidgetA;
  let widgetB: WidgetB;

  beforeEach(() => {
    vi.useFakeTimers();
    bus = createTestBus();
    recorder = new EventRecorder(bus);

    // Instantiate widgets with shared bus
    widgetA = createWidgetA({ bus });
    widgetB = createWidgetB({ bus });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    recorder.clear();
  });

  describe('Event Flow: [EventType]', () => {
    it('should emit event from Widget A', async () => {
      // Trigger action on Widget A
      widgetA.triggerAction();

      // Verify event was emitted
      expect(recorder.hasEvent('[event.type]')).toBe(true);
      expect(recorder.getLastEvent('[event.type]').payload).toMatchObject({
        // Expected payload shape
      });
    });

    it('should receive event in Widget B', async () => {
      // Trigger action on Widget A
      widgetA.triggerAction();

      // Advance timers for debounced handlers
      vi.advanceTimersByTime(100);

      // Verify Widget B state updated
      expect(widgetB.getState()).toMatchObject({
        // Expected state after receiving event
      });
    });

    it('should handle debounced events correctly', async () => {
      // Emit multiple events rapidly
      widgetA.triggerAction();
      widgetA.triggerAction();
      widgetA.triggerAction();

      vi.advanceTimersByTime(100);

      // Verify debounce behavior
      expect(recorder.getEventCount('[event.type]')).toBe(1); // or 3 if not debounced
    });
  });

  describe('Spatial Event Handling', () => {
    it('should handle VR-emitted event with spatial field in 2D widget', async () => {
      // Emit event with SpatialContext (simulating VR origin)
      bus.emit({
        type: '[event.type]',
        payload: { /* ... */ },
        spatial: {
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          normal: { x: 0, y: 1, z: 0 }
        }
      });

      vi.advanceTimersByTime(100);

      // Verify 2D widget handles it correctly (spatial may be ignored or transformed)
      expect(widgetB.getState()).toBeDefined();
    });

    it('should handle 2D event without spatial field in VR widget', async () => {
      // Emit event without SpatialContext
      bus.emit({
        type: '[event.type]',
        payload: { /* ... */ }
        // No spatial field
      });

      vi.advanceTimersByTime(100);

      // Verify VR widget handles missing spatial gracefully
      expect(widgetB.getState()).toBeDefined();
    });
  });
});
```

## EventRecorder Utility

The test expects an `EventRecorder` utility at `src/kernel/test-utils/event-recorder.ts`:

```typescript
export class EventRecorder {
  private events: BusEvent[] = [];

  constructor(bus: EventBus) {
    bus.subscribe('*', (event) => {
      this.events.push(event);
    });
  }

  hasEvent(type: string): boolean {
    return this.events.some(e => e.type === type);
  }

  getLastEvent(type: string): BusEvent | undefined {
    return [...this.events].reverse().find(e => e.type === type);
  }

  getEventCount(type: string): number {
    return this.events.filter(e => e.type === type).length;
  }

  getAllEvents(type?: string): BusEvent[] {
    return type ? this.events.filter(e => e.type === type) : this.events;
  }

  clear(): void {
    this.events = [];
  }
}
```

## Notes

- Always use `vi.useFakeTimers()` for debounced event testing
- Include spatial event tests for VR ↔ 2D interoperability
- Verify both emit and receive sides of the contract
- Test error handling when events have malformed payloads
