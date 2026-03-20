/**
 * Tests for CardNode component.
 *
 * @vitest-environment happy-dom
 * @module lab/components/LabGraph
 * @layer L2
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { describe, it, expect, vi } from 'vitest';

import type { CardNodeData } from './CardNode';
import { CardNode, CATEGORY_HEX, NODE_TYPE_CATEGORY, SCENE_TYPE_CATEGORY } from './CardNode';

/** Wrap in ReactFlowProvider since PortDot uses Handle */
function renderCardNode(props: { id: string; data: CardNodeData; selected?: boolean }) {
  return render(
    <ReactFlowProvider>
      <CardNode {...props} />
    </ReactFlowProvider>,
  );
}

describe('CardNode', () => {
  // ── Rendering ──────────────────────────────────────────────────

  it('renders with widget-level nodeType', () => {
    renderCardNode({
      id: 'n1',
      data: { nodeType: 'subscribe', config: { eventType: 'timer.tick' } },
    });
    const node = screen.getByTestId('card-node-n1');
    expect(node).toBeDefined();
    expect(node.getAttribute('data-category')).toBe('storm');
  });

  it('renders with scene-level sceneType', () => {
    renderCardNode({
      id: 'n2',
      data: {
        sceneType: 'sticker',
        inputPorts: [],
        outputPorts: [{ id: 'click-emit', name: 'click', direction: 'output' }],
      },
    });
    const node = screen.getByTestId('card-node-n2');
    expect(node).toBeDefined();
    expect(node.getAttribute('data-category')).toBe('ember');
  });

  it('displays the correct label for widget node types', () => {
    renderCardNode({
      id: 'n3',
      data: { nodeType: 'emit', config: {} },
    });
    expect(screen.getByText('Emit')).toBeDefined();
  });

  it('displays custom label when provided', () => {
    renderCardNode({
      id: 'n4',
      data: { nodeType: 'subscribe', label: 'My Custom Node', config: {} },
    });
    expect(screen.getByText('My Custom Node')).toBeDefined();
  });

  it('displays event type in subtitle', () => {
    renderCardNode({
      id: 'n5',
      data: { nodeType: 'subscribe', config: { eventType: 'user.clicked' } },
    });
    expect(screen.getByText('user.clicked')).toBeDefined();
  });

  it('displays key in subtitle for setState', () => {
    renderCardNode({
      id: 'n6',
      data: { nodeType: 'setState', config: { key: 'counter' } },
    });
    expect(screen.getByText('key: counter')).toBeDefined();
  });

  // ── Color Coding ──────────────────────────────────────────────

  it('color-codes Storm (subscribe) correctly', () => {
    renderCardNode({
      id: 'storm',
      data: { nodeType: 'subscribe', config: {} },
    });
    expect(screen.getByTestId('card-node-storm').getAttribute('data-category')).toBe('storm');
  });

  it('color-codes Ember (emit) correctly', () => {
    renderCardNode({
      id: 'ember',
      data: { nodeType: 'emit', config: {} },
    });
    expect(screen.getByTestId('card-node-ember').getAttribute('data-category')).toBe('ember');
  });

  it('color-codes Violet (transform) correctly', () => {
    renderCardNode({
      id: 'violet',
      data: { nodeType: 'filter', config: {} },
    });
    expect(screen.getByTestId('card-node-violet').getAttribute('data-category')).toBe('violet');
  });

  it('color-codes Opal (state) correctly', () => {
    renderCardNode({
      id: 'opal',
      data: { nodeType: 'getState', config: {} },
    });
    expect(screen.getByTestId('card-node-opal').getAttribute('data-category')).toBe('opal');
  });

  it('color-codes Moss (integration) correctly', () => {
    renderCardNode({
      id: 'moss',
      data: { nodeType: 'integration.query', config: {} },
    });
    expect(screen.getByTestId('card-node-moss').getAttribute('data-category')).toBe('moss');
  });

  // ── Scene Types ───────────────────────────────────────────────

  it('color-codes all scene node types', () => {
    const expectations: Array<[string, string]> = [
      ['widget', 'storm'],
      ['sticker', 'ember'],
      ['docker', 'opal'],
      ['group', 'violet'],
      ['scene-input', 'moss'],
      ['scene-output', 'moss'],
    ];
    for (const [sceneType, expected] of expectations) {
      const { unmount } = renderCardNode({
        id: `scene-${sceneType}`,
        data: {
          sceneType: sceneType as CardNodeData['sceneType'],
          inputPorts: [],
          outputPorts: [],
        },
      });
      expect(
        screen.getByTestId(`card-node-scene-${sceneType}`).getAttribute('data-category'),
      ).toBe(expected);
      unmount();
    }
  });

  // ── Glassmorphism ─────────────────────────────────────────────

  it('applies glassmorphism backdrop filter', () => {
    renderCardNode({
      id: 'glass',
      data: { nodeType: 'subscribe', config: {} },
    });
    const node = screen.getByTestId('card-node-glass');
    expect(node.style.backdropFilter).toContain('blur');
  });

  it('has rounded corners (borderRadius 14px)', () => {
    renderCardNode({
      id: 'round',
      data: { nodeType: 'emit', config: {} },
    });
    const node = screen.getByTestId('card-node-round');
    expect(node.style.borderRadius).toBe('14px');
  });

  // ── Interaction ───────────────────────────────────────────────

  it('calls onEnterWidget on double-click for widget nodes', () => {
    const onEnter = vi.fn();
    renderCardNode({
      id: 'w1',
      data: {
        sceneType: 'widget',
        inputPorts: [],
        outputPorts: [],
        onEnterWidget: onEnter,
      },
    });
    fireEvent.doubleClick(screen.getByTestId('card-node-w1'));
    expect(onEnter).toHaveBeenCalledWith('w1');
  });

  it('does not call onEnterWidget for sticker nodes', () => {
    const onEnter = vi.fn();
    renderCardNode({
      id: 's1',
      data: {
        sceneType: 'sticker',
        inputPorts: [],
        outputPorts: [],
        onEnterWidget: onEnter,
      },
    });
    fireEvent.doubleClick(screen.getByTestId('card-node-s1'));
    expect(onEnter).not.toHaveBeenCalled();
  });

  // ── Exports ───────────────────────────────────────────────────

  it('exports CATEGORY_HEX with all five categories', () => {
    expect(Object.keys(CATEGORY_HEX)).toEqual(
      expect.arrayContaining(['storm', 'ember', 'opal', 'violet', 'moss']),
    );
  });

  it('maps all NodeTypes to categories', () => {
    const nodeTypes = [
      'subscribe', 'emit', 'transform', 'filter', 'map',
      'setState', 'getState', 'integration.query', 'integration.mutate',
    ];
    for (const nt of nodeTypes) {
      expect(NODE_TYPE_CATEGORY[nt as keyof typeof NODE_TYPE_CATEGORY]).toBeDefined();
    }
  });

  it('maps all SceneNodeTypes to categories', () => {
    const sceneTypes = ['widget', 'sticker', 'docker', 'group', 'scene-input', 'scene-output'];
    for (const st of sceneTypes) {
      expect(SCENE_TYPE_CATEGORY[st as keyof typeof SCENE_TYPE_CATEGORY]).toBeDefined();
    }
  });
});
