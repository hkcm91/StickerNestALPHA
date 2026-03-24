/**
 * AI Prompt Builder — Tests
 * @module kernel/ai
 */

import { describe, expect, it } from 'vitest';

import type { AICanvasContext } from '@sn/types';

import { buildAIPrompt, parseAIResponse } from './prompt-builder';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockContext: AICanvasContext = {
  canvasId: 'canvas-1',
  canvasName: 'Test Canvas',
  viewport: {
    centerX: 500,
    centerY: 400,
    zoom: 1,
    visibleWidth: 1920,
    visibleHeight: 1080,
  },
  entities: [
    { id: 'aaaa-1111', type: 'sticker', x: 100, y: 200, w: 50, h: 50, z: 0, name: 'Cat', props: { assetUrl: 'cat.png' } },
    { id: 'bbbb-2222', type: 'text', x: 200, y: 200, w: 100, h: 30, z: 1, props: { content: 'Hello' } },
  ],
  relations: [
    { from: 'aaaa-1111', to: 'bbbb-2222', relation: 'adjacent_right', distance: 50 },
  ],
  availableWidgets: [
    { widgetId: 'wgt-clock', name: 'Clock', category: 'utilities' },
  ],
  totalEntities: 2,
  timestamp: '2026-03-24T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildAIPrompt', () => {
  it('returns system prompt and messages', () => {
    const prompt = buildAIPrompt(mockContext, 'add a clock widget');

    expect(prompt.system).toContain('StickerNest canvas agent');
    expect(prompt.messages).toHaveLength(1);
    expect(prompt.messages[0].role).toBe('user');
    expect(prompt.messages[0].content).toContain('CANVAS STATE');
    expect(prompt.messages[0].content).toContain('add a clock widget');
  });

  it('includes entity info in text context', () => {
    const prompt = buildAIPrompt(mockContext, 'move the cat');

    expect(prompt.messages[0].content).toContain('sticker');
    expect(prompt.messages[0].content).toContain('Cat');
    expect(prompt.messages[0].content).toContain('aaaa-111');
  });

  it('includes spatial relations', () => {
    const prompt = buildAIPrompt(mockContext, 'test');

    expect(prompt.messages[0].content).toContain('adjacent_right');
  });

  it('includes available widgets', () => {
    const prompt = buildAIPrompt(mockContext, 'test');

    expect(prompt.messages[0].content).toContain('wgt-clock');
    expect(prompt.messages[0].content).toContain('Clock');
  });

  it('supports JSON context mode', () => {
    const prompt = buildAIPrompt(mockContext, 'test', { jsonContext: true });

    // JSON mode should have raw JSON structure
    expect(prompt.messages[0].content).toContain('"canvasId"');
    expect(prompt.messages[0].content).toContain('"entities"');
  });

  it('appends extra instructions to system prompt', () => {
    const prompt = buildAIPrompt(mockContext, 'test', {
      extraInstructions: 'Always use blue colors',
    });

    expect(prompt.system).toContain('Always use blue colors');
  });

  it('includes conversation history', () => {
    const prompt = buildAIPrompt(mockContext, 'now make it bigger', {
      history: [
        { role: 'user', content: 'add a rectangle' },
        { role: 'assistant', content: '{"actions": [...]}' },
      ],
    });

    expect(prompt.messages).toHaveLength(3);
    expect(prompt.messages[0].content).toBe('add a rectangle');
    expect(prompt.messages[1].role).toBe('assistant');
    expect(prompt.messages[2].content).toContain('now make it bigger');
  });
});

describe('parseAIResponse', () => {
  it('parses valid JSON response', () => {
    const response = JSON.stringify({
      reasoning: 'Adding a title',
      actions: [{ action: 'create_text', content: 'Title', position: { x: 0, y: 0 } }],
    });

    const result = parseAIResponse(response);
    expect(result.success).toBe(true);
    expect(result.actions).toHaveLength(1);
    expect(result.reasoning).toBe('Adding a title');
  });

  it('strips markdown fences', () => {
    const response = '```json\n{"reasoning": "test", "actions": []}\n```';

    const result = parseAIResponse(response);
    expect(result.success).toBe(true);
    expect(result.actions).toHaveLength(0);
  });

  it('extracts JSON from conversational text', () => {
    const response = 'Here is my plan:\n{"reasoning": "test", "actions": [{"action": "delete_entity", "entityId": "abc-123"}]}\nHope this helps!';

    const result = parseAIResponse(response);
    expect(result.success).toBe(true);
    expect(result.actions).toHaveLength(1);
  });

  it('returns error for invalid JSON', () => {
    const result = parseAIResponse('this is not json at all');

    expect(result.success).toBe(false);
    expect(result.error).toContain('JSON parse error');
  });

  it('handles empty actions array', () => {
    const result = parseAIResponse('{"reasoning": "nothing to do", "actions": []}');

    expect(result.success).toBe(true);
    expect(result.actions).toHaveLength(0);
    expect(result.reasoning).toBe('nothing to do');
  });
});
