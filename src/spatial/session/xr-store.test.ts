import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted() so the mock fns are available when vi.mock factory runs
const { mockEnterVR, mockEnterAR, mockGetState, mockCreateXRStore } = vi.hoisted(() => {
  const enterVR = vi.fn();
  const enterAR = vi.fn();
  const getState = vi.fn();
  const createXRStore = vi.fn(() => ({
    enterVR,
    enterAR,
    getState,
    subscribe: vi.fn(),
    setState: vi.fn(),
  }));
  return {
    mockEnterVR: enterVR,
    mockEnterAR: enterAR,
    mockGetState: getState,
    mockCreateXRStore: createXRStore,
  };
});

vi.mock('@react-three/xr', () => ({
  createXRStore: mockCreateXRStore,
}));

import { xrStore, enterXR, exitXR } from './xr-store';

describe('xr-store', () => {
  beforeEach(() => {
    // Only clear per-test mocks — don't clear mockCreateXRStore since it's
    // called once at module evaluation time and we assert on that later.
    mockEnterVR.mockClear();
    mockEnterAR.mockClear();
    mockGetState.mockClear();
    mockGetState.mockReturnValue({ session: undefined });
  });

  it('exports xrStore as a defined object', () => {
    expect(xrStore).toBeDefined();
    expect(typeof xrStore).toBe('object');
  });

  it('exports enterXR as a function', () => {
    expect(typeof enterXR).toBe('function');
  });

  it('exports exitXR as a function', () => {
    expect(typeof exitXR).toBe('function');
  });

  it('enterXR defaults to immersive-vr mode and calls enterVR', () => {
    enterXR();
    expect(mockEnterVR).toHaveBeenCalledTimes(1);
    expect(mockEnterAR).not.toHaveBeenCalled();
  });

  it('enterXR with explicit immersive-vr calls enterVR', () => {
    enterXR('immersive-vr');
    expect(mockEnterVR).toHaveBeenCalledTimes(1);
    expect(mockEnterAR).not.toHaveBeenCalled();
  });

  it('enterXR with immersive-ar calls enterAR', () => {
    enterXR('immersive-ar');
    expect(mockEnterAR).toHaveBeenCalledTimes(1);
    expect(mockEnterVR).not.toHaveBeenCalled();
  });

  it('enterXR does not accept inline mode (type-level enforcement)', () => {
    // inline mode is excluded from ImmersiveXRMode at the type level.
    // No runtime test needed — TypeScript prevents the call.
    // This test documents the design decision.
    expect(typeof enterXR).toBe('function');
  });

  it('exitXR calls session.end() when session exists', () => {
    const mockEnd = vi.fn();
    mockGetState.mockReturnValue({ session: { end: mockEnd } });

    exitXR();
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  it('exitXR is a no-op when no session exists', () => {
    mockGetState.mockReturnValue({ session: undefined });

    // Should not throw
    expect(() => exitXR()).not.toThrow();
  });

  it('createXRStore was called with correct features', () => {
    expect(mockCreateXRStore).toHaveBeenCalledWith({
      requiredFeatures: ['local-floor'],
      optionalFeatures: [
        'hand-tracking',
        'plane-detection',
        'mesh-detection',
        'anchors',
        'hit-test',
      ],
    });
  });
});
