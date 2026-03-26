/**
 * AudioRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AudioEntity } from '@sn/types';

import { AudioRenderer } from './AudioRenderer';

function makeAudio(overrides: Partial<AudioEntity> = {}): AudioEntity {
  return {
    id: 'audio-1',
    type: 'audio',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 100, y: 100 },
      size: { width: 200, height: 80 },
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
    assetUrl: 'https://example.com/track.mp3',
    autoplay: false,
    loop: false,
    waveformColor: '#3b82f6',
    ...overrides,
  } as AudioEntity;
}

describe('AudioRenderer', () => {
  it('renders a hidden audio element with correct src', () => {
    const entity = makeAudio();
    const { container } = render(<AudioRenderer entity={entity} isSelected={false} />);
    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute('src')).toBe('https://example.com/track.mp3');
    expect(audio?.style.display).toBe('none');
  });

  it('renders a play button', () => {
    const entity = makeAudio();
    render(<AudioRenderer entity={entity} isSelected={false} />);
    const btn = screen.getByLabelText('Toggle audio playback');
    expect(btn).toBeDefined();
  });

  it('renders without crashing when selected', () => {
    const entity = makeAudio();
    const { container } = render(<AudioRenderer entity={entity} isSelected={true} />);
    expect(container.querySelector('[data-entity-type="audio"]')).not.toBeNull();
  });

  it('sets data-entity-id and data-entity-type', () => {
    const entity = makeAudio({ id: 'aud-5' });
    const { container } = render(<AudioRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('[data-entity-id="aud-5"]')).not.toBeNull();
    expect(container.querySelector('[data-entity-type="audio"]')).not.toBeNull();
  });

  it('renders waveform bars', () => {
    const entity = makeAudio();
    const { container } = render(<AudioRenderer entity={entity} isSelected={false} />);
    // 24 waveform bars
    const bars = container.querySelectorAll('[data-entity-type="audio"] > div:first-child > div');
    expect(bars.length).toBe(24);
  });

  it('renders altText as screen-reader text when provided', () => {
    const entity = makeAudio({ altText: 'My audio track' } as any);
    const { container } = render(<AudioRenderer entity={entity} isSelected={false} />);
    expect(container.textContent).toContain('My audio track');
  });
});
