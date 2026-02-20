import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useEffect } from 'react';

/**
 * WidgetFrame Stories
 *
 * These stories demonstrate the widget container/frame concept for StickerNest V5.
 * The WidgetFrame is the sandboxed iframe host component (L3: Runtime) that
 * renders all widgets - both built-in and third-party.
 *
 * Key states demonstrated:
 * - Loading: Widget HTML is being parsed and SDK injected
 * - Ready: Widget has called StickerNest.ready()
 * - Error: Widget crashed or failed validation
 * - Themed: Widget consuming theme tokens from host
 */

// Mock WidgetFrame component for demonstration
// In production, this would import from src/runtime/WidgetFrame.tsx
interface WidgetFrameProps {
  /** Widget HTML source (srcdoc blob) */
  widgetHtml?: string;
  /** Simulated loading state */
  isLoading?: boolean;
  /** Simulated error state */
  hasError?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Widget dimensions */
  width?: number;
  height?: number;
  /** Show debug border */
  showDebugBorder?: boolean;
}

const WidgetFrame: React.FC<WidgetFrameProps> = ({
  widgetHtml,
  isLoading = false,
  hasError = false,
  errorMessage = 'Widget failed to load',
  width = 300,
  height = 200,
  showDebugBorder = false,
}) => {
  const containerStyle: React.CSSProperties = {
    width,
    height,
    backgroundColor: 'var(--sn-surface)',
    border: showDebugBorder
      ? '2px dashed var(--sn-accent)'
      : '1px solid var(--sn-border)',
    borderRadius: 'var(--sn-radius)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--sn-font-family)',
    position: 'relative',
  };

  const loadingStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--sn-text-muted)',
  };

  const errorStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    textAlign: 'center',
    color: '#ef4444',
  };

  const contentStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    boxSizing: 'border-box',
  };

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>
          <LoadingSpinner />
          <span style={{ fontSize: '14px' }}>Loading widget...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div style={containerStyle}>
        <div style={errorStyle}>
          <ErrorIcon />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Widget Error</span>
          <span style={{ fontSize: '12px', color: 'var(--sn-text-muted)' }}>
            {errorMessage}
          </span>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              backgroundColor: 'var(--sn-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Reload Widget
          </button>
        </div>
      </div>
    );
  }

  // Ready state - show widget content
  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {widgetHtml ? (
          <div
            style={{ color: 'var(--sn-text)', textAlign: 'center' }}
            dangerouslySetInnerHTML={{ __html: widgetHtml }}
          />
        ) : (
          <ReadyStateDemo />
        )}
      </div>
    </div>
  );
};

// Loading spinner component
const LoadingSpinner: React.FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    style={{ animation: 'spin 1s linear infinite' }}
  >
    <style>
      {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
    </style>
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="var(--sn-border)"
      strokeWidth="3"
      fill="none"
    />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke="var(--sn-accent)"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

// Error icon component
const ErrorIcon: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" fill="none" />
    <path d="M12 8v4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1" fill="#ef4444" />
  </svg>
);

// Ready state demo showing theme token usage
const ReadyStateDemo: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
      <div
        style={{
          width: '48px',
          height: '48px',
          backgroundColor: 'var(--sn-accent)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17l-5-5"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span style={{ color: 'var(--sn-text)', fontWeight: 500 }}>Widget Ready</span>
      <span style={{ color: 'var(--sn-text-muted)', fontSize: '12px' }}>
        StickerNest.ready() called
      </span>
    </div>
  );
};

// Interactive widget demo
const InteractiveWidgetDemo: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
      <span style={{ color: 'var(--sn-text)', fontSize: '24px', fontWeight: 600 }}>
        {count}
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setCount((c) => c - 1)}
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'var(--sn-surface)',
            border: '1px solid var(--sn-border)',
            borderRadius: 'var(--sn-radius)',
            color: 'var(--sn-text)',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          -
        </button>
        <button
          onClick={() => setCount((c) => c + 1)}
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'var(--sn-accent)',
            border: 'none',
            borderRadius: 'var(--sn-radius)',
            color: '#fff',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          +
        </button>
      </div>
      <span style={{ color: 'var(--sn-text-muted)', fontSize: '12px' }}>
        Interactive Counter Widget
      </span>
    </div>
  );
};

// Lifecycle transition demo
const LifecycleDemo: React.FC = () => {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (state === 'loading') {
      const timer = setTimeout(() => setState('ready'), 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
      <WidgetFrame
        isLoading={state === 'loading'}
        hasError={state === 'error'}
        width={280}
        height={180}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setState('loading')}
          style={{
            padding: '6px 12px',
            backgroundColor: state === 'loading' ? 'var(--sn-accent)' : 'var(--sn-surface)',
            border: '1px solid var(--sn-border)',
            borderRadius: '6px',
            color: state === 'loading' ? '#fff' : 'var(--sn-text)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Loading
        </button>
        <button
          onClick={() => setState('ready')}
          style={{
            padding: '6px 12px',
            backgroundColor: state === 'ready' ? 'var(--sn-accent)' : 'var(--sn-surface)',
            border: '1px solid var(--sn-border)',
            borderRadius: '6px',
            color: state === 'ready' ? '#fff' : 'var(--sn-text)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Ready
        </button>
        <button
          onClick={() => setState('error')}
          style={{
            padding: '6px 12px',
            backgroundColor: state === 'error' ? '#ef4444' : 'var(--sn-surface)',
            border: '1px solid var(--sn-border)',
            borderRadius: '6px',
            color: state === 'error' ? '#fff' : 'var(--sn-text)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Error
        </button>
      </div>
    </div>
  );
};

// Meta configuration
const meta: Meta<typeof WidgetFrame> = {
  title: 'Runtime/WidgetFrame',
  component: WidgetFrame,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The WidgetFrame is the sandboxed iframe host component that renders all widgets in StickerNest V5.

## Key Responsibilities
- Loads widget HTML via \`srcdoc\` blob (never remote URLs)
- Injects the Widget SDK before widget execution
- Enforces strict CSP on the iframe
- Handles widget lifecycle: load -> init -> READY -> run -> unmount
- Catches widget crashes via error boundary

## Widget Lifecycle
1. **Loading**: Widget HTML is parsed, SDK is injected
2. **Init**: Widget registers manifest via \`StickerNest.register()\`
3. **Ready**: Widget signals \`StickerNest.ready()\` within 500ms
4. **Run**: Widget is fully interactive
5. **Unmount**: Cleanup on widget removal

## Theme Integration
Widgets receive theme tokens via \`postMessage\` on load and theme changes:
- \`--sn-bg\`: Background color
- \`--sn-surface\`: Surface/card color
- \`--sn-accent\`: Primary accent color
- \`--sn-text\`: Primary text color
- \`--sn-text-muted\`: Muted text color
- \`--sn-border\`: Border color
- \`--sn-radius\`: Border radius
- \`--sn-font-family\`: Font family
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: { type: 'range', min: 100, max: 600, step: 10 },
      description: 'Widget container width',
    },
    height: {
      control: { type: 'range', min: 100, max: 400, step: 10 },
      description: 'Widget container height',
    },
    isLoading: {
      control: 'boolean',
      description: 'Simulates widget loading state',
    },
    hasError: {
      control: 'boolean',
      description: 'Simulates widget error state',
    },
    errorMessage: {
      control: 'text',
      description: 'Error message to display',
    },
    showDebugBorder: {
      control: 'boolean',
      description: 'Show debug border around widget',
    },
  },
};

export default meta;
type Story = StoryObj<typeof WidgetFrame>;

/**
 * Default ready state - widget has successfully initialized
 */
export const Ready: Story = {
  args: {
    width: 300,
    height: 200,
    isLoading: false,
    hasError: false,
    showDebugBorder: false,
  },
};

/**
 * Loading state - widget is being initialized
 */
export const Loading: Story = {
  args: {
    width: 300,
    height: 200,
    isLoading: true,
    hasError: false,
  },
};

/**
 * Error state - widget failed to load or crashed
 */
export const Error: Story = {
  args: {
    width: 300,
    height: 200,
    isLoading: false,
    hasError: true,
    errorMessage: 'Widget failed to call ready() within 500ms',
  },
};

/**
 * Debug mode - shows border for development
 */
export const DebugMode: Story = {
  args: {
    width: 300,
    height: 200,
    isLoading: false,
    hasError: false,
    showDebugBorder: true,
  },
};

/**
 * Custom dimensions - widget with different size
 */
export const CustomDimensions: Story = {
  args: {
    width: 400,
    height: 300,
    isLoading: false,
    hasError: false,
  },
};

/**
 * Interactive widget demo - shows a working counter widget
 */
export const InteractiveWidget: Story = {
  render: () => (
    <div
      style={{
        width: 300,
        height: 200,
        backgroundColor: 'var(--sn-surface)',
        border: '1px solid var(--sn-border)',
        borderRadius: 'var(--sn-radius)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <InteractiveWidgetDemo />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates an interactive widget consuming theme tokens.',
      },
    },
  },
};

/**
 * Lifecycle transitions - shows state changes
 */
export const LifecycleTransitions: Story = {
  render: () => <LifecycleDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Click buttons to simulate widget lifecycle state transitions.',
      },
    },
  },
};

/**
 * Multiple widgets - shows several widgets in a grid
 */
export const MultipleWidgets: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
      }}
    >
      <WidgetFrame width={200} height={150} />
      <WidgetFrame width={200} height={150} isLoading />
      <WidgetFrame width={200} height={150} hasError errorMessage="Connection lost" />
      <WidgetFrame width={200} height={150} showDebugBorder />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows multiple widgets in different states side by side.',
      },
    },
  },
};
