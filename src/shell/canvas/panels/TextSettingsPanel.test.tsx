/**
 * TextSettingsPanel component tests.
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

vi.mock('../hooks', () => ({
  useSelection: vi.fn(() => ({
    selectedIds: mockSelectedIds,
    select: vi.fn(),
  })),
}));

import { TextSettingsPanel } from './TextSettingsPanel';

function makeEntity(overrides: Partial<CanvasEntity> = {}): CanvasEntity {
  return {
    id: `ent-${Math.random().toString(36).slice(2, 8)}`,
    type: 'text',
    canvasId: 'test-canvas',
    transform: { position: { x: 0, y: 0 }, size: { width: 100, height: 50 }, rotation: 0, scale: 1 },
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

describe('TextSettingsPanel', () => {
  beforeEach(() => {
    mockMode = 'edit';
    mockSelectedIds = new Set<string>();
  });

  it('renders the text settings panel in edit mode', () => {
    render(<TextSettingsPanel entities={[]} />);
    expect(screen.getByTestId('text-settings-panel')).toBeTruthy();
  });

  it('returns null in preview mode', () => {
    mockMode = 'preview';
    const { container } = render(<TextSettingsPanel entities={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows instruction text when no text entity is selected', () => {
    render(<TextSettingsPanel entities={[]} />);
    expect(screen.getByText('Select a text entity to edit typography settings')).toBeTruthy();
  });

  it('shows selected text count when text entities are selected', () => {
    const entity = makeEntity({ id: 'txt-1', type: 'text' as any });
    mockSelectedIds = new Set(['txt-1']);
    render(<TextSettingsPanel entities={[entity]} />);
    expect(screen.getByText('1 text item selected')).toBeTruthy();
  });

  it('shows plural label for multiple text entities', () => {
    const e1 = makeEntity({ id: 't1', type: 'text' as any });
    const e2 = makeEntity({ id: 't2', type: 'text' as any });
    mockSelectedIds = new Set(['t1', 't2']);
    render(<TextSettingsPanel entities={[e1, e2]} />);
    expect(screen.getByText('2 text items selected')).toBeTruthy();
  });
});
