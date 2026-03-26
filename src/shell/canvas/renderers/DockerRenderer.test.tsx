/**
 * DockerRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CanvasEntity, DockerEntity } from '@sn/types';

// Mock the bus
vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

// Mock WidgetRenderer used for docker-as-widget
vi.mock('./WidgetRenderer', () => ({
  WidgetRenderer: (props: any) => <div data-testid="widget-renderer" />,
}));

// Mock runtime imports used by WidgetRenderer
vi.mock('../../../runtime', () => ({
  WidgetFrame: (props: any) => <div data-testid="widget-frame" />,
  InlineWidgetFrame: (props: any) => <div data-testid="inline-widget-frame" />,
}));
vi.mock('../../../runtime/widgets', () => ({
  BUILT_IN_WIDGET_COMPONENTS: {},
}));

import { DockerRenderer } from './DockerRenderer';

function makeDocker(overrides: Partial<DockerEntity> = {}): DockerEntity {
  return {
    id: 'docker-1',
    type: 'docker',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 200, y: 200 },
      size: { width: 400, height: 300 },
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
    layout: 'folder',
    name: 'My Folder',
    childIds: [],
    ...overrides,
  } as DockerEntity;
}

describe('DockerRenderer', () => {
  it('renders closed folder icon when not open and layout is folder', () => {
    const entity = makeDocker();
    const { container } = render(
      <DockerRenderer entity={entity} isSelected={false} isOpen={false} />,
    );
    const el = container.querySelector('[data-entity-type="docker"]');
    expect(el).not.toBeNull();
    // Closed folder shows the folder icon emoji
    expect(container.textContent).toContain('My Folder');
  });

  it('renders open folder with header when open', () => {
    const entity = makeDocker({ name: 'Open Folder' });
    const { container } = render(
      <DockerRenderer entity={entity} isSelected={false} isOpen={true} />,
    );
    expect(container.textContent).toContain('Open Folder');
    // Open folder should have the close button
    const closeBtn = container.querySelector('button');
    expect(closeBtn).not.toBeNull();
  });

  it('sets data-entity-id on the container', () => {
    const entity = makeDocker({ id: 'dock-42' });
    const { container } = render(
      <DockerRenderer entity={entity} isSelected={false} isOpen={false} />,
    );
    expect(container.querySelector('[data-entity-id="dock-42"]')).not.toBeNull();
  });

  it('renders children when open and renderEntity is provided', () => {
    const entity = makeDocker();
    const child: CanvasEntity = {
      id: 'child-1',
      type: 'text',
      canvasId: 'canvas-1',
      transform: {
        position: { x: 220, y: 250 },
        size: { width: 50, height: 30 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 2,
      visible: true,
      locked: false,
      opacity: 1,
      borderRadius: 0,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      createdBy: 'user-1',
    } as any;

    const renderEntity = vi.fn((e: CanvasEntity) => <div data-testid={`child-${e.id}`}>Child</div>);
    const { container } = render(
      <DockerRenderer entity={entity} isSelected={false} isOpen={true} childrenEntities={[child]} renderEntity={renderEntity} />,
    );
    expect(renderEntity).toHaveBeenCalledWith(child);
  });

  it('renders WidgetRenderer when docker has a widgetId', () => {
    const entity = makeDocker({ widgetId: 'w-1' } as any);
    render(
      <DockerRenderer entity={entity} isSelected={false} isOpen={false} />,
    );
    expect(screen.getByTestId('widget-renderer')).toBeDefined();
  });

  it('applies selection outline when selected and open', () => {
    const entity = makeDocker();
    const { container } = render(
      <DockerRenderer entity={entity} isSelected={true} isOpen={true} />,
    );
    const el = container.querySelector('[data-entity-type="docker"]') as HTMLElement;
    expect(el.style.border).toContain('2px solid');
  });
});
