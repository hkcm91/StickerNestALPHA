/**
 * Tests for useDeviceFrame hook.
 *
 * @vitest-environment happy-dom
 * @module lab/hooks
 * @layer L2
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useDeviceFrame, DEVICE_SIZES } from './useDeviceFrame';

describe('useDeviceFrame', () => {
  it('defaults to phone device', () => {
    const { result } = renderHook(() => useDeviceFrame());
    expect(result.current.device).toBe('phone');
  });

  it('returns phone dimensions by default', () => {
    const { result } = renderHook(() => useDeviceFrame());
    expect(result.current.size).toEqual({ width: 375, height: 812 });
  });

  it('accepts an initial device type', () => {
    const { result } = renderHook(() => useDeviceFrame('tablet'));
    expect(result.current.device).toBe('tablet');
    expect(result.current.size).toEqual({ width: 768, height: 1024 });
  });

  it('switches to tablet dimensions', () => {
    const { result } = renderHook(() => useDeviceFrame());

    act(() => {
      result.current.setDevice('tablet');
    });

    expect(result.current.device).toBe('tablet');
    expect(result.current.size).toEqual({ width: 768, height: 1024 });
  });

  it('switches to desktop dimensions', () => {
    const { result } = renderHook(() => useDeviceFrame());

    act(() => {
      result.current.setDevice('desktop');
    });

    expect(result.current.device).toBe('desktop');
    expect(result.current.size).toEqual({ width: 1280, height: 800 });
  });

  it('switches back to phone from desktop', () => {
    const { result } = renderHook(() => useDeviceFrame('desktop'));

    act(() => {
      result.current.setDevice('phone');
    });

    expect(result.current.device).toBe('phone');
    expect(result.current.size).toEqual({ width: 375, height: 812 });
  });

  it('DEVICE_SIZES contains all three device types', () => {
    expect(DEVICE_SIZES.phone).toEqual({ width: 375, height: 812 });
    expect(DEVICE_SIZES.tablet).toEqual({ width: 768, height: 1024 });
    expect(DEVICE_SIZES.desktop).toEqual({ width: 1280, height: 800 });
  });
});
