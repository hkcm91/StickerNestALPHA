/**
 * Tests for useCreatorMode hook.
 *
 * @vitest-environment happy-dom
 * @module lab/hooks
 * @layer L2
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useCreatorMode } from './useCreatorMode';

describe('useCreatorMode', () => {
  it('defaults to creator mode enabled', () => {
    const { result } = renderHook(() => useCreatorMode(false));
    expect(result.current.isCreatorMode).toBe(true);
  });

  it('shows onboarding when creator mode active and no active widget', () => {
    const { result } = renderHook(() => useCreatorMode(false));
    expect(result.current.showOnboarding).toBe(true);
  });

  it('hides onboarding when there is an active widget', () => {
    const { result } = renderHook(() => useCreatorMode(true));
    expect(result.current.showOnboarding).toBe(false);
  });

  it('hides onboarding after dismissOnboarding is called', () => {
    const { result } = renderHook(() => useCreatorMode(false));
    expect(result.current.showOnboarding).toBe(true);

    act(() => {
      result.current.dismissOnboarding();
    });

    expect(result.current.showOnboarding).toBe(false);
  });

  it('hides onboarding when creator mode is disabled', () => {
    const { result } = renderHook(() => useCreatorMode(false));
    expect(result.current.showOnboarding).toBe(true);

    act(() => {
      result.current.setCreatorMode(false);
    });

    expect(result.current.showOnboarding).toBe(false);
  });

  it('defaults graph panel to not collapsed', () => {
    const { result } = renderHook(() => useCreatorMode(false));
    expect(result.current.graphCollapsed).toBe(false);
  });

  it('toggleGraphCollapsed toggles the collapsed state', () => {
    const { result } = renderHook(() => useCreatorMode(false));

    act(() => {
      result.current.toggleGraphCollapsed();
    });
    expect(result.current.graphCollapsed).toBe(true);

    act(() => {
      result.current.toggleGraphCollapsed();
    });
    expect(result.current.graphCollapsed).toBe(false);
  });

  it('setGraphCollapsed sets collapsed state explicitly', () => {
    const { result } = renderHook(() => useCreatorMode(false));

    act(() => {
      result.current.setGraphCollapsed(true);
    });
    expect(result.current.graphCollapsed).toBe(true);

    act(() => {
      result.current.setGraphCollapsed(false);
    });
    expect(result.current.graphCollapsed).toBe(false);
  });
});
