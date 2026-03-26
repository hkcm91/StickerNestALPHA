/**
 * AssetPanel component tests.
 *
 * @module shell/canvas/panels
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

let mockMode = 'edit';

vi.mock('../../../kernel/stores/ui/ui.store', () => ({
  useUIStore: vi.fn((selector) => {
    const state: Record<string, unknown> = {
      canvasInteractionMode: mockMode,
    };
    return selector(state);
  }),
}));

vi.mock('../../../kernel/stores/gallery', () => ({
  useGalleryStore: vi.fn((selector) => {
    const state = { stickers: [], widgets: [] };
    return selector(state);
  }),
}));

vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

vi.mock('../../components', () => ({
  StickerSettingsModal: () => null,
}));

vi.mock('../apis/sticker-asset-apis', () => ({
  searchIconAssets: vi.fn(async () => []),
  searchLottieAssets: vi.fn(async () => []),
}));

import { AssetPanel } from './AssetPanel';

describe('AssetPanel', () => {
  beforeEach(() => {
    mockMode = 'edit';
  });

  it('renders the asset panel in edit mode', () => {
    render(<AssetPanel />);
    expect(screen.getByTestId('asset-panel')).toBeTruthy();
  });

  it('returns null in preview mode', () => {
    mockMode = 'preview';
    const { container } = render(<AssetPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('renders search input', () => {
    render(<AssetPanel />);
    expect(screen.getByTestId('asset-search')).toBeTruthy();
  });

  it('shows default sticker assets', () => {
    render(<AssetPanel />);
    // Default assets include Star, Heart, Arrow
    expect(screen.getByTestId('asset-item-stk-star')).toBeTruthy();
    expect(screen.getByTestId('asset-item-stk-heart')).toBeTruthy();
  });

  it('shows widget assets', () => {
    render(<AssetPanel />);
    // Default assets include Clock, Sticky Note widgets
    expect(screen.getByTestId('asset-item-wgt-clock')).toBeTruthy();
  });
});
