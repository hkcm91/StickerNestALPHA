/**
 * LayersPanel component tests.
 *
 * @module shell/canvas/panels
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { CanvasEntity } from '@sn/types';

// Mock stores
vi.mock('../../../kernel/stores/ui/ui.store', () => ({
  useUIStore: vi.fn((selector) => {
    const state: Record<string, unknown> = {
      canvasInteractionMode: 'edit',
    };
    return selector(state);
  }),
}));

vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

vi.mock('../hooks', () => ({
  useSelection: vi.fn(() => ({
    selectedIds: new Set<string>(),
    select: vi.fn(),
  })),
}));

import { useUIStore } from '../../../kernel/stores/ui/ui.store';

import { LayersPanel } from './LayersPanel';

function makeEntity(overrides: Partial<CanvasEntity> = {}): CanvasEntity {
  return {
    id: `entity-${Math.random().toString(36).slice(2, 8)}`,
    type: 'sticker',
    canvasId: 'test-canvas',
    name: 'Test Entity',
    transform: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 },
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

describe('LayersPanel', () => {
  it('renders the layers panel in edit mode', () => {
    render(<LayersPanel entities={[]} />);
    expect(screen.getByTestId('layers-panel')).toBeTruthy();
  });

  it('shows empty state when no entities', () => {
    render(<LayersPanel entities={[]} />);
    expect(screen.getByText('No entities on canvas')).toBeTruthy();
  });

  it('lists entities sorted by z-order (highest first)', () => {
    const entities = [
      makeEntity({ id: 'a', name: 'Bottom', zIndex: 1 }),
      makeEntity({ id: 'b', name: 'Top', zIndex: 10 }),
    ];
    render(<LayersPanel entities={entities} />);
    expect(screen.getByTestId('layer-row-b')).toBeTruthy();
    expect(screen.getByTestId('layer-row-a')).toBeTruthy();
    // "Top" should appear before "Bottom" in the DOM
    const rows = screen.getAllByText(/Top|Bottom/);
    expect(rows[0].textContent).toBe('Top');
    expect(rows[1].textContent).toBe('Bottom');
  });

  it('shows entity count in header', () => {
    const entities = [makeEntity(), makeEntity()];
    render(<LayersPanel entities={entities} />);
    expect(screen.getByText('Layers (2)')).toBeTruthy();
  });

  it('displays type badges for entities', () => {
    const entity = makeEntity({ type: 'text' as any, name: 'My Text' });
    render(<LayersPanel entities={[entity]} />);
    expect(screen.getByText('TXT')).toBeTruthy();
  });

  it('returns null in preview mode', () => {
    (useUIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({ canvasInteractionMode: 'preview' }),
    );
    const { container } = render(<LayersPanel entities={[]} />);
    expect(container.innerHTML).toBe('');

    // Restore
    (useUIStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({ canvasInteractionMode: 'edit' }),
    );
  });

  it('renders visibility and lock toggle buttons', () => {
    const entity = makeEntity({ id: 'e1' });
    render(<LayersPanel entities={[entity]} />);
    expect(screen.getByTestId('layer-visibility-e1')).toBeTruthy();
    expect(screen.getByTestId('layer-lock-e1')).toBeTruthy();
  });
});
