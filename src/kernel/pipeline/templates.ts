/**
 * Pipeline Templates — pre-built pipeline patterns for one-click instantiation.
 *
 * Each template defines a DAG skeleton with placeholders (slots) for widgets
 * and pre-configured transform nodes. Users fill the slots with actual widgets
 * to instantiate the pipeline.
 *
 * @module kernel/pipeline
 * @layer L0
 */

import type { PipelineNode, PipelineEdge } from '../schemas/pipeline';

// ─── Types ───────────────────────────────────────────────────────────

export type PipelineTemplateCategory = 'data-flow' | 'sync' | 'broadcast' | 'automation' | 'monitoring';

/** A placeholder for a widget node in a template */
export interface TemplateSlot {
  id: string;
  label: string;
  requiredPorts: Array<{
    direction: 'input' | 'output';
    eventType?: string;
  }>;
}

/** A reusable pipeline pattern */
export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: PipelineTemplateCategory;
  /** Widget placeholders that the user fills */
  slots: TemplateSlot[];
  /** Pre-configured transform nodes */
  transforms: PipelineNode[];
  /** Edges connecting slots and transforms (use slot IDs as node IDs) */
  edges: PipelineEdge[];
}

// ─── Built-in Templates ──────────────────────────────────────────────

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  // 1. Data Flow: Source → Filter → Map → Display
  {
    id: 'tpl-data-flow',
    name: 'Data Flow',
    description: 'Route events from a source through a filter and transform to a display widget.',
    category: 'data-flow',
    slots: [
      {
        id: 'source',
        label: 'Data Source',
        requiredPorts: [{ direction: 'output' }],
      },
      {
        id: 'display',
        label: 'Display',
        requiredPorts: [{ direction: 'input' }],
      },
    ],
    transforms: [
      {
        id: 'tpl-filter',
        type: 'filter',
        position: { x: 200, y: 0 },
        config: { condition: '' },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
        outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
      },
      {
        id: 'tpl-map',
        type: 'map',
        position: { x: 400, y: 0 },
        config: { mapping: {} },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
        outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
      },
    ],
    edges: [
      { id: 'tpl-e1', sourceNodeId: 'source', sourcePortId: 'out', targetNodeId: 'tpl-filter', targetPortId: 'in' },
      { id: 'tpl-e2', sourceNodeId: 'tpl-filter', sourcePortId: 'out', targetNodeId: 'tpl-map', targetPortId: 'in' },
      { id: 'tpl-e3', sourceNodeId: 'tpl-map', sourcePortId: 'out', targetNodeId: 'display', targetPortId: 'in' },
    ],
  },

  // 2. Bidirectional Sync: Widget A ↔ Widget B (with debounce)
  {
    id: 'tpl-bidirectional-sync',
    name: 'Bidirectional Sync',
    description: 'Keep two widgets synchronized with debounced event forwarding in both directions.',
    category: 'sync',
    slots: [
      {
        id: 'widget-a',
        label: 'Widget A',
        requiredPorts: [{ direction: 'input' }, { direction: 'output' }],
      },
      {
        id: 'widget-b',
        label: 'Widget B',
        requiredPorts: [{ direction: 'input' }, { direction: 'output' }],
      },
    ],
    transforms: [
      {
        id: 'tpl-debounce-ab',
        type: 'debounce',
        position: { x: 200, y: -50 },
        config: { delayMs: 300 },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
        outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
      },
      {
        id: 'tpl-debounce-ba',
        type: 'debounce',
        position: { x: 200, y: 50 },
        config: { delayMs: 300 },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
        outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
      },
    ],
    edges: [
      { id: 'tpl-e1', sourceNodeId: 'widget-a', sourcePortId: 'out', targetNodeId: 'tpl-debounce-ab', targetPortId: 'in' },
      { id: 'tpl-e2', sourceNodeId: 'tpl-debounce-ab', sourcePortId: 'out', targetNodeId: 'widget-b', targetPortId: 'in' },
      { id: 'tpl-e3', sourceNodeId: 'widget-b', sourcePortId: 'out', targetNodeId: 'tpl-debounce-ba', targetPortId: 'in' },
      { id: 'tpl-e4', sourceNodeId: 'tpl-debounce-ba', sourcePortId: 'out', targetNodeId: 'widget-a', targetPortId: 'in' },
    ],
  },

  // 3. Fan-Out Broadcast: Source → [Target 1, Target 2, Target 3]
  {
    id: 'tpl-fan-out',
    name: 'Fan-Out Broadcast',
    description: 'Broadcast events from one source to multiple target widgets.',
    category: 'broadcast',
    slots: [
      {
        id: 'source',
        label: 'Source',
        requiredPorts: [{ direction: 'output' }],
      },
      {
        id: 'target-1',
        label: 'Target 1',
        requiredPorts: [{ direction: 'input' }],
      },
      {
        id: 'target-2',
        label: 'Target 2',
        requiredPorts: [{ direction: 'input' }],
      },
      {
        id: 'target-3',
        label: 'Target 3',
        requiredPorts: [{ direction: 'input' }],
      },
    ],
    transforms: [
      {
        id: 'tpl-merge',
        type: 'merge',
        position: { x: 200, y: 0 },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
        outputPorts: [
          { id: 'out-1', name: 'out-1', direction: 'output' },
          { id: 'out-2', name: 'out-2', direction: 'output' },
          { id: 'out-3', name: 'out-3', direction: 'output' },
        ],
      },
    ],
    edges: [
      { id: 'tpl-e1', sourceNodeId: 'source', sourcePortId: 'out', targetNodeId: 'tpl-merge', targetPortId: 'in' },
      { id: 'tpl-e2', sourceNodeId: 'tpl-merge', sourcePortId: 'out-1', targetNodeId: 'target-1', targetPortId: 'in' },
      { id: 'tpl-e3', sourceNodeId: 'tpl-merge', sourcePortId: 'out-2', targetNodeId: 'target-2', targetPortId: 'in' },
      { id: 'tpl-e4', sourceNodeId: 'tpl-merge', sourcePortId: 'out-3', targetNodeId: 'target-3', targetPortId: 'in' },
    ],
  },

  // 4. Sensor Pipeline: Source → Throttle → Accumulate → Map → Display
  {
    id: 'tpl-sensor-pipeline',
    name: 'Sensor Pipeline',
    description: 'Collect sensor data at a controlled rate, batch events, transform, and display.',
    category: 'monitoring',
    slots: [
      {
        id: 'sensor',
        label: 'Sensor / Source',
        requiredPorts: [{ direction: 'output' }],
      },
      {
        id: 'display',
        label: 'Display / Chart',
        requiredPorts: [{ direction: 'input' }],
      },
    ],
    transforms: [
      {
        id: 'tpl-throttle',
        type: 'throttle',
        position: { x: 200, y: 0 },
        config: { intervalMs: 500 },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
        outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
      },
      {
        id: 'tpl-accumulate',
        type: 'accumulate',
        position: { x: 400, y: 0 },
        config: { count: 5, mode: 'count' },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
        outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
      },
      {
        id: 'tpl-map',
        type: 'map',
        position: { x: 600, y: 0 },
        config: { mapping: {} },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
        outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
      },
    ],
    edges: [
      { id: 'tpl-e1', sourceNodeId: 'sensor', sourcePortId: 'out', targetNodeId: 'tpl-throttle', targetPortId: 'in' },
      { id: 'tpl-e2', sourceNodeId: 'tpl-throttle', sourcePortId: 'out', targetNodeId: 'tpl-accumulate', targetPortId: 'in' },
      { id: 'tpl-e3', sourceNodeId: 'tpl-accumulate', sourcePortId: 'out', targetNodeId: 'tpl-map', targetPortId: 'in' },
      { id: 'tpl-e4', sourceNodeId: 'tpl-map', sourcePortId: 'out', targetNodeId: 'display', targetPortId: 'in' },
    ],
  },

  // 5. AI Processing: Source → AI Transform → Display
  {
    id: 'tpl-ai-processing',
    name: 'AI Processing',
    description: 'Pass events through an LLM-powered transform for intelligent processing.',
    category: 'automation',
    slots: [
      {
        id: 'source',
        label: 'Source',
        requiredPorts: [{ direction: 'output' }],
      },
      {
        id: 'display',
        label: 'Display',
        requiredPorts: [{ direction: 'input' }],
      },
    ],
    transforms: [
      {
        id: 'tpl-ai',
        type: 'ai-transform',
        position: { x: 200, y: 0 },
        config: { prompt: 'Transform this data' },
        inputPorts: [{ id: 'in', name: 'in', direction: 'input' }],
        outputPorts: [{ id: 'out', name: 'out', direction: 'output' }],
      },
    ],
    edges: [
      { id: 'tpl-e1', sourceNodeId: 'source', sourcePortId: 'out', targetNodeId: 'tpl-ai', targetPortId: 'in' },
      { id: 'tpl-e2', sourceNodeId: 'tpl-ai', sourcePortId: 'out', targetNodeId: 'display', targetPortId: 'in' },
    ],
  },
];

// ─── Lookup Helpers ──────────────────────────────────────────────────

/**
 * Get a template by ID.
 */
export function getTemplate(id: string): PipelineTemplate | undefined {
  return PIPELINE_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates by category.
 */
export function getTemplatesByCategory(category: PipelineTemplateCategory): PipelineTemplate[] {
  return PIPELINE_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Search templates by keyword in name or description.
 */
export function searchTemplates(query: string): PipelineTemplate[] {
  const lower = query.toLowerCase();
  return PIPELINE_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower),
  );
}
