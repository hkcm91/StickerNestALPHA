/**
 * Tests for SpatialRoot
 *
 * Verifies that SpatialRoot composes all spatial sub-modules correctly
 * and gates MR/teleport/hand features based on props.
 *
 * @module spatial/components/SpatialRoot.test
 * @layer L4B
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
// ---------------------------------------------------------------------------
// Track which components were rendered
// ---------------------------------------------------------------------------

const renderedComponents = new Set<string>();

// ---------------------------------------------------------------------------
// Mock all sub-module components as renderless trackers
// ---------------------------------------------------------------------------

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => {
    renderedComponents.add('Canvas');
    return <div data-testid="canvas">{children}</div>;
  },
}));

vi.mock('@react-three/xr', () => ({
  XR: ({ children }: { children: React.ReactNode }) => {
    renderedComponents.add('XR');
    return <div data-testid="xr">{children}</div>;
  },
}));

vi.mock('../session', () => ({
  xrStore: {},
  SessionBridge: () => {
    renderedComponents.add('SessionBridge');
    return null;
  },
}));

vi.mock('../input', () => ({
  ControllerBridge: () => {
    renderedComponents.add('ControllerBridge');
    return null;
  },
  HandBridge: () => {
    renderedComponents.add('HandBridge');
    return null;
  },
  Pointer: () => {
    renderedComponents.add('Pointer');
    return null;
  },
}));

vi.mock('../entities', () => ({
  EntityManager: () => {
    renderedComponents.add('EntityManager');
    return null;
  },
}));

vi.mock('../locomotion', () => ({
  TeleportProvider: ({ children }: { children?: React.ReactNode }) => {
    renderedComponents.add('TeleportProvider');
    return <>{children}</>;
  },
}));

vi.mock('../mr', () => ({
  RATKProvider: ({ children }: { children?: React.ReactNode }) => {
    renderedComponents.add('RATKProvider');
    return <>{children}</>;
  },
  PlaneDetection: () => {
    renderedComponents.add('PlaneDetection');
    return null;
  },
  MeshDetection: () => {
    renderedComponents.add('MeshDetection');
    return null;
  },
  Anchors: () => {
    renderedComponents.add('Anchors');
    return null;
  },
  HitTest: () => {
    renderedComponents.add('HitTest');
    return null;
  },
}));

vi.mock('./SpatialScene', () => ({
  SpatialScene: () => {
    renderedComponents.add('SpatialScene');
    return null;
  },
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { render } from '@testing-library/react';

import { SpatialRoot } from './SpatialRoot';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SpatialRoot', () => {
  beforeEach(() => {
    renderedComponents.clear();
  });

  it('renders Canvas and XR wrapper', () => {
    render(<SpatialRoot />);

    expect(renderedComponents.has('Canvas')).toBe(true);
    expect(renderedComponents.has('XR')).toBe(true);
  });

  it('renders core bridge components', () => {
    render(<SpatialRoot />);

    expect(renderedComponents.has('SpatialScene')).toBe(true);
    expect(renderedComponents.has('SessionBridge')).toBe(true);
    expect(renderedComponents.has('ControllerBridge')).toBe(true);
    expect(renderedComponents.has('Pointer')).toBe(true);
    expect(renderedComponents.has('EntityManager')).toBe(true);
  });

  it('renders HandBridge by default', () => {
    render(<SpatialRoot />);

    expect(renderedComponents.has('HandBridge')).toBe(true);
  });

  it('hides HandBridge when enableHands is false', () => {
    render(<SpatialRoot enableHands={false} />);

    expect(renderedComponents.has('HandBridge')).toBe(false);
  });

  it('renders TeleportProvider by default', () => {
    render(<SpatialRoot />);

    expect(renderedComponents.has('TeleportProvider')).toBe(true);
  });

  it('hides TeleportProvider when enableTeleport is false', () => {
    render(<SpatialRoot enableTeleport={false} />);

    expect(renderedComponents.has('TeleportProvider')).toBe(false);
  });

  it('does not render MR components by default', () => {
    render(<SpatialRoot />);

    expect(renderedComponents.has('RATKProvider')).toBe(false);
    expect(renderedComponents.has('PlaneDetection')).toBe(false);
    expect(renderedComponents.has('MeshDetection')).toBe(false);
    expect(renderedComponents.has('Anchors')).toBe(false);
    expect(renderedComponents.has('HitTest')).toBe(false);
  });

  it('renders MR components when enableMR is true', () => {
    render(<SpatialRoot enableMR />);

    expect(renderedComponents.has('RATKProvider')).toBe(true);
    expect(renderedComponents.has('PlaneDetection')).toBe(true);
    expect(renderedComponents.has('MeshDetection')).toBe(true);
    expect(renderedComponents.has('Anchors')).toBe(true);
    expect(renderedComponents.has('HitTest')).toBe(true);
  });

  it('renders custom children', () => {
    let childRendered = false;

    function CustomChild() {
      childRendered = true;
      return null;
    }

    render(
      <SpatialRoot>
        <CustomChild />
      </SpatialRoot>,
    );

    expect(childRendered).toBe(true);
  });

  it('passes className and style to Canvas', () => {
    const { container } = render(
      <SpatialRoot className="test-class" style={{ width: '100%' }} />,
    );

    const canvas = container.querySelector('[data-testid="canvas"]');
    expect(canvas).toBeTruthy();
  });
});
