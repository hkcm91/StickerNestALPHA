/**
 * EntityFloatingToolbar component tests.
 *
 * @module shell/canvas/components
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CanvasEntity } from '@sn/types';

vi.mock('../../../canvas/core', () => ({
  resolveEntityTransform: vi.fn((entity: any) => entity.transform),
  setEntityPlatformTransform: vi.fn((entity: any) => entity),
}));

vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

vi.mock('../../../kernel/stores/ui/ui.store', () => ({
  useUIStore: vi.fn((selector) => {
    const state: Record<string, unknown> = {
      canvasPlatform: 'web',
    };
    return selector(state);
  }),
}));

vi.mock('../../theme/animation-vars', () => ({
  transition: () => 'all 0.15s ease',
}));

import { bus } from '../../../kernel/bus';

import { EntityFloatingToolbar } from './EntityFloatingToolbar';

function makeEntity(overrides: Partial<CanvasEntity> = {}): CanvasEntity {
  return {
    id: 'toolbar-entity',
    type: 'sticker',
    canvasId: 'c1',
    name: 'Test',
    transform: { position: { x: 100, y: 100 }, size: { width: 200, height: 150 }, rotation: 0, scale: 1 },
    zIndex: 1,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 0,
    canvasVisibility: 'both',
    flipH: false,
    flipV: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user',
    ...overrides,
  } as CanvasEntity;
}

describe('EntityFloatingToolbar', () => {
  it('renders toolbar buttons', () => {
    render(
      <EntityFloatingToolbar
        entity={makeEntity()}
        position={{ x: 200, y: 100 }}
      />,
    );
    // Should render rotate, flip, and other buttons
    expect(screen.getByTitle('Rotate 90\u00b0')).toBeTruthy();
    expect(screen.getByTitle('Flip Horizontal')).toBeTruthy();
    expect(screen.getByTitle('Flip Vertical')).toBeTruthy();
  });

  it('emits bus event on rotate click', () => {
    render(
      <EntityFloatingToolbar
        entity={makeEntity()}
        position={{ x: 200, y: 100 }}
      />,
    );
    fireEvent.click(screen.getByTitle('Rotate 90\u00b0'));
    expect(bus.emit).toHaveBeenCalled();
  });

  it('positions toolbar based on provided position', () => {
    const { container } = render(
      <EntityFloatingToolbar
        entity={makeEntity()}
        position={{ x: 300, y: 50 }}
      />,
    );
    // The toolbar's parent div should have left and top styles
    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar.style.left).toBe('300px');
  });

  it('renders lock/pin toggle button', () => {
    render(
      <EntityFloatingToolbar
        entity={makeEntity()}
        position={{ x: 200, y: 100 }}
      />,
    );
    const lockBtn = screen.getByTitle(/Lock|Unlock/i);
    expect(lockBtn).toBeTruthy();
  });
});
