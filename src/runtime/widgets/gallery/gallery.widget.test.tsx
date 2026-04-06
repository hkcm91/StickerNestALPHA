/**
 * Gallery Widget — Tests
 *
 * @module runtime/widgets/gallery
 * @layer L3
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { GALLERY_EVENTS } from './gallery.events';

// ── Mocks ────────────────────────────────────────────────────────

const mockEmit = vi.fn();
const mockUploadFromUrl = vi.fn().mockResolvedValue({ id: 'a1', name: 'test.jpg', url: 'http://example.com/test.jpg' });
const mockDeleteAsset = vi.fn().mockResolvedValue(undefined);
const mockRefresh = vi.fn().mockResolvedValue(undefined);

vi.mock('../../hooks', () => ({
  useEmit: () => mockEmit,
  useSubscribe: vi.fn(),
}));

vi.mock('../../gallery-hooks', () => ({
  useGallery: () => ({
    assets: [],
    isLoading: false,
    error: null,
    uploadFromUrl: mockUploadFromUrl,
    deleteAsset: mockDeleteAsset,
    refresh: mockRefresh,
  }),
}));

// Import after mocks are set up
import { GalleryWidget, galleryManifest } from './gallery.widget';

// ── Tests ────────────────────────────────────────────────────────

describe('GalleryWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when assets is empty', () => {
    render(<GalleryWidget instanceId="test-1" />);
    expect(screen.getByText('No images yet')).toBeTruthy();
    expect(
      screen.getByText('Drag stickers here to collect them, or use the context menu to absorb entities.'),
    ).toBeTruthy();
  });

  it('shows gallery header with count badge', () => {
    render(<GalleryWidget instanceId="test-1" />);
    expect(screen.getByText('Gallery')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('emits READY event on mount', () => {
    render(<GalleryWidget instanceId="test-1" />);
    expect(mockEmit).toHaveBeenCalledWith(
      GALLERY_EVENTS.emits.READY,
      expect.objectContaining({ instanceId: 'test-1', timestamp: expect.any(Number) }),
    );
  });

  it('calls refresh on mount', () => {
    render(<GalleryWidget instanceId="test-1" />);
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe('galleryManifest', () => {
  it('has correct id', () => {
    expect(galleryManifest.id).toBe('sn.builtin.gallery');
  });

  it('requires canvas-write and gallery permissions', () => {
    expect(galleryManifest.permissions).toContain('canvas-write');
    expect(galleryManifest.permissions).toContain('gallery');
  });

  it('has correct default size (300x400)', () => {
    expect(galleryManifest.size.defaultWidth).toBe(300);
    expect(galleryManifest.size.defaultHeight).toBe(400);
  });

  it('is an html entry widget', () => {
    expect(galleryManifest.entry).toBe('html');
  });
});
