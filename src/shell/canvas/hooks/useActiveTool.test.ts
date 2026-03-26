/**
 * useActiveTool — unit tests
 *
 * @module shell/canvas/hooks
 * @layer L6
 * @vitest-environment happy-dom
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useInteractionStore } from '../../../canvas/core';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

import { useActiveTool, setActiveTool } from './useActiveTool';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset stores to defaults
  useUIStore.getState().setActiveTool('select');
  useInteractionStore.setState({ mode: 'edit', toolsEnabled: true, widgetsInteractive: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useActiveTool', () => {
  it('returns the current active tool from uiStore', () => {
    useUIStore.getState().setActiveTool('pen');
    const { result } = renderHook(() => useActiveTool());
    expect(result.current.activeTool).toBe('pen');
  });

  it('normalizes "move" tool to "select"', () => {
    // Directly set 'move' in uiStore state
    useUIStore.setState({ activeTool: 'move' });
    const { result } = renderHook(() => useActiveTool());
    expect(result.current.activeTool).toBe('select');
  });

  it('setTool updates the active tool', () => {
    const { result } = renderHook(() => useActiveTool());

    act(() => {
      result.current.setTool('rect');
    });

    expect(result.current.activeTool).toBe('rect');
  });

  it('setTool is a no-op when tools are disabled', () => {
    useInteractionStore.setState({ toolsEnabled: false });
    const { result } = renderHook(() => useActiveTool());

    act(() => {
      result.current.setTool('pen');
    });

    // Should remain at the original tool since tools are disabled
    expect(result.current.activeTool).toBe('select');
  });

  it('exposes the current interaction mode', () => {
    useInteractionStore.setState({ mode: 'play' });
    const { result } = renderHook(() => useActiveTool());
    expect(result.current.mode).toBe('play');
  });

  it('setActiveTool (standalone) updates uiStore directly', () => {
    setActiveTool('ellipse');
    expect(useUIStore.getState().activeTool).toBe('ellipse');
  });
});
