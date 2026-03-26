/**
 * EntityRenderer tests — verifies dispatch to type-specific renderers.
 *
 * @module shell/canvas/renderers
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { CanvasEntity } from '@sn/types';

// Mock the UI store
vi.mock('../../../kernel/stores/ui/ui.store', () => ({
  useUIStore: vi.fn((selector: any) => selector({ canvasPlatform: 'desktop' })),
}));

// Mock resolveEntityTransform to be a pass-through
vi.mock('../../../canvas/core', () => ({
  resolveEntityTransform: (entity: any) => entity.transform,
}));

// Mock all sub-renderers
vi.mock('./StickerRenderer', () => ({
  StickerRenderer: (props: any) => <div data-testid="sticker-renderer" data-entity-id={props.entity.id} />,
}));
vi.mock('./TextRenderer', () => ({
  TextRenderer: (props: any) => <div data-testid="text-renderer" data-entity-id={props.entity.id} />,
}));
vi.mock('./WidgetRenderer', () => ({
  WidgetRenderer: (props: any) => <div data-testid="widget-renderer" data-entity-id={props.entity.id} />,
}));
vi.mock('./ShapeRenderer', () => ({
  ShapeRenderer: (props: any) => <div data-testid="shape-renderer" data-entity-id={props.entity.id} />,
}));
vi.mock('./DrawingRenderer', () => ({
  DrawingRenderer: (props: any) => <div data-testid="drawing-renderer" data-entity-id={props.entity.id} />,
}));
vi.mock('./GroupRenderer', () => ({
  GroupRenderer: (props: any) => <div data-testid="group-renderer" data-entity-id={props.entity.id} />,
}));
vi.mock('./DockerRenderer', () => ({
  DockerRenderer: (props: any) => <div data-testid="docker-renderer" data-entity-id={props.entity.id} />,
}));
vi.mock('./AudioRenderer', () => ({
  AudioRenderer: (props: any) => <div data-testid="audio-renderer" data-entity-id={props.entity.id} />,
}));
vi.mock('./LottieRenderer', () => ({
  LottieRenderer: (props: any) => <div data-testid="lottie-renderer" data-entity-id={props.entity.id} />,
}));
vi.mock('./SvgRenderer', () => ({
  SvgRenderer: (props: any) => <div data-testid="svg-renderer" data-entity-id={props.entity.id} />,
}));
vi.mock('./PathRenderer', () => ({
  PathRenderer: (props: any) => <div data-testid="path-renderer" data-entity-id={props.entity.id} />,
}));
vi.mock('./Object3DRenderer', () => ({
  Object3DRenderer: (props: any) => <div data-testid="object3d-renderer" />,
}));

import { EntityRenderer } from './EntityRenderer';

function makeEntity(type: string, overrides: Partial<CanvasEntity> = {}): CanvasEntity {
  return {
    id: 'ent-1',
    type,
    canvasId: 'canvas-1',
    transform: {
      position: { x: 100, y: 200 },
      size: { width: 50, height: 50 },
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
    ...overrides,
  } as any;
}

describe('EntityRenderer', () => {
  it('renders StickerRenderer for sticker type', () => {
    const entity = makeEntity('sticker', { assetUrl: 'test.png', assetType: 'image' } as any);
    render(<EntityRenderer entity={entity} isSelected={false} />);
    expect(screen.getByTestId('sticker-renderer')).toBeDefined();
  });

  it('renders TextRenderer for text type', () => {
    const entity = makeEntity('text', { content: 'hello', fontFamily: 'sans-serif', fontSize: 16, fontWeight: 400, color: '#000', textAlign: 'left' } as any);
    render(<EntityRenderer entity={entity} isSelected={false} />);
    expect(screen.getByTestId('text-renderer')).toBeDefined();
  });

  it('renders WidgetRenderer for widget type', () => {
    const entity = makeEntity('widget', { widgetId: 'w1', widgetInstanceId: 'wi1', config: {} } as any);
    render(<EntityRenderer entity={entity} isSelected={false} widgetHtml="<div>test</div>" theme={{}} />);
    expect(screen.getByTestId('widget-renderer')).toBeDefined();
  });

  it('renders ShapeRenderer for shape type', () => {
    const entity = makeEntity('shape', { shapeType: 'rectangle', fill: '#fff', stroke: '#000', strokeWidth: 1, cornerRadius: 0 } as any);
    render(<EntityRenderer entity={entity} isSelected={false} />);
    expect(screen.getByTestId('shape-renderer')).toBeDefined();
  });

  it('renders DrawingRenderer for drawing type', () => {
    const entity = makeEntity('drawing', { points: [], stroke: '#000', strokeWidth: 2, smoothing: 0.5 } as any);
    render(<EntityRenderer entity={entity} isSelected={false} />);
    expect(screen.getByTestId('drawing-renderer')).toBeDefined();
  });

  it('renders DockerRenderer for docker type', () => {
    const entity = makeEntity('docker', { layout: 'folder', name: 'Folder' } as any);
    render(<EntityRenderer entity={entity} isSelected={false} folderOpen={false} />);
    expect(screen.getByTestId('docker-renderer')).toBeDefined();
  });

  it('renders AudioRenderer for audio type', () => {
    const entity = makeEntity('audio', { assetUrl: 'test.mp3' } as any);
    render(<EntityRenderer entity={entity} isSelected={false} />);
    expect(screen.getByTestId('audio-renderer')).toBeDefined();
  });

  it('renders GroupRenderer for group type', () => {
    const entity = makeEntity('group', { childIds: [] } as any);
    render(<EntityRenderer entity={entity} isSelected={false} />);
    expect(screen.getByTestId('group-renderer')).toBeDefined();
  });

  it('renders null for unknown entity type', () => {
    const entity = makeEntity('unknown-type-xyz');
    const { container } = render(<EntityRenderer entity={entity} isSelected={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('wraps rendered content in a draggable div in edit mode', () => {
    const entity = makeEntity('sticker', { assetUrl: 'test.png', assetType: 'image' } as any);
    const { container } = render(<EntityRenderer entity={entity} isSelected={false} interactionMode="edit" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper?.getAttribute('draggable')).toBe('true');
  });

  it('sets draggable to false in preview mode', () => {
    const entity = makeEntity('sticker', { assetUrl: 'test.png', assetType: 'image' } as any);
    const { container } = render(<EntityRenderer entity={entity} isSelected={false} interactionMode="preview" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper?.getAttribute('draggable')).toBe('false');
  });
});
