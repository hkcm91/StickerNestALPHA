/**
 * AI Canvas Agent Widget — Tests
 *
 * Tests for manifest, module structure, and integration patterns.
 * UI rendering tests require happy-dom (configured in vitest.config.ts).
 *
 * @module runtime/widgets/ai-canvas-agent
 */

import { describe, it, expect } from 'vitest';

import { aiCanvasAgentManifest, AICanvasAgentWidget } from './ai-canvas-agent.widget';

describe('aiCanvasAgentManifest', () => {
  it('has correct widget ID', () => {
    expect(aiCanvasAgentManifest.id).toBe('sn.builtin.ai-canvas-agent');
  });

  it('declares inline entry', () => {
    expect(aiCanvasAgentManifest.entry).toBe('inline');
  });

  it('requires ai permission', () => {
    expect(aiCanvasAgentManifest.permissions).toContain('ai');
  });

  it('declares expected event emitters', () => {
    const emitNames = aiCanvasAgentManifest.events.emits.map((e) => e.name);
    expect(emitNames).toContain('widget.ai-canvas-agent.ready');
    expect(emitNames).toContain('widget.ai-canvas-agent.command.started');
    expect(emitNames).toContain('widget.ai-canvas-agent.command.completed');
    expect(emitNames).toContain('widget.ai-canvas-agent.command.failed');
  });

  it('subscribes to entity selection events', () => {
    const subNames = aiCanvasAgentManifest.events.subscribes.map((e) => e.name);
    expect(subNames).toContain('canvas.entity.selected');
    expect(subNames).toContain('canvas.selection.cleared');
  });

  it('has minimum size constraints', () => {
    expect(aiCanvasAgentManifest.size?.minWidth).toBeGreaterThan(0);
    expect(aiCanvasAgentManifest.size?.minHeight).toBeGreaterThan(0);
  });

  it('is categorized as utilities', () => {
    expect(aiCanvasAgentManifest.category).toBe('utilities');
  });
});

describe('AICanvasAgentWidget', () => {
  it('exports a React component', () => {
    expect(typeof AICanvasAgentWidget).toBe('function');
  });
});
