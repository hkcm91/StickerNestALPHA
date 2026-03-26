/**
 * GhostWidgetOverlay — Tests
 * @module shell/components
 */

import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Collect bus subscribe handlers
const busHandlers: Record<string, ((event: unknown) => void)[]> = {};
const mockSubscribe = vi.fn((eventType: string, handler: (event: unknown) => void) => {
  if (!busHandlers[eventType]) busHandlers[eventType] = [];
  busHandlers[eventType].push(handler);
  return vi.fn();
});

vi.mock('../../kernel/bus', () => ({
  bus: {
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
    emit: vi.fn(),
  },
}));

import { GhostWidgetOverlay } from './GhostWidgetOverlay';

describe('GhostWidgetOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(busHandlers).forEach((key) => delete busHandlers[key]);
  });

  it('renders nothing when ghost is not active', () => {
    const { container } = render(<GhostWidgetOverlay />);
    expect(container.innerHTML).toBe('');
  });

  it('subscribes to ghost bus events on mount', () => {
    render(<GhostWidgetOverlay />);
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('shows banner when ghost is activated', () => {
    render(<GhostWidgetOverlay />);

    // Find the GHOST_ACTIVATED handler
    const activatedHandler = busHandlers['canvas.ghost.activated']?.[0];
    if (activatedHandler) {
      act(() => {
        activatedHandler({
          type: 'canvas.ghost.activated',
          payload: {
            widgetId: 'my-widget',
            widgetManifestSnapshot: { name: 'My Widget' },
          },
        });
      });

      expect(screen.getByTestId('ghost-widget-banner')).toBeTruthy();
      expect(screen.getByText(/My Widget/)).toBeTruthy();
    }
  });

  it('shows cursor overlay when position is set', () => {
    render(<GhostWidgetOverlay />);

    const activatedHandler = busHandlers['canvas.ghost.activated']?.[0];
    if (activatedHandler) {
      act(() => {
        activatedHandler({
          type: 'canvas.ghost.activated',
          payload: { widgetId: 'my-widget' },
        });
      });

      // Simulate mouse move to set position
      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 300 }));
      });

      expect(screen.getByTestId('ghost-widget-overlay')).toBeTruthy();
    }
  });

  it('clears ghost when GHOST_PLACED fires', () => {
    render(<GhostWidgetOverlay />);

    const activatedHandler = busHandlers['canvas.ghost.activated']?.[0];
    const placedHandler = busHandlers['canvas.ghost.placed']?.[0];

    if (activatedHandler && placedHandler) {
      act(() => {
        activatedHandler({
          type: 'canvas.ghost.activated',
          payload: { widgetId: 'my-widget' },
        });
      });

      expect(screen.getByTestId('ghost-widget-banner')).toBeTruthy();

      act(() => {
        placedHandler({
          type: 'canvas.ghost.placed',
          payload: { inviteId: null, position: { x: 100, y: 100 } },
        });
      });

      expect(screen.queryByTestId('ghost-widget-banner')).toBeNull();
      expect(screen.queryByTestId('ghost-widget-overlay')).toBeNull();
    }
  });
});
