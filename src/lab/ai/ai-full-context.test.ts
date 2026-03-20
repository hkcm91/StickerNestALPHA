import { describe, it, expect } from 'vitest';

import { serializeFullContextForPrompt } from './ai-full-context';
import type { AIFullContext } from './ai-full-context';

function makeContext(overrides?: Partial<AIFullContext>): AIFullContext {
  return {
    level: 'scene',
    breadcrumbs: ['Root'],
    scene: { nodeCount: 0, edgeCount: 0, nodes: [], edges: [] },
    widget: null,
    orphanedPorts: [],
    connectionHints: [],
    designSpec: null,
    currentSource: null,
    manifest: null,
    previewState: null,
    platformTheme: null,
    versionHistory: [],
    editorDirtyState: false,
    ...overrides,
  };
}

describe('serializeFullContextForPrompt', () => {
  it('includes graph context', () => {
    const result = serializeFullContextForPrompt(makeContext());
    expect(result).toContain('=== GRAPH CONTEXT ===');
  });

  it('includes design system when present', () => {
    const result = serializeFullContextForPrompt(makeContext({
      designSpec: {
        version: 1,
        name: 'Dark Theme',
        colors: { primary: '#6366f1', background: '#1a1a1a' },
        typography: { fontFamily: 'Inter' },
      },
    }));
    expect(result).toContain('=== DESIGN SYSTEM ===');
    expect(result).toContain('Dark Theme');
    expect(result).toContain('#6366f1');
    expect(result).toContain('Inter');
    expect(result).toContain('=== END DESIGN SYSTEM ===');
  });

  it('includes current source', () => {
    const result = serializeFullContextForPrompt(makeContext({
      currentSource: '<div>Hello World</div>',
    }));
    expect(result).toContain('=== CURRENT SOURCE ===');
    expect(result).toContain('<div>Hello World</div>');
  });

  it('truncates source to 200 lines', () => {
    const longSource = Array.from({ length: 300 }, (_, i) => `line ${i}`).join('\n');
    const result = serializeFullContextForPrompt(makeContext({
      currentSource: longSource,
    }));
    expect(result).toContain('Truncated to last 200 of 300 lines');
    expect(result).toContain('line 299');
    expect(result).not.toContain('line 0\n');
  });

  it('includes manifest', () => {
    const result = serializeFullContextForPrompt(makeContext({
      manifest: {
        id: 'test',
        name: 'Test Widget',
        version: '1.0.0',
        license: 'MIT',
        tags: [],
        category: 'other',
        permissions: ['storage'],
        events: {
          emits: [{ name: 'tick' }],
          subscribes: [{ name: 'reset' }],
        },
        config: { fields: [] },
        size: { defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
        entry: 'index.html',
        crossCanvasChannels: [],
        spatialSupport: false,
      },
    }));
    expect(result).toContain('=== MANIFEST ===');
    expect(result).toContain('Test Widget');
    expect(result).toContain('Emits: tick');
    expect(result).toContain('Subscribes: reset');
    expect(result).toContain('Permissions: storage');
  });

  it('includes preview state', () => {
    const result = serializeFullContextForPrompt(makeContext({
      previewState: {
        mode: '2d-isolated',
        isReady: true,
        lastError: null,
      },
    }));
    expect(result).toContain('=== PREVIEW STATE ===');
    expect(result).toContain('2d-isolated');
    expect(result).toContain('Ready: true');
  });

  it('includes platform theme', () => {
    const result = serializeFullContextForPrompt(makeContext({
      platformTheme: {
        name: 'dark',
        tokens: { '--sn-bg': '#1a1a1a' },
      },
    }));
    expect(result).toContain('=== PLATFORM THEME ===');
    expect(result).toContain('dark');
    expect(result).toContain('--sn-bg: #1a1a1a');
  });

  it('includes version history', () => {
    const result = serializeFullContextForPrompt(makeContext({
      versionHistory: [
        { label: 'v1', createdAt: '2025-01-01' },
        { label: 'v2', createdAt: '2025-01-02' },
      ],
    }));
    expect(result).toContain('=== VERSION HISTORY ===');
    expect(result).toContain('v1');
    expect(result).toContain('v2');
  });

  it('omits empty sections gracefully', () => {
    const result = serializeFullContextForPrompt(makeContext());
    expect(result).not.toContain('=== DESIGN SYSTEM ===');
    expect(result).not.toContain('=== CURRENT SOURCE ===');
    expect(result).not.toContain('=== MANIFEST ===');
    expect(result).not.toContain('=== PREVIEW STATE ===');
    expect(result).not.toContain('=== PLATFORM THEME ===');
    expect(result).not.toContain('=== VERSION HISTORY ===');
  });
});
