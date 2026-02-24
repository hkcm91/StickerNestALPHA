/**
 * Tests for spatial init module
 *
 * @module spatial/init.test
 * @layer L4B
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock session/xr-store — use vi.hoisted for proper scoping
// ---------------------------------------------------------------------------

const { mockEnterXR, mockExitXR } = vi.hoisted(() => ({
  mockEnterXR: vi.fn(),
  mockExitXR: vi.fn(),
}));

vi.mock('./session/xr-store', () => ({
  enterXR: mockEnterXR,
  exitXR: mockExitXR,
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import {
  initSpatial,
  teardownSpatial,
  isSpatialInitialized,
  isXRSupported,
} from './init';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Spatial Init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initSpatial returns stub context with deprecation warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = initSpatial();

    expect(result).toEqual({ initialized: true });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('deprecated'),
    );

    warnSpy.mockRestore();
  });

  it('teardownSpatial calls exitXR with deprecation warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    teardownSpatial();

    expect(mockExitXR).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('deprecated'),
    );

    warnSpy.mockRestore();
  });

  it('isSpatialInitialized always returns true', () => {
    expect(isSpatialInitialized()).toBe(true);
  });

  it('isXRSupported returns false when navigator.xr is missing', async () => {
    // In test environment, navigator.xr is not available
    const result = await isXRSupported();
    expect(result).toBe(false);
  });

  it('isXRSupported returns false when navigator is undefined', async () => {
    const result = await isXRSupported('immersive-ar');
    expect(result).toBe(false);
  });
});
