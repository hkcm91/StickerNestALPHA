/**
 * useOnboarding — unit tests
 *
 * @module shell/components/onboarding
 * @layer L6
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ONBOARDING_STEPS, useOnboarding } from './useOnboarding';

const STORAGE_KEY = 'sn-onboarding-complete';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useOnboarding', () => {
  it('starts active when localStorage has no completion flag', () => {
    const { result } = renderHook(() => useOnboarding());

    expect(result.current.active).toBe(true);
    expect(result.current.currentStep).not.toBeNull();
    expect(result.current.currentStep?.id).toBe(ONBOARDING_STEPS[0].id);
  });

  it('starts inactive when onboarding was previously completed', () => {
    localStorage.setItem(STORAGE_KEY, 'true');

    const { result } = renderHook(() => useOnboarding());

    expect(result.current.active).toBe(false);
    expect(result.current.currentStep).toBeNull();
  });

  it('completeStep advances the step index', () => {
    const { result } = renderHook(() => useOnboarding());

    expect(result.current.stepIndex).toBe(0);

    act(() => {
      result.current.completeStep();
    });

    expect(result.current.stepIndex).toBe(1);
    expect(result.current.active).toBe(true);
  });

  it('completeStep on last step sets active to false and persists completion', () => {
    const { result } = renderHook(() => useOnboarding());

    // Advance to the last step
    const lastIndex = ONBOARDING_STEPS.length - 1;
    for (let i = 0; i < lastIndex; i++) {
      act(() => {
        result.current.completeStep();
      });
    }

    expect(result.current.stepIndex).toBe(lastIndex);

    // Complete the final step
    act(() => {
      result.current.completeStep();
    });

    expect(result.current.active).toBe(false);
    expect(result.current.currentStep).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('skip sets active to false immediately and persists completion', () => {
    const { result } = renderHook(() => useOnboarding());

    expect(result.current.active).toBe(true);

    act(() => {
      result.current.skip();
    });

    expect(result.current.active).toBe(false);
    expect(result.current.currentStep).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('exposes correct totalSteps matching ONBOARDING_STEPS length', () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.totalSteps).toBe(ONBOARDING_STEPS.length);
  });
});
