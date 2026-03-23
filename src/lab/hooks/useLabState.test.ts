// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { useLabState } from './useLabState';

// Mock all Lab module factories
vi.mock('../ai/ai-generator', () => ({ createAIGenerator: () => ({ cancel: vi.fn() }) }));
vi.mock('../editor/editor', () => ({ createLabEditor: () => ({ onChange: () => vi.fn(), dispose: vi.fn(), setContent: vi.fn() }) }));
vi.mock('../graph/graph-sync', () => ({ createGraphSync: () => ({ destroy: vi.fn() }) }));
vi.mock('../init', () => ({ initLab: vi.fn(), teardownLab: vi.fn() }));
vi.mock('../inspector/inspector', () => ({ createEventInspector: () => ({ clear: vi.fn() }) }));
vi.mock('../manifest/manifest-editor', () => ({ createManifestEditor: () => ({ getManifest: () => null }) }));
vi.mock('../preview/preview-manager', () => ({ createPreviewManager: () => ({ destroy: vi.fn(), setMode: vi.fn(), update: vi.fn() }) }));
vi.mock('../publish/pipeline', () => ({ createPublishPipeline: () => ({}) }));
vi.mock('../versions/version-manager', () => ({ createVersionManager: () => ({}) }));

describe('useLabState', () => {
  it('has debugMode state that defaults to false', () => {
    const { result } = renderHook(() => useLabState());
    expect(result.current.debugMode).toBe(false);
  });

  it('toggles debugMode', () => {
    const { result } = renderHook(() => useLabState());
    act(() => result.current.toggleDebugMode());
    expect(result.current.debugMode).toBe(true);
    act(() => result.current.toggleDebugMode());
    expect(result.current.debugMode).toBe(false);
  });

  it('has activeSidebarPanel state defaulting to entities', () => {
    const { result } = renderHook(() => useLabState());
    expect(result.current.activeSidebarPanel).toBe('entities');
  });

  it('switches sidebar panels', () => {
    const { result } = renderHook(() => useLabState());
    act(() => result.current.setActiveSidebarPanel('widgets'));
    expect(result.current.activeSidebarPanel).toBe('widgets');
  });
});
