/**
 * useAutoThumbnail hook tests.
 *
 * @module shell/canvas/hooks
 */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the hook
const mockCaptureAndUpload = vi.fn(() => Promise.resolve('https://example.com/thumb.jpg'));
const mockSetCanvasThumbnail = vi.fn();
const mockUpdateCanvasThumbnail = vi.fn(() => Promise.resolve({ success: true }));

vi.mock('../utils/thumbnail-capture', () => ({
  captureAndUploadThumbnail: (...args: unknown[]) => mockCaptureAndUpload(...args),
}));

vi.mock('../../../kernel/stores/canvas/canvas.store', () => ({
  useCanvasStore: {
    getState: () => ({
      setCanvasThumbnail: mockSetCanvasThumbnail,
    }),
  },
}));

vi.mock('../../../kernel/stores/auth/auth.store', () => ({
  useAuthStore: {
    getState: () => ({
      user: { id: 'user-1' },
    }),
  },
}));

vi.mock('../../../kernel/social-graph/canvases', () => ({
  updateCanvasThumbnail: (...args: unknown[]) => mockUpdateCanvasThumbnail(...args),
}));

import { useAutoThumbnail } from './useAutoThumbnail';

describe('useAutoThumbnail', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createViewportRef = () => {
    const el = document.createElement('div');
    return { current: el };
  };

  it('does not fire when disabled', () => {
    const viewportRef = createViewportRef();

    renderHook(() =>
      useAutoThumbnail({
        canvasId: 'canvas-1',
        viewportRef,
        enabled: false,
        intervalMinutes: 1,
      }),
    );

    vi.advanceTimersByTime(120_000);
    expect(mockCaptureAndUpload).not.toHaveBeenCalled();
  });

  it('does not fire when canvasId is null', () => {
    const viewportRef = createViewportRef();

    renderHook(() =>
      useAutoThumbnail({
        canvasId: null,
        viewportRef,
        enabled: true,
        intervalMinutes: 1,
      }),
    );

    vi.advanceTimersByTime(120_000);
    expect(mockCaptureAndUpload).not.toHaveBeenCalled();
  });

  it('fires at the configured interval', async () => {
    const viewportRef = createViewportRef();

    renderHook(() =>
      useAutoThumbnail({
        canvasId: 'canvas-1',
        viewportRef,
        enabled: true,
        intervalMinutes: 1,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(mockCaptureAndUpload).toHaveBeenCalledTimes(1);
  });

  it('skips capture when document is hidden', async () => {
    const viewportRef = createViewportRef();

    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });

    renderHook(() =>
      useAutoThumbnail({
        canvasId: 'canvas-1',
        viewportRef,
        enabled: true,
        intervalMinutes: 1,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(mockCaptureAndUpload).not.toHaveBeenCalled();
  });

  it('cleans up interval on unmount', () => {
    const viewportRef = createViewportRef();

    const { unmount } = renderHook(() =>
      useAutoThumbnail({
        canvasId: 'canvas-1',
        viewportRef,
        enabled: true,
        intervalMinutes: 1,
      }),
    );

    unmount();

    vi.advanceTimersByTime(120_000);
    expect(mockCaptureAndUpload).not.toHaveBeenCalled();
  });

  it('provides a captureNow function for manual use', () => {
    const viewportRef = createViewportRef();

    const { result } = renderHook(() =>
      useAutoThumbnail({
        canvasId: 'canvas-1',
        viewportRef,
        enabled: false,
        intervalMinutes: 5,
      }),
    );

    expect(typeof result.current.captureNow).toBe('function');
  });
});
