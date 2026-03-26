/**
 * useSelection — unit tests
 *
 * @module shell/canvas/hooks
 * @layer L6
 * @vitest-environment happy-dom
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

// We need to reset the singleton between tests. The module caches the store,
// so we use dynamic import + vi.resetModules to get a fresh instance per test.
// However, since the singleton is lazily created and the bus subscription is
// established on first call, we can also test via the bus integration.

import { useSelection, getSelectionStore } from './useSelection';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSelection', () => {
  beforeEach(() => {
    // Clear selection between tests
    getSelectionStore().clear();
  });

  it('starts with an empty selection', () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('select replaces the full selection set', () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.select(new Set(['a', 'b']));
    });

    expect(result.current.selectedIds.size).toBe(2);
    expect(result.current.selectedIds.has('a')).toBe(true);
    expect(result.current.selectedIds.has('b')).toBe(true);
  });

  it('toggle adds and removes individual IDs', () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.toggle('x');
    });
    expect(result.current.selectedIds.has('x')).toBe(true);

    act(() => {
      result.current.toggle('x');
    });
    expect(result.current.selectedIds.has('x')).toBe(false);
  });

  it('clear empties the selection', () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.select(new Set(['a', 'b', 'c']));
    });
    expect(result.current.selectedIds.size).toBe(3);

    act(() => {
      result.current.clear();
    });
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('syncs with ENTITY_SELECTED bus events', () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      bus.emit(CanvasEvents.ENTITY_SELECTED, {
        entities: [{ id: 'from-bus-1' }, { id: 'from-bus-2' }],
      });
    });

    expect(result.current.selectedIds.has('from-bus-1')).toBe(true);
    expect(result.current.selectedIds.has('from-bus-2')).toBe(true);
    expect(result.current.selectedIds.size).toBe(2);
  });

  it('store singleton is shared across hook instances', () => {
    const { result: r1 } = renderHook(() => useSelection());
    const { result: r2 } = renderHook(() => useSelection());

    act(() => {
      r1.current.select(new Set(['shared']));
    });

    expect(r2.current.selectedIds.has('shared')).toBe(true);
  });
});
