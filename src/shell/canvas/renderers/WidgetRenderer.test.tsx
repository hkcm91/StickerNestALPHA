/**
 * WidgetRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { WidgetContainerEntity } from '@sn/types';

// Mock the bus
vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

// Mock runtime components
vi.mock('../../../runtime', () => ({
  WidgetFrame: (props: any) => <div data-testid="widget-frame" data-widget-id={props.widgetId} />,
  InlineWidgetFrame: (props: any) => <div data-testid="inline-widget-frame" data-widget-id={props.widgetId} />,
}));

// Mock built-in widget components
vi.mock('../../../runtime/widgets', () => ({
  BUILT_IN_WIDGET_COMPONENTS: {} as Record<string, any>,
}));

import { WidgetRenderer } from './WidgetRenderer';

function makeWidget(overrides: Partial<WidgetContainerEntity> = {}): WidgetContainerEntity {
  return {
    id: 'widget-1',
    type: 'widget',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 200, y: 200 },
      size: { width: 300, height: 200 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 1,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    createdBy: 'user-1',
    widgetId: 'test-widget',
    widgetInstanceId: 'instance-1',
    config: {},
    ...overrides,
  } as WidgetContainerEntity;
}

describe('WidgetRenderer', () => {
  it('renders a WidgetFrame for non-built-in widgets', () => {
    const entity = makeWidget();
    render(
      <WidgetRenderer entity={entity} isSelected={false} widgetHtml="<div>test</div>" theme={{}} interactionMode="edit" />,
    );
    expect(screen.getByTestId('widget-frame')).toBeDefined();
  });

  it('sets data-entity-type to widget', () => {
    const entity = makeWidget();
    const { container } = render(
      <WidgetRenderer entity={entity} isSelected={false} widgetHtml="" theme={{}} interactionMode="edit" />,
    );
    expect(container.querySelector('[data-entity-type="widget"]')).not.toBeNull();
  });

  it('shows drag handle in edit mode when not locked', () => {
    const entity = makeWidget({ locked: false } as any);
    const { container } = render(
      <WidgetRenderer entity={entity} isSelected={false} widgetHtml="" theme={{}} interactionMode="edit" />,
    );
    expect(container.querySelector('[data-widget-drag-handle="true"]')).not.toBeNull();
  });

  it('does not show drag handle in preview mode', () => {
    const entity = makeWidget();
    const { container } = render(
      <WidgetRenderer entity={entity} isSelected={false} widgetHtml="" theme={{}} interactionMode="preview" />,
    );
    expect(container.querySelector('[data-widget-drag-handle="true"]')).toBeNull();
  });

  it('does not show drag handle when entity is locked', () => {
    const entity = makeWidget({ locked: true } as any);
    const { container } = render(
      <WidgetRenderer entity={entity} isSelected={false} widgetHtml="" theme={{}} interactionMode="edit" />,
    );
    expect(container.querySelector('[data-widget-drag-handle="true"]')).toBeNull();
  });

  it('renders differently when selected vs not selected', () => {
    const entity = makeWidget();
    const { container: c1 } = render(
      <WidgetRenderer entity={entity} isSelected={true} widgetHtml="" theme={{}} interactionMode="edit" />,
    );
    const { container: c2 } = render(
      <WidgetRenderer entity={entity} isSelected={false} widgetHtml="" theme={{}} interactionMode="edit" />,
    );
    const sel = c1.querySelector('[data-entity-type="widget"]') as HTMLElement;
    const unsel = c2.querySelector('[data-entity-type="widget"]') as HTMLElement;
    expect(sel.outerHTML).not.toBe(unsel.outerHTML);
  });
});
