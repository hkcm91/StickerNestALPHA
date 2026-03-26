/**
 * CanvasCard tests
 * @vitest-environment happy-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CanvasCard } from './CanvasCard';
import type { PublicCanvas } from '../../kernel/social-graph';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../kernel/social-graph', () => ({
  deriveCanvasCategory: vi.fn(),
}));

import { deriveCanvasCategory } from '../../kernel/social-graph';
import type { Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCanvas(overrides: Partial<PublicCanvas> = {}): PublicCanvas {
  return {
    id: 'canvas-1',
    name: 'Test Canvas',
    slug: 'test-canvas',
    description: 'A test canvas description',
    thumbnailUrl: null,
    ownerId: 'user-1',
    tags: [],
    memberCount: 0,
    isPublic: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function renderCard(canvas: PublicCanvas, props: Partial<React.ComponentProps<typeof CanvasCard>> = {}) {
  return render(
    <MemoryRouter>
      <CanvasCard canvas={canvas} {...props} />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CanvasCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (deriveCanvasCategory as Mock).mockReturnValue('public');
  });

  describe('name and description', () => {
    it('renders canvas name', () => {
      renderCard(makeCanvas({ name: 'My Awesome Canvas' }));
      expect(screen.getByTestId('canvas-card-name').textContent).toBe('My Awesome Canvas');
    });

    it('renders canvas description when present', () => {
      renderCard(makeCanvas({ description: 'This is my canvas' }));
      expect(screen.getByText('This is my canvas')).toBeTruthy();
    });

    it('does not render description element when description is null', () => {
      renderCard(makeCanvas({ description: null }));
      expect(screen.queryByText('A test canvas description')).toBeNull();
    });
  });

  describe('thumbnail', () => {
    it('shows gradient placeholder when thumbnailUrl is null', () => {
      renderCard(makeCanvas({ thumbnailUrl: null }));
      const thumb = screen.getByTestId('canvas-card-thumbnail');
      expect(thumb.getAttribute('style')).toContain('linear-gradient');
    });

    it('shows thumbnail image when thumbnailUrl is provided', () => {
      renderCard(makeCanvas({ thumbnailUrl: 'https://example.com/thumb.png' }));
      const thumb = screen.getByTestId('canvas-card-thumbnail');
      expect(thumb.getAttribute('style')).toContain('https://example.com/thumb.png');
    });

    it('does not use gradient when thumbnailUrl is set', () => {
      renderCard(makeCanvas({ thumbnailUrl: 'https://example.com/thumb.png' }));
      const thumb = screen.getByTestId('canvas-card-thumbnail');
      expect(thumb.getAttribute('style')).not.toContain('linear-gradient');
    });
  });

  describe('category badge', () => {
    it('shows Public badge for public canvas', () => {
      (deriveCanvasCategory as Mock).mockReturnValue('public');
      renderCard(makeCanvas());
      expect(screen.getByTestId('canvas-card-category').textContent).toContain('Public');
    });

    it('shows Private badge for private canvas', () => {
      (deriveCanvasCategory as Mock).mockReturnValue('private');
      renderCard(makeCanvas({ isPublic: false, memberCount: 0 }));
      expect(screen.getByTestId('canvas-card-category').textContent).toContain('Private');
    });

    it('shows Collaborative badge for collaborative canvas', () => {
      (deriveCanvasCategory as Mock).mockReturnValue('collaborative');
      renderCard(makeCanvas({ isPublic: false, memberCount: 3 }));
      expect(screen.getByTestId('canvas-card-category').textContent).toContain('Collaborative');
    });

    it('calls deriveCanvasCategory with the canvas', () => {
      const canvas = makeCanvas();
      renderCard(canvas);
      expect(deriveCanvasCategory).toHaveBeenCalledWith(canvas);
    });
  });

  describe('tag chips and overflow indicator', () => {
    it('renders visible tags as chips (up to 3)', () => {
      renderCard(makeCanvas({ tags: ['react', 'typescript', 'design'] }));
      const chips = screen.getAllByTestId('canvas-card-tags')[0].querySelectorAll('span');
      const texts = Array.from(chips).map((s) => s.textContent);
      expect(texts).toContain('react');
      expect(texts).toContain('typescript');
      expect(texts).toContain('design');
    });

    it('shows +N overflow indicator for more than 3 tags', () => {
      renderCard(makeCanvas({ tags: ['react', 'typescript', 'design', 'animation', 'vr'] }));
      expect(screen.getByText('+2')).toBeTruthy();
    });

    it('does not show overflow indicator when 3 or fewer tags', () => {
      renderCard(makeCanvas({ tags: ['react', 'typescript'] }));
      expect(screen.queryByText(/^\+\d/)).toBeNull();
    });

    it('does not render tag section when there are no tags', () => {
      renderCard(makeCanvas({ tags: [] }));
      expect(screen.queryByTestId('canvas-card-tags')).toBeNull();
    });

    it('shows exactly 3 visible tag chips when 5 tags are present', () => {
      renderCard(makeCanvas({ tags: ['a', 'b', 'c', 'd', 'e'] }));
      const tagContainer = screen.getByTestId('canvas-card-tags');
      const allSpans = tagContainer.querySelectorAll('span');
      // 3 visible + 1 overflow = 4 spans total
      expect(allSpans.length).toBe(4);
    });
  });

  describe('relative time', () => {
    it('shows "Just now" for very recent updates', () => {
      renderCard(makeCanvas({ updatedAt: new Date().toISOString() }));
      expect(screen.getByText('Just now')).toBeTruthy();
    });

    it('shows minutes ago for updates within the past hour', () => {
      const updatedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      renderCard(makeCanvas({ updatedAt }));
      expect(screen.getByText('30m ago')).toBeTruthy();
    });

    it('shows hours ago for updates within the past day', () => {
      const updatedAt = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
      renderCard(makeCanvas({ updatedAt }));
      expect(screen.getByText('5h ago')).toBeTruthy();
    });

    it('shows days ago for updates within the past month', () => {
      const updatedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      renderCard(makeCanvas({ updatedAt }));
      expect(screen.getByText('3d ago')).toBeTruthy();
    });

    it('shows months ago for older updates', () => {
      const updatedAt = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
      renderCard(makeCanvas({ updatedAt }));
      expect(screen.getByText('1mo ago')).toBeTruthy();
    });
  });

  describe('hover action buttons', () => {
    it('does not show action buttons before hover on own profile', () => {
      renderCard(makeCanvas(), {
        isOwnProfile: true,
        onDuplicate: vi.fn(),
        onDelete: vi.fn(),
      });
      expect(screen.queryByTestId('canvas-card-actions')).toBeNull();
    });

    it('shows action buttons on hover for own profile', () => {
      renderCard(makeCanvas(), {
        isOwnProfile: true,
        onDuplicate: vi.fn(),
        onDelete: vi.fn(),
      });
      fireEvent.mouseEnter(screen.getByTestId('canvas-card'));
      expect(screen.getByTestId('canvas-card-actions')).toBeTruthy();
    });

    it('shows Duplicate button on hover when onDuplicate is provided', () => {
      renderCard(makeCanvas(), {
        isOwnProfile: true,
        onDuplicate: vi.fn(),
        onDelete: vi.fn(),
      });
      fireEvent.mouseEnter(screen.getByTestId('canvas-card'));
      expect(screen.getByTitle('Duplicate')).toBeTruthy();
    });

    it('shows Delete button on hover when onDelete is provided', () => {
      renderCard(makeCanvas(), {
        isOwnProfile: true,
        onDuplicate: vi.fn(),
        onDelete: vi.fn(),
      });
      fireEvent.mouseEnter(screen.getByTestId('canvas-card'));
      expect(screen.getByTitle('Delete')).toBeTruthy();
    });

    it('calls onDuplicate with the canvas when Duplicate is clicked', () => {
      const onDuplicate = vi.fn();
      const canvas = makeCanvas();
      renderCard(canvas, { isOwnProfile: true, onDuplicate });
      fireEvent.mouseEnter(screen.getByTestId('canvas-card'));
      fireEvent.click(screen.getByTitle('Duplicate'));
      expect(onDuplicate).toHaveBeenCalledOnce();
      expect(onDuplicate).toHaveBeenCalledWith(canvas);
    });

    it('calls onDelete with the canvas when Delete is clicked', () => {
      const onDelete = vi.fn();
      const canvas = makeCanvas();
      renderCard(canvas, { isOwnProfile: true, onDelete });
      fireEvent.mouseEnter(screen.getByTestId('canvas-card'));
      fireEvent.click(screen.getByTitle('Delete'));
      expect(onDelete).toHaveBeenCalledOnce();
      expect(onDelete).toHaveBeenCalledWith(canvas);
    });

    it('hides action buttons after mouse leave', () => {
      renderCard(makeCanvas(), {
        isOwnProfile: true,
        onDuplicate: vi.fn(),
        onDelete: vi.fn(),
      });
      const card = screen.getByTestId('canvas-card');
      fireEvent.mouseEnter(card);
      expect(screen.getByTestId('canvas-card-actions')).toBeTruthy();
      fireEvent.mouseLeave(card);
      expect(screen.queryByTestId('canvas-card-actions')).toBeNull();
    });

    it('does not show action buttons on hover for other user profile', () => {
      renderCard(makeCanvas(), {
        isOwnProfile: false,
        onDuplicate: vi.fn(),
        onDelete: vi.fn(),
      });
      fireEvent.mouseEnter(screen.getByTestId('canvas-card'));
      expect(screen.queryByTestId('canvas-card-actions')).toBeNull();
    });

    it('does not show action buttons when isOwnProfile is not set', () => {
      renderCard(makeCanvas(), { onDuplicate: vi.fn(), onDelete: vi.fn() });
      fireEvent.mouseEnter(screen.getByTestId('canvas-card'));
      expect(screen.queryByTestId('canvas-card-actions')).toBeNull();
    });
  });

  describe('link routing', () => {
    it('links to slug URL when slug is present', () => {
      renderCard(makeCanvas({ slug: 'my-canvas', id: 'canvas-abc' }));
      const links = screen.getAllByRole('link');
      expect(links[0].getAttribute('href')).toBe('/canvas/my-canvas');
    });

    it('links to id URL when slug is null', () => {
      renderCard(makeCanvas({ slug: null, id: 'canvas-abc' }));
      const links = screen.getAllByRole('link');
      expect(links[0].getAttribute('href')).toBe('/canvas/canvas-abc');
    });
  });
});
