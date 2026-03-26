/**
 * LottieRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LottieEntity } from '@sn/types';

import { LottieRenderer } from './LottieRenderer';

function makeLottie(overrides: Partial<LottieEntity> = {}): LottieEntity {
  return {
    id: 'lottie-1',
    type: 'lottie',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 100, y: 100 },
      size: { width: 150, height: 150 },
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
    assetUrl: 'https://example.com/animation.json',
    altText: 'Test animation',
    loop: true,
    speed: 1,
    direction: 1,
    autoplay: true,
    ...overrides,
  } as LottieEntity;
}

describe('LottieRenderer', () => {
  it('renders an img element with the asset URL', () => {
    const entity = makeLottie();
    render(<LottieRenderer entity={entity} isSelected={false} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/animation.json');
  });

  it('sets alt text from entity', () => {
    const entity = makeLottie({ altText: 'Custom alt' });
    render(<LottieRenderer entity={entity} isSelected={false} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('alt')).toBe('Custom alt');
  });

  it('defaults alt text when none provided', () => {
    const entity = makeLottie({ altText: undefined } as any);
    render(<LottieRenderer entity={entity} isSelected={false} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('alt')).toBe('Lottie animation');
  });

  it('applies selection outline when selected', () => {
    const entity = makeLottie();
    const { container } = render(<LottieRenderer entity={entity} isSelected={true} />);
    const el = container.querySelector('[data-entity-type="lottie"]') as HTMLElement;
    expect(el.style.outline).toContain('2px solid');
  });

  it('sets data-entity-id', () => {
    const entity = makeLottie({ id: 'lot-3' });
    const { container } = render(<LottieRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('[data-entity-id="lot-3"]')).not.toBeNull();
  });
});
