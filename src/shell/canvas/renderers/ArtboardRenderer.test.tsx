/**
 * ArtboardRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ArtboardEntity } from '@sn/types';

// Mock theme-vars
vi.mock('../../theme/theme-vars', () => ({
  themeVar: (token: string) => `var(${token}, #fallback)`,
}));

// Mock usePersistence
vi.mock('../hooks/usePersistence', () => ({
  readStoredDocument: vi.fn(() => null),
}));

import { ArtboardRenderer } from './ArtboardRenderer';

function makeArtboard(overrides: Partial<ArtboardEntity> = {}): ArtboardEntity {
  return {
    id: 'artboard-1',
    type: 'artboard',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 300, y: 300 },
      size: { width: 400, height: 300 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 1,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 4,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    createdBy: 'user-1',
    name: 'Test Artboard',
    childCanvasId: null,
    childCanvasSlug: null,
    ...overrides,
  } as ArtboardEntity;
}

describe('ArtboardRenderer', () => {
  it('renders with the entity name', () => {
    const entity = makeArtboard({ name: 'My Artboard' });
    render(<ArtboardRenderer entity={entity} isSelected={false} />);
    expect(screen.getByText('My Artboard')).toBeDefined();
  });

  it('renders "Untitled Artboard" when name is empty', () => {
    const entity = makeArtboard({ name: '' });
    render(<ArtboardRenderer entity={entity} isSelected={false} />);
    expect(screen.getByText('Untitled Artboard')).toBeDefined();
  });

  it('shows "Empty Artboard" when no child canvas slug', () => {
    const entity = makeArtboard({ childCanvasSlug: null });
    render(<ArtboardRenderer entity={entity} isSelected={false} />);
    expect(screen.getByText('Empty Artboard')).toBeDefined();
  });

  it('shows "Open" link when childCanvasSlug is set', () => {
    const entity = makeArtboard({ childCanvasSlug: 'my-slug' } as any);
    render(<ArtboardRenderer entity={entity} isSelected={false} />);
    const link = screen.getByText(/Open/);
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/canvas/my-slug');
  });

  it('sets data-testid with entity id', () => {
    const entity = makeArtboard({ id: 'art-99' });
    const { container } = render(<ArtboardRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('[data-testid="artboard-art-99"]')).not.toBeNull();
  });
});
