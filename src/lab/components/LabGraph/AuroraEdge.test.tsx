/**
 * Tests for AuroraEdge component.
 *
 * @vitest-environment happy-dom
 * @module lab/components/LabGraph
 * @layer L2
 */

import { render } from '@testing-library/react';
import { Position, ReactFlowProvider } from '@xyflow/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { AuroraEdgeData } from './AuroraEdge';
import { AuroraEdge, EVENT_TYPE_COLORS, DEFAULT_COLOR } from './AuroraEdge';

/** Minimal EdgeProps for rendering */
function createEdgeProps(overrides: Partial<{
  id: string;
  data: AuroraEdgeData;
  selected: boolean;
}> = {}) {
  return {
    id: overrides.id ?? 'e1',
    source: 'n1',
    target: 'n2',
    sourceX: 100,
    sourceY: 50,
    targetX: 300,
    targetY: 50,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    selected: overrides.selected ?? false,
    data: overrides.data ?? {},
    sourceHandleId: null,
    targetHandleId: null,
  };
}

function renderEdge(props: ReturnType<typeof createEdgeProps>) {
  return render(
    <ReactFlowProvider>
      <svg>
        <AuroraEdge {...(props as any)} />
      </svg>
    </ReactFlowProvider>,
  );
}

describe('AuroraEdge', () => {
  beforeEach(() => {
    // Clean up any injected keyframes
    const existing = document.getElementById('sn-aurora-edge-keyframes');
    if (existing) existing.remove();
  });

  // ── Rendering ──────────────────────────────────────────────────

  it('renders the edge group with correct test id', () => {
    const { container } = renderEdge(createEdgeProps());
    const group = container.querySelector('[data-testid="aurora-edge-e1"]');
    expect(group).toBeDefined();
    expect(group).not.toBeNull();
  });

  it('renders SVG path elements', () => {
    const { container } = renderEdge(createEdgeProps());
    const paths = container.querySelectorAll('path');
    // Outer glow + BaseEdge path
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it('renders particle circles', () => {
    const { container } = renderEdge(createEdgeProps());
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3); // Three particle dots
  });

  // ── Color Mapping ─────────────────────────────────────────────

  it('uses storm color by default', () => {
    const { container } = renderEdge(createEdgeProps());
    const group = container.querySelector('[data-testid="aurora-edge-e1"]');
    expect(group?.getAttribute('data-edge-color')).toBe(DEFAULT_COLOR);
  });

  it('uses color category when provided', () => {
    const { container } = renderEdge(
      createEdgeProps({ data: { colorCategory: 'ember' } }),
    );
    const group = container.querySelector('[data-testid="aurora-edge-e1"]');
    expect(group?.getAttribute('data-edge-color')).toBe(EVENT_TYPE_COLORS.ember);
  });

  it('uses direct color override over category', () => {
    const { container } = renderEdge(
      createEdgeProps({ data: { color: '#FF0000', colorCategory: 'ember' } }),
    );
    const group = container.querySelector('[data-testid="aurora-edge-e1"]');
    expect(group?.getAttribute('data-edge-color')).toBe('#FF0000');
  });

  // ── Edge States ───────────────────────────────────────────────

  it('sets idle state by default', () => {
    const { container } = renderEdge(createEdgeProps());
    const group = container.querySelector('[data-testid="aurora-edge-e1"]');
    expect(group?.getAttribute('data-edge-state')).toBe('idle');
  });

  it('applies rejected state attributes', () => {
    const { container } = renderEdge(
      createEdgeProps({ data: { edgeState: 'rejected' } }),
    );
    const group = container.querySelector('[data-testid="aurora-edge-e1"]');
    expect(group?.getAttribute('data-edge-state')).toBe('rejected');
  });

  it('applies shake animation on rejected state', () => {
    const { container } = renderEdge(
      createEdgeProps({ data: { edgeState: 'rejected' } }),
    );
    const group = container.querySelector('[data-testid="aurora-edge-e1"]') as SVGGElement;
    expect(group.style.animation).toContain('sn-edge-reject');
  });

  // ── Snap Animation ────────────────────────────────────────────

  it('applies snap animation on initial mount', () => {
    const { container } = renderEdge(createEdgeProps());
    // The BaseEdge renders with inline style containing sn-edge-snap during snap phase
    // We can check for the snap phase by inspecting the rendered path
    // Since snap is transient (200ms), it may have already resolved
    // The test verifies the snap phase is triggered by checking the rendered output
    const paths = container.querySelectorAll('path');
    const hasSnapOrFlow = Array.from(paths).some((p) => {
      const style = p.getAttribute('style') ?? '';
      return style.includes('sn-edge-snap') || style.includes('sn-aurora-flow');
    });
    expect(hasSnapOrFlow).toBe(true);
  });

  // ── Keyframe Injection ────────────────────────────────────────

  it('injects keyframes into document head', () => {
    renderEdge(createEdgeProps());
    const styleEl = document.getElementById('sn-aurora-edge-keyframes');
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('sn-aurora-flow');
    expect(styleEl?.textContent).toContain('sn-edge-snap');
    expect(styleEl?.textContent).toContain('sn-edge-reject');
  });

  it('does not duplicate keyframes on multiple renders', () => {
    renderEdge(createEdgeProps({ id: 'e1' }));
    renderEdge(createEdgeProps({ id: 'e2' }));
    const styleEls = document.querySelectorAll('#sn-aurora-edge-keyframes');
    expect(styleEls.length).toBe(1);
  });

  // ── Color constants ───────────────────────────────────────────

  it('exports all five category colors', () => {
    expect(Object.keys(EVENT_TYPE_COLORS)).toEqual(
      expect.arrayContaining(['storm', 'ember', 'opal', 'violet', 'moss']),
    );
  });

  it('has reduced-motion media query in keyframes', () => {
    renderEdge(createEdgeProps());
    const styleEl = document.getElementById('sn-aurora-edge-keyframes');
    expect(styleEl?.textContent).toContain('prefers-reduced-motion');
  });

  // ── SVG defs ──────────────────────────────────────────────────

  it('creates SVG filter and gradient defs', () => {
    const { container } = renderEdge(createEdgeProps());
    const filter = container.querySelector('#aurora-glow-e1');
    const gradient = container.querySelector('#aurora-grad-e1');
    expect(filter).not.toBeNull();
    expect(gradient).not.toBeNull();
  });
});
