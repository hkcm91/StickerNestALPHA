---
name: scaffold-widget
description: Generate a complete widget scaffold with TypeScript class, Zod schema, event bus registration, barrel export update, and test file
arguments:
  - name: widget-name
    description: PascalCase name for the widget (e.g., Counter, StickyNote)
    required: true
  - name: layer
    description: Target layer (runtime for built-in, marketplace for third-party)
    required: false
    default: runtime
---

# Scaffold Widget

Generate a complete widget scaffold for StickerNest V5.

## Usage

```
/scaffold-widget <WidgetName> [layer]
```

## Generated Files

For a widget named `Counter` in the `runtime` layer:

```
src/runtime/widgets/
├── counter/
│   ├── Counter.tsx           # Widget component
│   ├── counter.schema.ts     # Zod schema for config and state
│   ├── counter.events.ts     # Event type definitions
│   ├── counter.test.ts       # Vitest test file
│   └── index.ts              # Barrel export
```

## File Templates

### 1. Widget Component (`Counter.tsx`)

```typescript
import { useEffect, useCallback } from 'react';
import type { WidgetProps } from '@sn/types';
import { CounterConfig, CounterState } from './counter.schema';

/**
 * Counter Widget
 *
 * [Brief description of widget functionality]
 */
export function Counter({
  instanceId,
  config,
  state,
  onStateChange,
  onEmit,
  theme
}: WidgetProps<CounterConfig, CounterState>) {

  // Event handlers
  const handleAction = useCallback(() => {
    // Emit event via bridge
    onEmit('counter.action', { instanceId, value: state.value });

    // Update local state
    onStateChange({ ...state, value: state.value + 1 });
  }, [instanceId, state, onEmit, onStateChange]);

  // Lifecycle
  useEffect(() => {
    // Widget mounted - signal ready
    return () => {
      // Widget unmounting - cleanup
    };
  }, []);

  return (
    <div
      className="sn-widget sn-counter"
      style={{
        backgroundColor: theme['--sn-surface'],
        color: theme['--sn-text'],
        borderRadius: theme['--sn-radius'],
        fontFamily: theme['--sn-font-family'],
      }}
    >
      {/* Widget content */}
      <div className="counter-display">{state.value}</div>
      <button onClick={handleAction}>Increment</button>
    </div>
  );
}

Counter.displayName = 'Counter';
```

### 2. Zod Schema (`counter.schema.ts`)

```typescript
import { z } from 'zod';

/**
 * Configuration schema for Counter widget.
 * Set by canvas owner in properties panel.
 */
export const CounterConfigSchema = z.object({
  initialValue: z.number().default(0),
  step: z.number().default(1),
  min: z.number().optional(),
  max: z.number().optional(),
  label: z.string().default('Counter'),
});

export type CounterConfig = z.infer<typeof CounterConfigSchema>;

/**
 * State schema for Counter widget.
 * Persisted per-instance in widget_instances table.
 */
export const CounterStateSchema = z.object({
  value: z.number(),
  lastUpdated: z.string().datetime().optional(),
});

export type CounterState = z.infer<typeof CounterStateSchema>;

/**
 * Default state factory
 */
export function createDefaultState(config: CounterConfig): CounterState {
  return {
    value: config.initialValue,
    lastUpdated: undefined,
  };
}

/**
 * JSON Schema exports for widget manifest
 */
export const CounterConfigJSONSchema = CounterConfigSchema.toJSONSchema();
export const CounterStateJSONSchema = CounterStateSchema.toJSONSchema();
```

### 3. Event Definitions (`counter.events.ts`)

```typescript
import { z } from 'zod';
import type { BusEvent } from '@sn/types';

/**
 * Events emitted by Counter widget
 */
export const CounterEvents = {
  /** Emitted when counter value changes */
  ACTION: 'counter.action',
  /** Emitted when counter reaches max value */
  MAX_REACHED: 'counter.maxReached',
  /** Emitted when counter reaches min value */
  MIN_REACHED: 'counter.minReached',
} as const;

/**
 * Event payload schemas
 */
export const CounterActionPayloadSchema = z.object({
  instanceId: z.string().uuid(),
  value: z.number(),
  previousValue: z.number().optional(),
});

export type CounterActionPayload = z.infer<typeof CounterActionPayloadSchema>;

/**
 * Type-safe event creators
 */
export function createCounterActionEvent(
  payload: CounterActionPayload
): BusEvent<CounterActionPayload> {
  return {
    type: CounterEvents.ACTION,
    payload,
  };
}
```

### 4. Test File (`counter.test.ts`)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Counter } from './Counter';
import { CounterConfigSchema, CounterStateSchema, createDefaultState } from './counter.schema';
import { createCounterActionEvent } from './counter.events';

describe('Counter Widget', () => {
  const mockConfig = CounterConfigSchema.parse({});
  const mockState = createDefaultState(mockConfig);
  const mockOnStateChange = vi.fn();
  const mockOnEmit = vi.fn();
  const mockTheme = {
    '--sn-bg': '#ffffff',
    '--sn-surface': '#f5f5f5',
    '--sn-text': '#000000',
    '--sn-radius': '8px',
    '--sn-font-family': 'system-ui',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default state', () => {
      render(
        <Counter
          instanceId="test-instance"
          config={mockConfig}
          state={mockState}
          onStateChange={mockOnStateChange}
          onEmit={mockOnEmit}
          theme={mockTheme}
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should apply theme tokens', () => {
      const { container } = render(
        <Counter
          instanceId="test-instance"
          config={mockConfig}
          state={mockState}
          onStateChange={mockOnStateChange}
          onEmit={mockOnEmit}
          theme={mockTheme}
        />
      );

      const widget = container.querySelector('.sn-counter');
      expect(widget).toHaveStyle({ backgroundColor: '#f5f5f5' });
    });
  });

  describe('Interactions', () => {
    it('should emit event on action', () => {
      render(
        <Counter
          instanceId="test-instance"
          config={mockConfig}
          state={mockState}
          onStateChange={mockOnStateChange}
          onEmit={mockOnEmit}
          theme={mockTheme}
        />
      );

      fireEvent.click(screen.getByText('Increment'));

      expect(mockOnEmit).toHaveBeenCalledWith('counter.action', {
        instanceId: 'test-instance',
        value: 0,
      });
    });

    it('should update state on action', () => {
      render(
        <Counter
          instanceId="test-instance"
          config={mockConfig}
          state={mockState}
          onStateChange={mockOnStateChange}
          onEmit={mockOnEmit}
          theme={mockTheme}
        />
      );

      fireEvent.click(screen.getByText('Increment'));

      expect(mockOnStateChange).toHaveBeenCalledWith({
        ...mockState,
        value: 1,
      });
    });
  });

  describe('Schema Validation', () => {
    it('should validate config schema', () => {
      const result = CounterConfigSchema.safeParse({
        initialValue: 10,
        step: 5,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.initialValue).toBe(10);
        expect(result.data.step).toBe(5);
      }
    });

    it('should apply config defaults', () => {
      const result = CounterConfigSchema.parse({});

      expect(result.initialValue).toBe(0);
      expect(result.step).toBe(1);
    });

    it('should validate state schema', () => {
      const result = CounterStateSchema.safeParse({
        value: 42,
        lastUpdated: '2024-01-01T00:00:00Z',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Event Creation', () => {
    it('should create properly typed events', () => {
      const event = createCounterActionEvent({
        instanceId: 'test-instance',
        value: 5,
      });

      expect(event.type).toBe('counter.action');
      expect(event.payload.value).toBe(5);
    });
  });
});
```

### 5. Barrel Export (`index.ts`)

```typescript
export { Counter } from './Counter';
export {
  CounterConfigSchema,
  CounterStateSchema,
  createDefaultState,
  type CounterConfig,
  type CounterState,
} from './counter.schema';
export {
  CounterEvents,
  createCounterActionEvent,
  type CounterActionPayload,
} from './counter.events';
```

## Post-Generation Steps

After scaffolding, the skill will:

1. **Update parent barrel export** (`src/runtime/widgets/index.ts`):
   ```typescript
   export * from './counter';
   ```

2. **Register in widget registry** (if applicable)

3. **Output next steps**:
   ```
   Widget scaffolded successfully!

   Next steps:
   1. Implement widget UI in Counter.tsx
   2. Define config options in counter.schema.ts
   3. Add event types in counter.events.ts
   4. Run tests: npm test -- counter
   5. Add Storybook story (optional)
   ```

## Layer-Specific Variations

### Built-in Widgets (`runtime` layer)
- Placed in `src/runtime/widgets/`
- Uses same SDK interface as sandboxed widgets
- No iframe required (trusted code)

### Third-party Widgets (`marketplace` layer)
- Generates single-file HTML format instead
- Includes manifest.json for Marketplace submission
- Designed to run in sandboxed iframe
