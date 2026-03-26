/**
 * CanvasWorkspace component tests.
 *
 * @module shell/canvas
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock all heavy dependencies
vi.mock('../../canvas/core', () => ({
  DEFAULT_GRID_CONFIG: { enabled: false, size: 20, snapMode: 'none', showGridLines: false, projection: 'square' },
  useInteractionStore: vi.fn((selector) => {
    const state = { mode: 'edit' };
    return selector(state);
  }),
  screenToCanvas: vi.fn((p: any) => p),
  anchorsToSvgPath: vi.fn(() => ''),
  resolveEntityTransform: vi.fn((e: any) => e?.transform),
  setEntityPlatformTransform: vi.fn((e: any) => e),
}));

vi.mock('../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

vi.mock('../../kernel/stores/ui/ui.store', () => ({
  useUIStore: vi.fn((selector) => {
    const state: Record<string, unknown> = {
      canvasInteractionMode: 'edit',
      spatialMode: '2d',
      activeTool: 'select',
    };
    return selector(state);
  }),
}));

vi.mock('../theme/theme-vars', () => ({
  themeVar: (token: string) => `var(${token})`,
}));

// Mock all child components to keep the test light
vi.mock('./CanvasOverlayLayer', () => ({
  CanvasOverlayLayer: () => <div data-testid="mock-overlay-layer" />,
}));

vi.mock('./CanvasViewportLayer', () => ({
  CanvasViewportLayer: ({ children }: any) => <div data-testid="mock-viewport-layer">{children}</div>,
}));

vi.mock('./CanvasEntityLayer', () => ({
  CanvasEntityLayer: () => <div data-testid="mock-entity-layer" />,
}));

vi.mock('./CanvasToolLayer', () => ({
  CanvasToolLayer: () => <div data-testid="mock-tool-layer" />,
}));

vi.mock('./components', () => ({
  CanvasContextMenu: () => null,
  ConstellationLines: () => null,
  CursorGlow: () => null,
  PresenceCursorsLayer: () => null,
  RothkoField: () => null,
  SelectionOverlay: () => null,
}));

vi.mock('./handlers', () => ({
  initAlignHandler: vi.fn(() => vi.fn()),
  initCropHandler: vi.fn(() => vi.fn()),
  initGroupHandler: vi.fn(() => vi.fn()),
}));

vi.mock('./hooks', () => ({
  useActiveTool: vi.fn(() => ({ activeTool: 'select', toolsEnabled: true, setTool: vi.fn() })),
  useCanvasInput: vi.fn(),
  useCanvasShortcuts: vi.fn(() => ({ onKeyDown: vi.fn() })),
  useSceneGraph: vi.fn(() => []),
  useSelection: vi.fn(() => ({ selectedIds: new Set(), select: vi.fn() })),
  useViewport: vi.fn(() => ({
    viewport: { zoom: 1, offset: { x: 0, y: 0 }, viewportWidth: 1920, viewportHeight: 1080 },
    store: {
      getState: vi.fn(() => ({ zoom: 1 })),
      pan: vi.fn(),
      resize: vi.fn(),
    },
  })),
}));

vi.mock('./SpatialCanvasLayer', () => ({
  SpatialCanvasLayer: () => <div data-testid="mock-spatial-layer" />,
}));

import { CanvasWorkspace } from './CanvasWorkspace';

describe('CanvasWorkspace', () => {
  beforeEach(() => {
    // Mock ResizeObserver since happy-dom may not have it
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it('renders the canvas viewport container', () => {
    render(<CanvasWorkspace sceneGraph={null} />);
    expect(screen.getByTestId('canvas-viewport')).toBeTruthy();
  });

  it('renders child layers in 2d mode', () => {
    render(<CanvasWorkspace sceneGraph={null} />);
    expect(screen.getByTestId('mock-overlay-layer')).toBeTruthy();
    expect(screen.getByTestId('mock-tool-layer')).toBeTruthy();
  });

  it('renders with tabIndex 0 for keyboard focus', () => {
    render(<CanvasWorkspace sceneGraph={null} />);
    const container = screen.getByTestId('canvas-viewport');
    expect(container.getAttribute('tabindex')).toBe('0');
  });

  it('accepts optional background and grid config props', () => {
    // Should render without errors
    render(
      <CanvasWorkspace
        sceneGraph={null}
        background={{ type: 'solid', color: '#000' } as any}
        gridConfig={{ enabled: true, size: 20, snapMode: 'none', showGridLines: false, projection: 'square' as any }}
      />,
    );
    expect(screen.getByTestId('canvas-viewport')).toBeTruthy();
  });
});
