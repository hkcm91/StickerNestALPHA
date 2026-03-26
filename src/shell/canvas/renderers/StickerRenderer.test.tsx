/**
 * StickerRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { StickerEntity } from '@sn/types';

// Mock the bus
vi.mock('../../../kernel/bus', () => ({
  bus: { emit: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
}));

import { StickerRenderer } from './StickerRenderer';

function makeSticker(overrides: Partial<StickerEntity> = {}): StickerEntity {
  return {
    id: 'sticker-1',
    type: 'sticker',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 100, y: 200 },
      size: { width: 80, height: 80 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 1,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    createdBy: 'user-1',
    assetUrl: 'https://example.com/sticker.png',
    assetType: 'image',
    altText: 'A test sticker',
    hoverEffect: 'none',
    clickAction: { type: 'none' },
    ...overrides,
  } as StickerEntity;
}

describe('StickerRenderer', () => {
  it('renders an img element for image asset type', () => {
    const entity = makeSticker();
    render(<StickerRenderer entity={entity} isSelected={false} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/sticker.png');
    expect(img.getAttribute('alt')).toBe('A test sticker');
  });

  it('renders a video element for video asset type', () => {
    const entity = makeSticker({ assetType: 'video', assetUrl: 'https://example.com/sticker.mp4' });
    const { container } = render(<StickerRenderer entity={entity} isSelected={false} />);
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBe('https://example.com/sticker.mp4');
  });

  it('renders differently when selected vs not selected', () => {
    const entity = makeSticker();
    const { container: selectedContainer } = render(<StickerRenderer entity={entity} isSelected={true} />);
    const { container: unselectedContainer } = render(<StickerRenderer entity={entity} isSelected={false} />);
    const selectedEl = selectedContainer.querySelector('[data-entity-type="sticker"]') as HTMLElement;
    const unselectedEl = unselectedContainer.querySelector('[data-entity-type="sticker"]') as HTMLElement;
    // Selected and unselected should produce different style attributes
    expect(selectedEl.outerHTML).not.toBe(unselectedEl.outerHTML);
  });

  it('sets data-entity-id attribute', () => {
    const entity = makeSticker({ id: 'my-sticker-id' });
    const { container } = render(<StickerRenderer entity={entity} isSelected={false} />);
    const el = container.querySelector('[data-entity-id="my-sticker-id"]');
    expect(el).not.toBeNull();
  });

  it('shows settings button in edit mode', () => {
    const entity = makeSticker();
    render(<StickerRenderer entity={entity} isSelected={false} interactionMode="edit" />);
    const btn = screen.getByLabelText('Open sticker settings');
    expect(btn).toBeDefined();
  });

  it('does not show settings button in preview mode', () => {
    const entity = makeSticker();
    render(<StickerRenderer entity={entity} isSelected={false} interactionMode="preview" />);
    expect(screen.queryByLabelText('Open sticker settings')).toBeNull();
  });

  it('applies position styles from entity transform', () => {
    const entity = makeSticker({
      transform: {
        position: { x: 200, y: 300 },
        size: { width: 60, height: 40 },
        rotation: 0,
        scale: 1,
      },
    } as any);
    const { container } = render(<StickerRenderer entity={entity} isSelected={false} />);
    const wrapper = container.querySelector('[data-entity-type="sticker"]') as HTMLElement;
    // Center-based: left = 200 - 30 = 170
    expect(wrapper.style.left).toBe('170px');
  });
});
