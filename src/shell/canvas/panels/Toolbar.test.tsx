/**
 * Toolbar component tests.
 *
 * @module shell/canvas/panels
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock stores before importing the component
vi.mock('../../../kernel/stores/ui/ui.store', () => ({
  useUIStore: vi.fn((selector) => {
    const state: Record<string, unknown> = {
      canvasInteractionMode: 'edit',
      activeTool: 'select',
      setActiveTool: vi.fn(),
      setCanvasInteractionMode: vi.fn(),
      spatialMode: '2d',
      setSpatialMode: vi.fn(),
      canvasPlatform: 'web',
      setCanvasPlatform: vi.fn(),
      setPlatformConfig: vi.fn(),
      platformConfigs: { web: {}, mobile: {}, desktop: {} },
      artboardPreviewMode: false,
      setArtboardPreviewMode: vi.fn(),
      setFullscreenPreview: vi.fn(),
    };
    return selector(state);
  }),
}));

vi.mock('../../../kernel/stores/history/history.store', () => ({
  useHistoryStore: vi.fn((selector) => {
    const state = {
      undoStack: [],
      redoStack: [],
      undo: vi.fn(),
      redo: vi.fn(),
    };
    return selector(state);
  }),
  selectCanUndo: (s: { undoStack: unknown[] }) => s.undoStack.length > 0,
  selectCanRedo: (s: { redoStack: unknown[] }) => s.redoStack.length > 0,
}));

vi.mock('../../../kernel/stores/docker', () => ({
  useDockerStore: vi.fn((selector) => {
    const state = {
      dockers: {},
      addDocker: vi.fn(),
      setVisible: vi.fn(),
      bringToFront: vi.fn(),
    };
    return selector(state);
  }),
}));

vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

vi.mock('../../../spatial', () => ({
  enterXR: vi.fn(),
}));

vi.mock('./CanvasSettingsDropdown', () => ({
  CanvasSettingsDropdown: () => <div data-testid="settings-dropdown" />,
}));

import { Toolbar } from './Toolbar';

function createMockViewportStore() {
  return {
    getState: vi.fn(() => ({ zoom: 1, offset: { x: 0, y: 0 }, viewportWidth: 1920, viewportHeight: 1080 })),
    subscribe: vi.fn(() => vi.fn()),
    setZoom: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    resetZoom: vi.fn(),
    pan: vi.fn(),
    resize: vi.fn(),
  } as any;
}

describe('Toolbar', () => {
  let viewportStore: ReturnType<typeof createMockViewportStore>;

  beforeEach(() => {
    viewportStore = createMockViewportStore();
  });

  it('renders the toolbar container', () => {
    render(<Toolbar viewportStore={viewportStore} />);
    expect(screen.getByTestId('canvas-toolbar')).toBeTruthy();
  });

  it('renders tool buttons', () => {
    render(<Toolbar viewportStore={viewportStore} />);
    expect(screen.getByTestId('toolbar-tools')).toBeTruthy();
  });

  it('renders zoom controls', () => {
    render(<Toolbar viewportStore={viewportStore} />);
    expect(screen.getByTestId('zoom-in')).toBeTruthy();
    expect(screen.getByTestId('zoom-out')).toBeTruthy();
    expect(screen.getByTestId('zoom-reset')).toBeTruthy();
  });

  it('renders mode toggle button', () => {
    render(<Toolbar viewportStore={viewportStore} />);
    expect(screen.getByTestId('mode-toggle')).toBeTruthy();
  });

  it('displays canvas name when provided', () => {
    render(<Toolbar viewportStore={viewportStore} canvasName="My Canvas" />);
    expect(screen.getByTestId('canvas-name')).toBeTruthy();
    expect(screen.getByTestId('canvas-name').textContent).toContain('My Canvas');
  });

  it('shows save status when provided', () => {
    render(<Toolbar viewportStore={viewportStore} saveStatus="saved" />);
    expect(screen.getByTestId('save-status')).toBeTruthy();
  });
});
