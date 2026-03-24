/**
 * Tests for auto-wire module
 *
 * @module lab/ai
 * @layer L2
 */

import { describe, it, expect, vi } from 'vitest';

import type { WidgetManifest } from '@sn/types';

import { autoWireWidget, type AutoWireGraphAPI } from './auto-wire';
import type { CompatibleWidget } from './prompt-questions';

// ─── Helpers ─────────────────────────────────────────────────────────

function createManifest(overrides: Partial<WidgetManifest> = {}): WidgetManifest {
  return {
    name: 'NewWidget',
    version: '0.1.0',
    events: { emits: [], subscribes: [] },
    ...overrides,
  } as WidgetManifest;
}

function createWidget(overrides: Partial<CompatibleWidget> = {}): CompatibleWidget {
  return {
    name: 'TargetWidget',
    widgetId: 'target-1',
    ports: [],
    portContracts: { emits: [], subscribes: [] },
    compatibility: 'high',
    ...overrides,
  };
}

function createGraphAPI(nodes: Array<{ id: string; label: string; widgetId?: string }> = []): AutoWireGraphAPI & {
  addedEdges: Array<{ source: string; sourcePort: string; target: string; targetPort: string }>;
} {
  const mutableNodes = [...nodes];
  const addedEdges: Array<{ source: string; sourcePort: string; target: string; targetPort: string }> = [];

  return {
    addedEdges,
    getSceneNodes: vi.fn(() => mutableNodes),
    addWidgetFromLibrary: vi.fn((entry) => {
      mutableNodes.push({
        id: `node-${mutableNodes.length}`,
        label: entry.manifest.name,
        widgetId: entry.widgetId,
      });
    }),
    addSceneEdge: vi.fn((source, sourcePort, target, targetPort) => {
      addedEdges.push({ source, sourcePort, target, targetPort });
    }),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('autoWireWidget', () => {
  it('wires matching output→input ports between new and selected widgets', () => {
    const newManifest = createManifest({
      name: 'Timer',
      events: {
        emits: [{ name: 'tick' }],
        subscribes: [],
      },
    });

    const selected = createWidget({
      name: 'Display',
      portContracts: {
        emits: [],
        subscribes: [{ name: 'tick' }],
      },
    });

    const api = createGraphAPI([
      { id: 'node-0', label: 'Timer', widgetId: 'gen-1' },
      { id: 'node-1', label: 'Display', widgetId: 'target-1' },
    ]);

    autoWireWidget('gen-1', newManifest, [selected], api, []);

    expect(api.addedEdges).toHaveLength(1);
    expect(api.addedEdges[0]).toEqual({
      source: 'node-0',
      sourcePort: 'emit-0',
      target: 'node-1',
      targetPort: 'sub-0',
    });
  });

  it('wires selected widget outputs → new widget inputs', () => {
    const newManifest = createManifest({
      name: 'Listener',
      events: {
        emits: [],
        subscribes: [{ name: 'data-ready' }],
      },
    });

    const selected = createWidget({
      name: 'DataSource',
      portContracts: {
        emits: [{ name: 'data-ready' }],
        subscribes: [],
      },
    });

    const api = createGraphAPI([
      { id: 'node-0', label: 'Listener' },
      { id: 'node-1', label: 'DataSource', widgetId: 'target-1' },
    ]);

    autoWireWidget('gen-1', newManifest, [selected], api, []);

    expect(api.addedEdges).toHaveLength(1);
    expect(api.addedEdges[0]).toEqual({
      source: 'node-1',
      sourcePort: 'emit-0',
      target: 'node-0',
      targetPort: 'sub-0',
    });
  });

  it('skips mismatched port names silently', () => {
    const newManifest = createManifest({
      name: 'Widget',
      events: {
        emits: [{ name: 'foo' }],
        subscribes: [],
      },
    });

    const selected = createWidget({
      portContracts: {
        emits: [],
        subscribes: [{ name: 'bar' }],
      },
    });

    const api = createGraphAPI([
      { id: 'node-0', label: 'Widget' },
      { id: 'node-1', label: 'TargetWidget', widgetId: 'target-1' },
    ]);

    autoWireWidget('gen-1', newManifest, [selected], api, []);

    expect(api.addedEdges).toHaveLength(0);
  });

  it('does nothing when no selected widgets', () => {
    const api = createGraphAPI([{ id: 'node-0', label: 'Widget' }]);
    autoWireWidget('gen-1', createManifest(), [], api, []);
    expect(api.addedEdges).toHaveLength(0);
  });

  it('does nothing when new widget is not found in graph', () => {
    const api = createGraphAPI([]); // empty graph
    autoWireWidget('gen-1', createManifest(), [createWidget()], api, []);
    expect(api.addedEdges).toHaveLength(0);
  });

  it('wires synonym-matched ports (changed ↔ updated)', () => {
    const newManifest = createManifest({
      name: 'Counter',
      events: {
        emits: [{ name: 'countChanged' }],
        subscribes: [],
      },
    });

    const selected = createWidget({
      name: 'Display',
      portContracts: {
        emits: [],
        subscribes: [{ name: 'countUpdated' }],
      },
    });

    const api = createGraphAPI([
      { id: 'node-0', label: 'Counter' },
      { id: 'node-1', label: 'Display', widgetId: 'target-1' },
    ]);

    autoWireWidget('gen-1', newManifest, [selected], api, []);

    // Synonym match: changed ↔ updated → score 0.7 (≥ default minScore 0.7)
    expect(api.addedEdges).toHaveLength(1);
  });

  it('wires normalized-matched ports (camelCase ↔ kebab-case)', () => {
    const newManifest = createManifest({
      name: 'Widget',
      events: {
        emits: [{ name: 'itemCreated' }],
        subscribes: [],
      },
    });

    const selected = createWidget({
      name: 'List',
      portContracts: {
        emits: [],
        subscribes: [{ name: 'item-created' }],
      },
    });

    const api = createGraphAPI([
      { id: 'node-0', label: 'Widget' },
      { id: 'node-1', label: 'List', widgetId: 'target-1' },
    ]);

    autoWireWidget('gen-1', newManifest, [selected], api, []);

    expect(api.addedEdges).toHaveLength(1);
  });

  it('respects minScore option', () => {
    const newManifest = createManifest({
      name: 'Counter',
      events: {
        emits: [{ name: 'countChanged' }],
        subscribes: [],
      },
    });

    const selected = createWidget({
      name: 'Display',
      portContracts: {
        emits: [],
        subscribes: [{ name: 'countUpdated' }],
      },
    });

    const api = createGraphAPI([
      { id: 'node-0', label: 'Counter' },
      { id: 'node-1', label: 'Display', widgetId: 'target-1' },
    ]);

    // Synonym score is 0.7 — setting minScore to 0.8 should exclude it
    autoWireWidget('gen-1', newManifest, [selected], api, [], { minScore: 0.8 });
    expect(api.addedEdges).toHaveLength(0);
  });

  it('adds selected widget from registry if not in graph', () => {
    const newManifest = createManifest({
      name: 'Timer',
      events: { emits: [{ name: 'tick' }], subscribes: [] },
    });

    const selected = createWidget({
      name: 'Clock',
      widgetId: 'clock-1',
      portContracts: {
        emits: [],
        subscribes: [{ name: 'tick' }],
      },
    });

    const api = createGraphAPI([
      { id: 'node-0', label: 'Timer' },
    ]);

    const installedWidgets = [{
      widgetId: 'clock-1',
      manifest: {
        name: 'Clock',
        version: '1.0.0',
        events: { emits: [], subscribes: [{ name: 'tick' }] },
      } as unknown as WidgetManifest,
      htmlContent: '<html></html>',
      isBuiltIn: false,
      installedAt: '2024-01-01',
    }];

    autoWireWidget('gen-1', newManifest, [selected], api, installedWidgets);

    expect(api.addWidgetFromLibrary).toHaveBeenCalledTimes(1);
    // Should still wire since the Clock was added
    expect(api.addedEdges).toHaveLength(1);
  });
});
