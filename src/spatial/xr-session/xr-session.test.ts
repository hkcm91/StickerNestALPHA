import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { SpatialEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

import { createXRSessionManager } from './xr-session';

describe('XRSessionManager', () => {
  beforeEach(() => bus.unsubscribeAll());
  afterEach(() => {
    bus.unsubscribeAll();
    vi.unstubAllGlobals();
  });

  it('enterVR emits SESSION_STARTED on success', async () => {
    const mockSession = { end: vi.fn().mockResolvedValue(undefined) };
    const mockXR = {
      isSessionSupported: vi.fn().mockResolvedValue(true),
      requestSession: vi.fn().mockResolvedValue(mockSession),
    };
    vi.stubGlobal('navigator', { ...navigator, xr: mockXR });

    const handler = vi.fn();
    bus.subscribe(SpatialEvents.SESSION_STARTED, handler);

    const manager = createXRSessionManager();
    const result = await manager.enterVR();
    expect(result.success).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(manager.isInVR()).toBe(true);
  });

  it('exitVR emits SESSION_ENDED', async () => {
    const mockSession = { end: vi.fn().mockResolvedValue(undefined) };
    const mockXR = {
      isSessionSupported: vi.fn().mockResolvedValue(true),
      requestSession: vi.fn().mockResolvedValue(mockSession),
    };
    vi.stubGlobal('navigator', { ...navigator, xr: mockXR });

    const handler = vi.fn();
    bus.subscribe(SpatialEvents.SESSION_ENDED, handler);

    const manager = createXRSessionManager();
    await manager.enterVR();
    await manager.exitVR();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(manager.isInVR()).toBe(false);
  });

  it('graceful rejection when XR not available', async () => {
    vi.stubGlobal('navigator', { ...navigator, xr: undefined });

    const manager = createXRSessionManager();
    const result = await manager.enterVR();
    expect(result.success).toBe(false);
    expect(result.error).toBe('WebXR not available');
  });

  it('graceful rejection when session denied', async () => {
    const mockXR = {
      isSessionSupported: vi.fn().mockResolvedValue(true),
      requestSession: vi.fn().mockRejectedValue(new Error('User denied')),
    };
    vi.stubGlobal('navigator', { ...navigator, xr: mockXR });

    const manager = createXRSessionManager();
    const result = await manager.enterVR();
    expect(result.success).toBe(false);
    expect(result.error).toBe('User denied');
  });

  it('isXRSupported returns false when navigator.xr undefined', async () => {
    vi.stubGlobal('navigator', { ...navigator, xr: undefined });
    const manager = createXRSessionManager();
    expect(await manager.isXRSupported()).toBe(false);
  });
});
