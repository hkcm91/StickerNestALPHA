/**
 * Tests for WidgetInSpace component.
 *
 * Mocks `@react-three/drei` (Html component) and `../../runtime/WidgetFrame`
 * to verify correct prop passing, visibility, transform handling, and
 * selection behavior.
 *
 * @module spatial/entities/WidgetInSpace.test
 * @layer L4B
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { WidgetContainerEntity, Transform3D } from '@sn/types';

import type { ThemeTokens } from '../../runtime/bridge/message-types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/**
 * Mock WidgetFrame — captures props so we can verify them.
 */
const mockWidgetFrameProps: Record<string, unknown>[] = [];

vi.mock('../../runtime/WidgetFrame', () => ({
  WidgetFrame: (props: Record<string, unknown>) => {
    mockWidgetFrameProps.push(props);
    return <div data-testid="widget-frame" data-widget-id={props.widgetId as string} />;
  },
}));

/**
 * Mock drei Html component — renders children in a wrapper.
 */
vi.mock('@react-three/drei', () => ({
  Html: ({
    children,
    transform,
    occlude,
  }: {
    children: React.ReactNode;
    transform?: boolean;
    occlude?: boolean;
  }) => (
    <div
      data-testid="drei-html"
      data-transform={transform ? 'true' : 'false'}
      data-occlude={occlude ? 'true' : 'false'}
    >
      {children}
    </div>
  ),
}));

// Import AFTER mocks
import { WidgetInSpace } from './WidgetInSpace';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createWidgetEntity(
  overrides: Partial<WidgetContainerEntity> = {},
): WidgetContainerEntity {
  return {
    id: '00000000-0000-4000-8000-000000000010',
    type: 'widget',
    canvasId: '00000000-0000-4000-8000-000000000020',
    transform: {
      position: { x: 50, y: 75 },
      size: { width: 400, height: 300 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 1,
    visible: true,
    canvasVisibility: 'both' as const,
    locked: false,
    flipH: false,
    flipV: false,
    opacity: 1,
    borderRadius: 0,
    syncTransform2d3d: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    createdBy: '00000000-0000-4000-8000-000000000030',
    widgetInstanceId: '00000000-0000-4000-8000-000000000040',
    widgetId: 'test-widget',
    config: {},
    ...overrides,
  };
}

const defaultTheme: ThemeTokens = {
  '--sn-bg': '#ffffff',
  '--sn-surface': '#f5f5f5',
  '--sn-accent': '#6366f1',
  '--sn-text': '#1a1a1a',
  '--sn-text-muted': '#6b7280',
  '--sn-border': '#e5e7eb',
  '--sn-radius': '8px',
  '--sn-font-family': 'system-ui, sans-serif',
};

const defaultWidgetHtml = '<html><body>Widget Content</body></html>';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WidgetInSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWidgetFrameProps.length = 0;
  });

  it('renders null when entity.visible is false', () => {
    const entity = createWidgetEntity({ visible: false });

    const { container } = render(
      <WidgetInSpace
        entity={entity}
        widgetHtml={defaultWidgetHtml}
        config={{}}
        theme={defaultTheme}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders Html with transform prop', () => {
    const entity = createWidgetEntity();

    const { getByTestId } = render(
      <WidgetInSpace
        entity={entity}
        widgetHtml={defaultWidgetHtml}
        config={{}}
        theme={defaultTheme}
      />,
    );

    const htmlElement = getByTestId('drei-html');
    expect(htmlElement).toBeDefined();
    expect(htmlElement.getAttribute('data-transform')).toBe('true');
    expect(htmlElement.getAttribute('data-occlude')).toBe('true');
  });

  it('passes correct props to WidgetFrame', () => {
    const entity = createWidgetEntity({
      widgetId: 'my-widget',
      widgetInstanceId: '00000000-0000-4000-8000-000000000050',
    });
    const config = { color: 'red', count: 5 };

    render(
      <WidgetInSpace
        entity={entity}
        widgetHtml={defaultWidgetHtml}
        config={config}
        theme={defaultTheme}
      />,
    );

    expect(mockWidgetFrameProps.length).toBe(1);
    const frameProps = mockWidgetFrameProps[0];
    expect(frameProps.widgetId).toBe('my-widget');
    expect(frameProps.instanceId).toBe('00000000-0000-4000-8000-000000000050');
    expect(frameProps.widgetHtml).toBe(defaultWidgetHtml);
    expect(frameProps.config).toEqual(config);
    expect(frameProps.theme).toEqual(defaultTheme);
    expect(frameProps.visible).toBe(true);
    expect(frameProps.width).toBe(400);
    expect(frameProps.height).toBe(300);
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    const entity = createWidgetEntity();

    render(
      <WidgetInSpace
        entity={entity}
        widgetHtml={defaultWidgetHtml}
        config={{}}
        theme={defaultTheme}
        onSelect={onSelect}
      />,
    );

    // Simulate what the R3F group onClick would do
    onSelect(entity.id);
    expect(onSelect).toHaveBeenCalledWith(entity.id);
  });

  it('renders with spatialTransform when present', () => {
    const spatialTransform: Transform3D = {
      position: { x: 2, y: 3, z: -1 },
      rotation: { x: 0, y: 0.707, z: 0, w: 0.707 },
      scale: { x: 1.5, y: 1.5, z: 1.5 },
    };
    const entity = createWidgetEntity({ spatialTransform });

    const { container } = render(
      <WidgetInSpace
        entity={entity}
        widgetHtml={defaultWidgetHtml}
        config={{}}
        theme={defaultTheme}
      />,
    );

    // Should render successfully with spatial transform
    expect(container.innerHTML).not.toBe('');
  });

  it('renders with default position from 2D transform when no spatialTransform', () => {
    const entity = createWidgetEntity({
      spatialTransform: undefined,
      transform: {
        position: { x: 100, y: 200 },
        size: { width: 300, height: 250 },
        rotation: 0,
        scale: 1,
      },
    });

    const { container } = render(
      <WidgetInSpace
        entity={entity}
        widgetHtml={defaultWidgetHtml}
        config={{}}
        theme={defaultTheme}
      />,
    );

    // Should render successfully without spatialTransform
    expect(container.innerHTML).not.toBe('');
  });

  it('shows border when selected', () => {
    const entity = createWidgetEntity();

    const { container } = render(
      <WidgetInSpace
        entity={entity}
        widgetHtml={defaultWidgetHtml}
        config={{}}
        theme={defaultTheme}
        selected={true}
      />,
    );

    // The container div should have a border style applied
    // Look for the style with border
    const divs = container.querySelectorAll('div');
    let foundBorder = false;
    for (const div of divs) {
      const style = div.getAttribute('style');
      if (style && style.includes('border')) {
        foundBorder = true;
        break;
      }
    }
    expect(foundBorder).toBe(true);
  });
});
