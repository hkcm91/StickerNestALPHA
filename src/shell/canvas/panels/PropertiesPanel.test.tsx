/**
 * PropertiesPanel component tests.
 *
 * @module shell/canvas/panels
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { CanvasEntity } from '@sn/types';

let mockMode = 'edit';
let mockSelectedIds = new Set<string>();

vi.mock('../../../kernel/stores/ui/ui.store', () => ({
  useUIStore: vi.fn((selector) => {
    const state: Record<string, unknown> = {
      canvasInteractionMode: mockMode,
    };
    return selector(state);
  }),
}));

vi.mock('../../../kernel/stores/docker', () => ({
  useDockerStore: Object.assign(
    vi.fn((selector) => {
      const state = { dockers: {} };
      return selector(state);
    }),
    { getState: vi.fn(() => ({ dockers: {} })) },
  ),
}));

vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

vi.mock('../hooks', () => ({
  useSelection: vi.fn(() => ({
    selectedIds: mockSelectedIds,
    select: vi.fn(),
  })),
}));

import { PropertiesPanel } from './PropertiesPanel';

function makeEntity(overrides: Partial<CanvasEntity> = {}): CanvasEntity {
  return {
    id: `ent-${Math.random().toString(36).slice(2, 8)}`,
    type: 'sticker',
    canvasId: 'test-canvas',
    name: 'Test Sticker',
    transform: { position: { x: 50, y: 80 }, size: { width: 200, height: 150 }, rotation: 0, scale: 1 },
    zIndex: 1,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user',
    ...overrides,
  } as CanvasEntity;
}

describe('PropertiesPanel', () => {
  beforeEach(() => {
    mockMode = 'edit';
    mockSelectedIds = new Set<string>();
  });

  it('renders canvas background settings when nothing selected', () => {
    render(<PropertiesPanel entities={[]} />);
    expect(screen.getByTestId('properties-panel')).toBeTruthy();
    // Should show background settings in no-selection mode
    expect(screen.getByText('Canvas Background')).toBeTruthy();
  });

  it('shows entity properties when an entity is selected', () => {
    const entity = makeEntity({ id: 'sel-1', name: 'My Shape' });
    mockSelectedIds = new Set(['sel-1']);
    render(<PropertiesPanel entities={[entity]} />);
    expect(screen.getByTestId('properties-panel')).toBeTruthy();
    expect(screen.getByTestId('prop-x')).toBeTruthy();
    expect(screen.getByTestId('prop-y')).toBeTruthy();
    expect(screen.getByTestId('prop-w')).toBeTruthy();
    expect(screen.getByTestId('prop-h')).toBeTruthy();
  });

  it('returns null in preview mode', () => {
    mockMode = 'preview';
    const { container } = render(<PropertiesPanel entities={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "mixed" for position when two entities at different positions are selected', () => {
    const e1 = makeEntity({ id: 'a', transform: { position: { x: 10, y: 20 }, size: { width: 50, height: 50 }, rotation: 0, scale: 1 } });
    const e2 = makeEntity({ id: 'b', transform: { position: { x: 100, y: 200 }, size: { width: 50, height: 50 }, rotation: 0, scale: 1 } });
    mockSelectedIds = new Set(['a', 'b']);
    render(<PropertiesPanel entities={[e1, e2]} />);
    expect(screen.getByTestId('prop-x')).toBeTruthy();
    expect((screen.getByTestId('prop-x') as HTMLInputElement).value).toBe('mixed');
  });

  it('shows entity count label for multi-selection', () => {
    const e1 = makeEntity({ id: 'x' });
    const e2 = makeEntity({ id: 'y' });
    mockSelectedIds = new Set(['x', 'y']);
    render(<PropertiesPanel entities={[e1, e2]} />);
    expect(screen.getByText('2 entities selected')).toBeTruthy();
  });
});
