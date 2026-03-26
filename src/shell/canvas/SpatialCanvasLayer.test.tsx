/**
 * SpatialCanvasLayer — unit tests.
 *
 * Mocks Three.js / R3F / XR / spatial dependencies and verifies:
 * - Entity filtering by canvasVisibility
 * - Enter VR button visibility
 * - MR features conditional mounting
 *
 * @module shell/canvas/SpatialCanvasLayer.test
 * @layer L6
 * @vitest-environment happy-dom
 */

import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be defined BEFORE importing the component under test
// ---------------------------------------------------------------------------

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  GizmoHelper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  GizmoViewport: () => null,
  Html: ({ children }: { children: React.ReactNode }) => <div data-testid="drei-html">{children}</div>,
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
}));

vi.mock('@react-three/xr', () => ({
  XR: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="xr-root">{children}</div>
  ),
}));

vi.mock('../../spatial/components', () => ({
  SpatialScene: () => <div data-testid="spatial-scene" />,
}));

vi.mock('../../spatial/entities', () => ({
  SpatialEntity: ({ entity }: { entity: { id: string } }) => (
    <div data-testid={`spatial-entity-${entity.id}`} />
  ),
  WidgetInSpace: ({ entity }: { entity: { id: string } }) => (
    <div data-testid={`widget-in-space-${entity.id}`} />
  ),
  Entity2DInSpace: ({ entity, children }: { entity: { id: string }; children: React.ReactNode }) => (
    <div data-testid={`entity-2d-in-space-${entity.id}`}>{children}</div>
  ),
  SpatialCanvas2DPanel: ({ panelId, children }: { panelId: string; children: React.ReactNode }) => (
    <div data-testid={`canvas-panel-${panelId}`}>{children}</div>
  ),
}));

vi.mock('../../spatial/input', () => ({
  ControllerBridge: () => <div data-testid="controller-bridge" />,
  HandBridge: () => <div data-testid="hand-bridge" />,
  Pointer: () => <div data-testid="pointer" />,
  GrabHandler: () => <div data-testid="grab-handler" />,
}));

// Mock 2D renderers to avoid pulling in runtime/supabase dependencies
vi.mock('./renderers', () => ({
  StickerRenderer: ({ entity }: { entity: { id: string } }) => <div data-testid={`sticker-${entity.id}`} />,
  TextRenderer: ({ entity }: { entity: { id: string } }) => <div data-testid={`text-${entity.id}`} />,
  ShapeRenderer: ({ entity }: { entity: { id: string } }) => <div data-testid={`shape-${entity.id}`} />,
  DrawingRenderer: ({ entity }: { entity: { id: string } }) => <div data-testid={`drawing-${entity.id}`} />,
  PathRenderer: ({ entity }: { entity: { id: string } }) => <div data-testid={`path-${entity.id}`} />,
  SvgRenderer: ({ entity }: { entity: { id: string } }) => <div data-testid={`svg-${entity.id}`} />,
  LottieRenderer: ({ entity }: { entity: { id: string } }) => <div data-testid={`lottie-${entity.id}`} />,
  AudioRenderer: ({ entity }: { entity: { id: string } }) => <div data-testid={`audio-${entity.id}`} />,
  GroupRenderer: ({ entity }: { entity: { id: string } }) => <div data-testid={`group-${entity.id}`} />,
}));

vi.mock('../../spatial/locomotion', () => ({
  TeleportProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="teleport-provider">{children}</div>
  ),
}));

vi.mock('../../spatial/mr', () => ({
  RATKProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="ratk-provider">{children}</div>
  ),
  PlaneDetection: () => <div data-testid="plane-detection" />,
  MeshDetection: () => <div data-testid="mesh-detection" />,
  Anchors: () => <div data-testid="anchors" />,
  HitTest: () => <div data-testid="hit-test" />,
}));

vi.mock('../../spatial/session', () => ({
  xrStore: {},
  SessionBridge: () => <div data-testid="session-bridge" />,
  enterXR: vi.fn(),
}));

// Import AFTER mocks
import { bus } from '../../kernel/bus';

import { SpatialCanvasLayer } from './SpatialCanvasLayer';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeEntity(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: 'object3d',
    canvasId: 'default',
    transform: { position: { x: 0, y: 0 }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 },
    zIndex: 1,
    visible: true,
    canvasVisibility: '3d' as const,
    locked: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SpatialCanvasLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.xr for VR support checks
    Object.defineProperty(navigator, 'xr', {
      value: { isSessionSupported: vi.fn().mockResolvedValue(true) },
      configurable: true,
    });
  });

  it('renders the spatial canvas container', () => {
    const { getByTestId } = render(
      <SpatialCanvasLayer
        entities={[]}
        selectedIds={new Set()}
        spatialMode="3d"
        setSpatialMode={vi.fn()}
      />,
    );

    expect(getByTestId('spatial-canvas-layer')).toBeDefined();
    expect(getByTestId('r3f-canvas')).toBeDefined();
  });

  it('renders entities with canvasVisibility "3d"', () => {
    const entities = [
      makeEntity('ent-3d', { canvasVisibility: '3d' }),
      makeEntity('ent-both', { canvasVisibility: 'both' }),
    ];

    const { getByTestId } = render(
      <SpatialCanvasLayer
        entities={entities as any}
        selectedIds={new Set()}
        spatialMode="3d"
        setSpatialMode={vi.fn()}
      />,
    );

    expect(getByTestId('spatial-entity-ent-3d')).toBeDefined();
    expect(getByTestId('spatial-entity-ent-both')).toBeDefined();
  });

  it('filters out entities with canvasVisibility "2d"', () => {
    const entities = [
      makeEntity('ent-2d', { canvasVisibility: '2d' }),
      makeEntity('ent-3d', { canvasVisibility: '3d' }),
    ];

    const { queryByTestId, getByTestId } = render(
      <SpatialCanvasLayer
        entities={entities as any}
        selectedIds={new Set()}
        spatialMode="3d"
        setSpatialMode={vi.fn()}
      />,
    );

    expect(queryByTestId('spatial-entity-ent-2d')).toBeNull();
    expect(getByTestId('spatial-entity-ent-3d')).toBeDefined();
  });

  it('renders widget entities via WidgetInSpace', () => {
    const entities = [
      makeEntity('widget-1', {
        type: 'widget',
        canvasVisibility: '3d',
        widgetInstanceId: 'inst-1',
        config: {},
      }),
    ];
    const htmlMap = new Map([['inst-1', '<html>widget</html>']]);

    const { getByTestId } = render(
      <SpatialCanvasLayer
        entities={entities as any}
        selectedIds={new Set()}
        widgetHtmlMap={htmlMap}
        spatialMode="3d"
        setSpatialMode={vi.fn()}
      />,
    );

    expect(getByTestId('widget-in-space-widget-1')).toBeDefined();
  });

  it('mounts HandBridge and TeleportProvider', () => {
    const { getByTestId } = render(
      <SpatialCanvasLayer
        entities={[]}
        selectedIds={new Set()}
        spatialMode="3d"
        setSpatialMode={vi.fn()}
      />,
    );

    expect(getByTestId('hand-bridge')).toBeDefined();
    expect(getByTestId('teleport-provider')).toBeDefined();
  });

  it('does NOT mount MR features in 3d mode', () => {
    const { queryByTestId } = render(
      <SpatialCanvasLayer
        entities={[]}
        selectedIds={new Set()}
        spatialMode="3d"
        setSpatialMode={vi.fn()}
      />,
    );

    expect(queryByTestId('ratk-provider')).toBeNull();
  });

  it('mounts MR features in vr mode', () => {
    const { getByTestId } = render(
      <SpatialCanvasLayer
        entities={[]}
        selectedIds={new Set()}
        spatialMode="vr"
        setSpatialMode={vi.fn()}
      />,
    );

    expect(getByTestId('ratk-provider')).toBeDefined();
    expect(getByTestId('plane-detection')).toBeDefined();
    expect(getByTestId('mesh-detection')).toBeDefined();
    expect(getByTestId('anchors')).toBeDefined();
    expect(getByTestId('hit-test')).toBeDefined();
  });

  it('shows Enter VR button in 3d mode when XR is supported', async () => {
    const { findByTestId } = render(
      <SpatialCanvasLayer
        entities={[]}
        selectedIds={new Set()}
        spatialMode="3d"
        setSpatialMode={vi.fn()}
      />,
    );

    const button = await findByTestId('enter-vr-button');
    expect(button).toBeDefined();
    expect(button.textContent).toContain('Enter VR');
  });

  it('renders text entities through Entity2DInSpace', () => {
    const entities = [
      makeEntity('text-1', { type: 'text', canvasVisibility: '3d' }),
    ];

    const { getByTestId } = render(
      <SpatialCanvasLayer
        entities={entities as any}
        selectedIds={new Set()}
        spatialMode="3d"
        setSpatialMode={vi.fn()}
      />,
    );

    expect(getByTestId('entity-2d-in-space-text-1')).toBeDefined();
  });

  it('renders sticker entities through Entity2DInSpace', () => {
    const entities = [
      makeEntity('sticker-1', { type: 'sticker', canvasVisibility: 'both' }),
    ];

    const { getByTestId } = render(
      <SpatialCanvasLayer
        entities={entities as any}
        selectedIds={new Set()}
        spatialMode="3d"
        setSpatialMode={vi.fn()}
      />,
    );

    expect(getByTestId('entity-2d-in-space-sticker-1')).toBeDefined();
  });

  it('renders object3d entities through SpatialEntity (not Entity2DInSpace)', () => {
    const entities = [
      makeEntity('obj-1', { type: 'object3d', canvasVisibility: '3d' }),
    ];

    const { getByTestId, queryByTestId } = render(
      <SpatialCanvasLayer
        entities={entities as any}
        selectedIds={new Set()}
        spatialMode="3d"
        setSpatialMode={vi.fn()}
      />,
    );

    expect(getByTestId('spatial-entity-obj-1')).toBeDefined();
    expect(queryByTestId('entity-2d-in-space-obj-1')).toBeNull();
  });

  it('renders spawn canvas panel button', () => {
    const { getByTestId } = render(
      <SpatialCanvasLayer
        entities={[]}
        selectedIds={new Set()}
        spatialMode="3d"
        setSpatialMode={vi.fn()}
      />,
    );

    expect(getByTestId('spawn-canvas-panel-button')).toBeDefined();
  });

  it('hides Enter VR button in vr mode', () => {
    const { queryByTestId } = render(
      <SpatialCanvasLayer
        entities={[]}
        selectedIds={new Set()}
        spatialMode="vr"
        setSpatialMode={vi.fn()}
      />,
    );

    expect(queryByTestId('enter-vr-button')).toBeNull();
  });

  it('subscribes to shell.spatial.enterVR bus event and calls enterXR', async () => {
    const { enterXR } = await import('../../spatial/session');
    const setSpatialMode = vi.fn();

    render(
      <SpatialCanvasLayer
        entities={[]}
        selectedIds={new Set()}
        spatialMode="3d"
        setSpatialMode={setSpatialMode}
      />,
    );

    bus.emit('shell.spatial.enterVR', {});

    expect(setSpatialMode).toHaveBeenCalledWith('vr');
    expect(enterXR).toHaveBeenCalledWith('immersive-vr');
  });

  it('subscribes to shell.spatial.enterAR bus event and calls enterXR', async () => {
    const { enterXR } = await import('../../spatial/session');
    const setSpatialMode = vi.fn();

    render(
      <SpatialCanvasLayer
        entities={[]}
        selectedIds={new Set()}
        spatialMode="3d"
        setSpatialMode={setSpatialMode}
      />,
    );

    bus.emit('shell.spatial.enterAR', {});

    expect(setSpatialMode).toHaveBeenCalledWith('ar');
    expect(enterXR).toHaveBeenCalledWith('immersive-ar');
  });
});
