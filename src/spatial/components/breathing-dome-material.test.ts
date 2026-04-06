/**
 * Tests for BreathingDomeMaterial
 *
 * Verifies the material factory produces the expected uniform keys
 * and default values. GLSL compilation cannot be tested in happy-dom.
 *
 * @module spatial/components/breathing-dome-material.test
 * @layer L4B
 */

import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @react-three/drei shaderMaterial and @react-three/fiber extend
// ---------------------------------------------------------------------------

// vi.hoisted runs before vi.mock hoisting, so this is safe to reference
const { captured } = vi.hoisted(() => ({
  captured: { uniforms: {} as Record<string, unknown> },
}));

vi.mock('@react-three/drei', () => ({
  shaderMaterial: (uniforms: Record<string, unknown>) => {
    captured.uniforms = uniforms;
    return class MockShaderMaterial {
      static uniforms = uniforms;
    };
  },
}));

vi.mock('@react-three/fiber', () => ({
  extend: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { BreathingDomeMaterial } from './breathing-dome-material';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BreathingDomeMaterial', () => {
  it('is defined', () => {
    expect(BreathingDomeMaterial).toBeDefined();
  });

  it('has all required uniform keys', () => {
    const expectedKeys = [
      'uTime',
      'uColor1',
      'uColor2',
      'uColor3',
      'uColor4',
      'uBreathingSpeed',
      'uBreathingAmplitude',
    ];
    for (const key of expectedKeys) {
      expect(captured.uniforms).toHaveProperty(key);
    }
  });

  it('has uTime defaulting to 0', () => {
    expect(captured.uniforms.uTime).toBe(0);
  });

  it('has uBreathingSpeed defaulting to 1.0', () => {
    expect(captured.uniforms.uBreathingSpeed).toBe(1.0);
  });

  it('has uBreathingAmplitude defaulting to 0.08', () => {
    expect(captured.uniforms.uBreathingAmplitude).toBe(0.08);
  });

  it('registers with R3F extend', async () => {
    const { extend } = await import('@react-three/fiber');
    expect(extend).toHaveBeenCalledWith({ BreathingDomeMaterial });
  });
});
