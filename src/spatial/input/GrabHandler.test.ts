/**
 * GrabHandler — unit tests.
 * @vitest-environment happy-dom
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { bus } from '../../kernel/bus';

// Mock React for renderless component
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return actual;
});

import { GrabHandler } from './GrabHandler';

// Helper to render the renderless component
function mountGrabHandler() {
  // GrabHandler returns null but has useEffect hooks
  // We can test it by emitting bus events and checking for responses
  const { unmount } = renderHook(() => GrabHandler());
  return { unmount };
}

describe('GrabHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits panel.grabbed when controller grabs a panel entity', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('spatial.panel.grabbed', handler);

    mountGrabHandler();

    bus.emit('spatial.controller.grab', {
      hand: 'right',
      entityId: 'panel:my-canvas',
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          panelId: 'my-canvas',
          hand: 'right',
        }),
      }),
    );

    unsub();
  });

  it('does NOT emit panel.grabbed for non-panel entities', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('spatial.panel.grabbed', handler);

    mountGrabHandler();

    bus.emit('spatial.controller.grab', {
      hand: 'right',
      entityId: 'entity-123',
    });

    expect(handler).not.toHaveBeenCalled();

    unsub();
  });

  it('emits panel.released when controller releases after grabbing a panel', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('spatial.panel.released', handler);

    mountGrabHandler();

    // First grab a panel
    bus.emit('spatial.controller.grab', {
      hand: 'left',
      entityId: 'panel:test-panel',
    });

    // Then release
    bus.emit('spatial.controller.release', { hand: 'left' });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          panelId: 'test-panel',
          hand: 'left',
        }),
      }),
    );

    unsub();
  });

  it('does NOT emit panel.released if no panel was grabbed', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('spatial.panel.released', handler);

    mountGrabHandler();

    bus.emit('spatial.controller.release', { hand: 'right' });

    expect(handler).not.toHaveBeenCalled();

    unsub();
  });

  it('does NOT emit panel.released for wrong hand', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('spatial.panel.released', handler);

    mountGrabHandler();

    bus.emit('spatial.controller.grab', {
      hand: 'right',
      entityId: 'panel:test',
    });

    // Release with left hand (wrong hand)
    bus.emit('spatial.controller.release', { hand: 'left' });

    expect(handler).not.toHaveBeenCalled();

    unsub();
  });
});
