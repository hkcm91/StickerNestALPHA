/**
 * CanvasGallerySection tests
 * @vitest-environment happy-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

import { CanvasGallerySection } from './CanvasGallerySection';
import type { PublicCanvas } from '../../kernel/social-graph';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

vi.mock('../../kernel/social-graph', () => ({
  deriveCanvasCategory: vi.fn((canvas: PublicCanvas) => {
    if (canvas.isPublic) return 'public';
    if (canvas.memberCount > 0) return 'collaborative';
    return 'private';
  }),
}));

// CanvasHeroCard is used for the hero row — mock it with a simple testid wrapper
vi.mock('./CanvasHeroCard', () => ({
  CanvasHeroCard: ({ canvas }: { canvas: PublicCanvas }) => (
    <div data-testid="canvas-hero-card" data-canvas-id={canvas.id}>
      {canvas.name}
    </div>
  ),
}));

// CanvasCard is used in the grid — mock it similarly
vi.mock('./CanvasCard', () => ({
  CanvasCard: ({ canvas }: { canvas: PublicCanvas }) => (
    <div data-testid="canvas-card" data-canvas-id={canvas.id}>
      {canvas.name}
    </div>
  ),
}));

import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0;

function makeCanvas(overrides: Partial<PublicCanvas> = {}): PublicCanvas {
  idCounter += 1;
  return {
    id: `canvas-${idCounter}`,
    name: `Canvas ${idCounter}`,
    slug: `canvas-${idCounter}`,
    description: null,
    thumbnailUrl: null,
    ownerId: 'user-1',
    tags: [],
    memberCount: 0,
    isPublic: true,
    createdAt: new Date(Date.now() - idCounter * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - idCounter * 60_000).toISOString(),
    ...overrides,
  };
}

interface RenderOptions {
  ownedCanvases?: PublicCanvas[];
  sharedCanvases?: PublicCanvas[];
  isOwnProfile?: boolean;
  onCreateCanvas?: () => void;
  onDuplicateCanvas?: (c: PublicCanvas) => void;
  onDeleteCanvas?: (c: PublicCanvas) => void;
}

function renderGallery(opts: RenderOptions = {}) {
  const {
    ownedCanvases = [],
    sharedCanvases = [],
    isOwnProfile = false,
    onCreateCanvas,
    onDuplicateCanvas,
    onDeleteCanvas,
  } = opts;

  return render(
    <MemoryRouter>
      <CanvasGallerySection
        ownedCanvases={ownedCanvases}
        sharedCanvases={sharedCanvases}
        isOwnProfile={isOwnProfile}
        onCreateCanvas={onCreateCanvas}
        onDuplicateCanvas={onDuplicateCanvas}
        onDeleteCanvas={onDeleteCanvas}
      />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CanvasGallerySection', () => {
  beforeEach(() => {
    idCounter = 0;
    vi.clearAllMocks();
    (useNavigate as Mock).mockReturnValue(vi.fn());
  });

  // ── Filter tabs ─────────────────────────────────────────────────────────

  describe('filter tabs', () => {
    it('renders All, Public, and Collaborative tabs for non-own profile', () => {
      renderGallery({ isOwnProfile: false });
      expect(screen.getByTestId('filter-all')).toBeTruthy();
      expect(screen.getByTestId('filter-public')).toBeTruthy();
      expect(screen.getByTestId('filter-collaborative')).toBeTruthy();
    });

    it('renders Private and Shared tabs only for own profile', () => {
      renderGallery({ isOwnProfile: true });
      expect(screen.getByTestId('filter-private')).toBeTruthy();
      expect(screen.getByTestId('filter-shared')).toBeTruthy();
    });

    it('does not render Private tab for non-own profile', () => {
      renderGallery({ isOwnProfile: false });
      expect(screen.queryByTestId('filter-private')).toBeNull();
    });

    it('does not render Shared tab for non-own profile', () => {
      renderGallery({ isOwnProfile: false });
      expect(screen.queryByTestId('filter-shared')).toBeNull();
    });

    it('starts with All tab active', () => {
      const publicCanvas = makeCanvas({ isPublic: true });
      const privateCanvas = makeCanvas({ isPublic: false, memberCount: 0 });
      renderGallery({
        ownedCanvases: [publicCanvas, privateCanvas],
        isOwnProfile: true,
      });
      // Both canvases visible under All filter
      const cards = screen.getAllByTestId('canvas-hero-card');
      expect(cards.length).toBe(2);
    });

    it('Public filter shows only public canvases', () => {
      const publicCanvas = makeCanvas({ name: 'Public Canvas', isPublic: true });
      const privateCanvas = makeCanvas({ name: 'Private Canvas', isPublic: false, memberCount: 0 });
      renderGallery({
        ownedCanvases: [publicCanvas, privateCanvas],
        isOwnProfile: true,
      });

      fireEvent.click(screen.getByTestId('filter-public'));

      expect(screen.getByText('Public Canvas')).toBeTruthy();
      expect(screen.queryByText('Private Canvas')).toBeNull();
    });

    it('Private filter shows only private canvases', () => {
      const publicCanvas = makeCanvas({ name: 'Public Canvas', isPublic: true });
      const privateCanvas = makeCanvas({ name: 'Private Canvas', isPublic: false, memberCount: 0 });
      renderGallery({
        ownedCanvases: [publicCanvas, privateCanvas],
        isOwnProfile: true,
      });

      fireEvent.click(screen.getByTestId('filter-private'));

      expect(screen.queryByText('Public Canvas')).toBeNull();
      expect(screen.getByText('Private Canvas')).toBeTruthy();
    });

    it('Collaborative filter shows collaborative canvases', () => {
      const collabCanvas = makeCanvas({ name: 'Collab Canvas', isPublic: false, memberCount: 3 });
      const privateCanvas = makeCanvas({ name: 'Private Canvas', isPublic: false, memberCount: 0 });
      renderGallery({
        ownedCanvases: [collabCanvas, privateCanvas],
        isOwnProfile: true,
      });

      fireEvent.click(screen.getByTestId('filter-collaborative'));

      expect(screen.getByText('Collab Canvas')).toBeTruthy();
      expect(screen.queryByText('Private Canvas')).toBeNull();
    });

    it('Shared filter shows only shared canvases', () => {
      const ownedCanvas = makeCanvas({ name: 'My Own Canvas' });
      const sharedCanvas = makeCanvas({ name: 'Shared Canvas', ownerId: 'user-other' });
      renderGallery({
        ownedCanvases: [ownedCanvas],
        sharedCanvases: [sharedCanvas],
        isOwnProfile: true,
      });

      fireEvent.click(screen.getByTestId('filter-shared'));

      expect(screen.queryByText('My Own Canvas')).toBeNull();
      expect(screen.getByText('Shared Canvas')).toBeTruthy();
    });

    it('switching tabs updates displayed canvases', () => {
      const publicCanvas = makeCanvas({ name: 'Public One', isPublic: true });
      const privateCanvas = makeCanvas({ name: 'Private One', isPublic: false, memberCount: 0 });
      renderGallery({
        ownedCanvases: [publicCanvas, privateCanvas],
        isOwnProfile: true,
      });

      // Switch to Private
      fireEvent.click(screen.getByTestId('filter-private'));
      expect(screen.getByText('Private One')).toBeTruthy();
      expect(screen.queryByText('Public One')).toBeNull();

      // Switch back to All
      fireEvent.click(screen.getByTestId('filter-all'));
      expect(screen.getByText('Public One')).toBeTruthy();
      expect(screen.getByText('Private One')).toBeTruthy();
    });
  });

  // ── Search ───────────────────────────────────────────────────────────────

  describe('search narrows results', () => {
    it('search input is rendered', () => {
      renderGallery();
      expect(screen.getByTestId('canvas-search')).toBeTruthy();
    });

    it('filters canvases by name', () => {
      const canvasA = makeCanvas({ name: 'Alpha Project' });
      const canvasB = makeCanvas({ name: 'Beta Project' });
      renderGallery({ ownedCanvases: [canvasA, canvasB] });

      fireEvent.change(screen.getByTestId('canvas-search'), { target: { value: 'Alpha' } });

      expect(screen.getByText('Alpha Project')).toBeTruthy();
      expect(screen.queryByText('Beta Project')).toBeNull();
    });

    it('filters canvases by description', () => {
      const canvasA = makeCanvas({ name: 'Canvas A', description: 'an alpha description' });
      const canvasB = makeCanvas({ name: 'Canvas B', description: 'a beta description' });
      renderGallery({ ownedCanvases: [canvasA, canvasB] });

      fireEvent.change(screen.getByTestId('canvas-search'), { target: { value: 'alpha' } });

      expect(screen.getByText('Canvas A')).toBeTruthy();
      expect(screen.queryByText('Canvas B')).toBeNull();
    });

    it('filters canvases by tag', () => {
      const canvasA = makeCanvas({ name: 'Canvas A', tags: ['react'] });
      const canvasB = makeCanvas({ name: 'Canvas B', tags: ['vue'] });
      renderGallery({ ownedCanvases: [canvasA, canvasB] });

      fireEvent.change(screen.getByTestId('canvas-search'), { target: { value: 'react' } });

      expect(screen.getByText('Canvas A')).toBeTruthy();
      expect(screen.queryByText('Canvas B')).toBeNull();
    });

    it('search is case-insensitive', () => {
      const canvas = makeCanvas({ name: 'Alpha Project' });
      renderGallery({ ownedCanvases: [canvas] });

      fireEvent.change(screen.getByTestId('canvas-search'), { target: { value: 'ALPHA' } });

      expect(screen.getByText('Alpha Project')).toBeTruthy();
    });

    it('shows no-canvases state when search matches nothing', () => {
      const canvas = makeCanvas({ name: 'My Canvas' });
      renderGallery({ ownedCanvases: [canvas] });

      fireEvent.change(screen.getByTestId('canvas-search'), { target: { value: 'zzznomatch' } });

      expect(screen.getByTestId('no-canvases')).toBeTruthy();
    });

    it('shows "No canvases match" message when search filters everything out', () => {
      const canvas = makeCanvas({ name: 'My Canvas' });
      renderGallery({ ownedCanvases: [canvas] });

      fireEvent.change(screen.getByTestId('canvas-search'), { target: { value: 'zzznomatch' } });

      expect(screen.getByTestId('no-canvases').textContent).toContain('No canvases match');
    });

    it('clearing the search restores all canvases', () => {
      const canvasA = makeCanvas({ name: 'Alpha Project' });
      const canvasB = makeCanvas({ name: 'Beta Project' });
      renderGallery({ ownedCanvases: [canvasA, canvasB] });

      fireEvent.change(screen.getByTestId('canvas-search'), { target: { value: 'Alpha' } });
      expect(screen.queryByText('Beta Project')).toBeNull();

      fireEvent.change(screen.getByTestId('canvas-search'), { target: { value: '' } });
      expect(screen.getByText('Alpha Project')).toBeTruthy();
      expect(screen.getByText('Beta Project')).toBeTruthy();
    });
  });

  // ── Tag filter ───────────────────────────────────────────────────────────

  describe('tag filter chip narrows results', () => {
    it('renders tag filter chips when canvases have tags', () => {
      const canvas = makeCanvas({ tags: ['react', 'typescript'] });
      renderGallery({ ownedCanvases: [canvas] });
      expect(screen.getByTestId('tag-filter-chips')).toBeTruthy();
    });

    it('does not render tag filter chips when no canvases have tags', () => {
      const canvas = makeCanvas({ tags: [] });
      renderGallery({ ownedCanvases: [canvas] });
      expect(screen.queryByTestId('tag-filter-chips')).toBeNull();
    });

    it('clicking a tag chip filters to only canvases with that tag', () => {
      const canvasA = makeCanvas({ name: 'React Canvas', tags: ['react'] });
      const canvasB = makeCanvas({ name: 'Vue Canvas', tags: ['vue'] });
      renderGallery({ ownedCanvases: [canvasA, canvasB] });

      const tagButtons = screen.getByTestId('tag-filter-chips').querySelectorAll('button');
      // Find and click the 'react' tag button
      const reactBtn = Array.from(tagButtons).find((b) => b.textContent === 'react');
      expect(reactBtn).toBeTruthy();
      fireEvent.click(reactBtn!);

      expect(screen.getByText('React Canvas')).toBeTruthy();
      expect(screen.queryByText('Vue Canvas')).toBeNull();
    });

    it('active tag chip appears highlighted in filter bar', () => {
      const canvas = makeCanvas({ tags: ['react'] });
      renderGallery({ ownedCanvases: [canvas] });

      const tagButtons = screen.getByTestId('tag-filter-chips').querySelectorAll('button');
      fireEvent.click(tagButtons[0]);

      // Active tag chip shows tag text with dismiss indicator
      const activeChip = screen.getByTestId('tag-filter-chips').querySelector('button');
      expect(activeChip?.textContent).toContain('react');
    });

    it('clicking the active tag chip again removes the filter', () => {
      const canvasA = makeCanvas({ name: 'React Canvas', tags: ['react'] });
      const canvasB = makeCanvas({ name: 'Vue Canvas', tags: ['vue'] });
      renderGallery({ ownedCanvases: [canvasA, canvasB] });

      // Apply tag filter
      const initialButtons = screen.getByTestId('tag-filter-chips').querySelectorAll('button');
      const reactBtn = Array.from(initialButtons).find((b) => b.textContent === 'react');
      fireEvent.click(reactBtn!);
      expect(screen.queryByText('Vue Canvas')).toBeNull();

      // Click the active (highlighted) chip to remove filter
      const activeChip = screen.getByTestId('tag-filter-chips').querySelector('button');
      fireEvent.click(activeChip!);

      expect(screen.getByText('React Canvas')).toBeTruthy();
      expect(screen.getByText('Vue Canvas')).toBeTruthy();
    });

    it('shows no-canvases state when tag filter matches nothing', () => {
      // A canvas has 'vue' tag; filter for 'react' from a different canvas's tag
      const canvasA = makeCanvas({ name: 'Vue Canvas', tags: ['vue'] });
      const canvasB = makeCanvas({ name: 'React Canvas', tags: ['react'] });
      renderGallery({ ownedCanvases: [canvasA, canvasB] });

      // Click 'react' tag to filter — Vue Canvas is excluded
      const tagButtons = screen.getByTestId('tag-filter-chips').querySelectorAll('button');
      const reactBtn = Array.from(tagButtons).find((b) => b.textContent === 'react');
      fireEvent.click(reactBtn!);

      // Now search for something that won't match the remaining canvas
      fireEvent.change(screen.getByTestId('canvas-search'), { target: { value: 'zzznomatch' } });

      expect(screen.getByTestId('no-canvases')).toBeTruthy();
    });
  });

  // ── Hero row ─────────────────────────────────────────────────────────────

  describe('hero row shows first 2 canvases', () => {
    it('renders hero row when there is at least one canvas', () => {
      const canvas = makeCanvas();
      renderGallery({ ownedCanvases: [canvas] });
      expect(screen.getByTestId('hero-row')).toBeTruthy();
    });

    it('shows one hero card for a single canvas', () => {
      const canvas = makeCanvas({ name: 'Solo Canvas' });
      renderGallery({ ownedCanvases: [canvas] });
      const heroCards = screen.getAllByTestId('canvas-hero-card');
      expect(heroCards.length).toBe(1);
      expect(heroCards[0].textContent).toContain('Solo Canvas');
    });

    it('shows two hero cards for two or more canvases', () => {
      const canvases = [makeCanvas({ name: 'Hero One' }), makeCanvas({ name: 'Hero Two' }), makeCanvas({ name: 'Grid One' })];
      renderGallery({ ownedCanvases: canvases });
      const heroCards = screen.getAllByTestId('canvas-hero-card');
      expect(heroCards.length).toBe(2);
    });

    it('first two canvases (sorted by updatedAt) appear as hero cards', () => {
      // makeCanvas assigns decreasing updatedAt as idCounter increases,
      // so canvas with id 1 is most recent
      const newest = makeCanvas({ name: 'Newest Canvas' });
      const second = makeCanvas({ name: 'Second Canvas' });
      const third = makeCanvas({ name: 'Third Canvas' });
      renderGallery({ ownedCanvases: [newest, second, third] });

      const heroCards = screen.getAllByTestId('canvas-hero-card');
      expect(heroCards[0].textContent).toContain('Newest Canvas');
      expect(heroCards[1].textContent).toContain('Second Canvas');
    });

    it('does not render hero row when canvas list is empty', () => {
      renderGallery({ ownedCanvases: [] });
      expect(screen.queryByTestId('hero-row')).toBeNull();
    });
  });

  // ── Grid ─────────────────────────────────────────────────────────────────

  describe('grid shows remaining canvases', () => {
    it('does not render grid when there are 2 or fewer canvases', () => {
      const canvases = [makeCanvas(), makeCanvas()];
      renderGallery({ ownedCanvases: canvases });
      expect(screen.queryByTestId('canvas-grid')).toBeNull();
    });

    it('renders grid for canvases beyond the first two', () => {
      const canvases = [makeCanvas(), makeCanvas(), makeCanvas({ name: 'Third Canvas' })];
      renderGallery({ ownedCanvases: canvases });
      expect(screen.getByTestId('canvas-grid')).toBeTruthy();
    });

    it('grid contains all canvases beyond the hero row', () => {
      const canvases = [
        makeCanvas({ name: 'Hero One' }),
        makeCanvas({ name: 'Hero Two' }),
        makeCanvas({ name: 'Grid One' }),
        makeCanvas({ name: 'Grid Two' }),
        makeCanvas({ name: 'Grid Three' }),
      ];
      renderGallery({ ownedCanvases: canvases });
      const gridCards = screen.getByTestId('canvas-grid').querySelectorAll('[data-testid="canvas-card"]');
      expect(gridCards.length).toBe(3);
    });

    it('grid cards show correct canvas names', () => {
      const canvases = [
        makeCanvas({ name: 'Hero One' }),
        makeCanvas({ name: 'Hero Two' }),
        makeCanvas({ name: 'Grid Canvas A' }),
      ];
      renderGallery({ ownedCanvases: canvases });
      const grid = screen.getByTestId('canvas-grid');
      expect(grid.textContent).toContain('Grid Canvas A');
    });

    it('hero names do not appear in the grid', () => {
      const canvases = [
        makeCanvas({ name: 'Hero One' }),
        makeCanvas({ name: 'Hero Two' }),
        makeCanvas({ name: 'Grid Canvas' }),
      ];
      renderGallery({ ownedCanvases: canvases });
      const grid = screen.getByTestId('canvas-grid');
      expect(grid.textContent).not.toContain('Hero One');
      expect(grid.textContent).not.toContain('Hero Two');
    });
  });

  // ── Empty state ──────────────────────────────────────────────────────────

  describe('empty state message shown when no canvases', () => {
    it('renders no-canvases element when ownedCanvases is empty', () => {
      renderGallery({ ownedCanvases: [] });
      expect(screen.getByTestId('no-canvases')).toBeTruthy();
    });

    it('does not render hero row or grid when there are no canvases', () => {
      renderGallery({ ownedCanvases: [] });
      expect(screen.queryByTestId('hero-row')).toBeNull();
      expect(screen.queryByTestId('canvas-grid')).toBeNull();
    });

    it('shows own-profile empty message for own profile with no canvases', () => {
      renderGallery({ ownedCanvases: [], isOwnProfile: true });
      expect(screen.getByTestId('no-canvases').textContent).toContain(
        'No canvases yet',
      );
    });

    it('shows public-profile empty message for other user with no canvases', () => {
      renderGallery({ ownedCanvases: [], isOwnProfile: false });
      expect(screen.getByTestId('no-canvases').textContent).toContain(
        'No public canvases yet',
      );
    });

    it('shows search-specific empty message when search has no results', () => {
      const canvas = makeCanvas({ name: 'My Canvas' });
      renderGallery({ ownedCanvases: [canvas] });

      fireEvent.change(screen.getByTestId('canvas-search'), { target: { value: 'zzznomatch' } });

      expect(screen.getByTestId('no-canvases').textContent).toContain(
        'No canvases match your search',
      );
    });

    it('shows search-specific empty message when tag filter has no results', () => {
      const canvasA = makeCanvas({ name: 'React Canvas', tags: ['react'] });
      const canvasB = makeCanvas({ name: 'Vue Canvas', tags: ['vue'] });
      renderGallery({ ownedCanvases: [canvasA, canvasB] });

      // Filter by 'react' tag, then search for something that won't match
      const tagButtons = screen.getByTestId('tag-filter-chips').querySelectorAll('button');
      const reactBtn = Array.from(tagButtons).find((b) => b.textContent === 'react');
      fireEvent.click(reactBtn!);
      fireEvent.change(screen.getByTestId('canvas-search'), { target: { value: 'zzznomatch' } });

      expect(screen.getByTestId('no-canvases').textContent).toContain(
        'No canvases match your search',
      );
    });
  });

  // ── Create button ─────────────────────────────────────────────────────────

  describe('create button shown for own profile only', () => {
    it('renders create canvas button for own profile', () => {
      renderGallery({ isOwnProfile: true });
      expect(screen.getByTestId('create-canvas-btn')).toBeTruthy();
    });

    it('does not render create canvas button for other user profile', () => {
      renderGallery({ isOwnProfile: false });
      expect(screen.queryByTestId('create-canvas-btn')).toBeNull();
    });

    it('calls onCreateCanvas callback when button is clicked', () => {
      const onCreateCanvas = vi.fn();
      renderGallery({ isOwnProfile: true, onCreateCanvas });
      fireEvent.click(screen.getByTestId('create-canvas-btn'));
      expect(onCreateCanvas).toHaveBeenCalledOnce();
    });

    it('navigates to /canvas/new when no onCreateCanvas callback is provided', () => {
      const navigateMock = vi.fn();
      (useNavigate as Mock).mockReturnValue(navigateMock);
      renderGallery({ isOwnProfile: true });
      fireEvent.click(screen.getByTestId('create-canvas-btn'));
      expect(navigateMock).toHaveBeenCalledWith('/canvas/new');
    });

    it('button label is "New Canvas"', () => {
      renderGallery({ isOwnProfile: true });
      expect(screen.getByTestId('create-canvas-btn').textContent).toBe('New Canvas');
    });
  });

  // ── Section structure ─────────────────────────────────────────────────────

  describe('section structure', () => {
    it('renders gallery section container', () => {
      renderGallery();
      expect(screen.getByTestId('canvas-gallery-section')).toBeTruthy();
    });

    it('renders Canvases heading', () => {
      renderGallery();
      expect(screen.getByTestId('gallery-heading').textContent).toBe('Canvases');
    });

    it('renders filter tabs container', () => {
      renderGallery();
      expect(screen.getByTestId('filter-tabs')).toBeTruthy();
    });

    it('renders search input', () => {
      renderGallery();
      expect(screen.getByTestId('canvas-search')).toBeTruthy();
    });
  });

  // ── Combined filters ──────────────────────────────────────────────────────

  describe('combined filter and search', () => {
    it('applies both tab filter and search simultaneously', () => {
      const publicAlpha = makeCanvas({ name: 'Alpha Public', isPublic: true });
      const publicBeta = makeCanvas({ name: 'Beta Public', isPublic: true });
      const privateAlpha = makeCanvas({ name: 'Alpha Private', isPublic: false, memberCount: 0 });
      renderGallery({
        ownedCanvases: [publicAlpha, publicBeta, privateAlpha],
        isOwnProfile: true,
      });

      fireEvent.click(screen.getByTestId('filter-public'));
      fireEvent.change(screen.getByTestId('canvas-search'), { target: { value: 'Alpha' } });

      expect(screen.getByText('Alpha Public')).toBeTruthy();
      expect(screen.queryByText('Beta Public')).toBeNull();
      expect(screen.queryByText('Alpha Private')).toBeNull();
    });
  });
});
