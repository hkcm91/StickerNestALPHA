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
}));

vi.mock('../../spatial/input', () => ({
  ControllerBridge: () => <div data-testid="controller-bridge" />,
  HandBridge: () => <div data-testid="hand-bridge" />,
  Pointer: () => <div data-testid="pointer" />,
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
});
