/**
 * AI Completion Handler Tests
 *
 * @module runtime/ai-completion
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useWidgetStore } from '../../kernel/stores/widget/widget.store';
import type { WidgetBridge } from '../bridge/bridge';
import type { WidgetMessage } from '../bridge/message-types';

import { handleAiCompletionMessage } from './ai-completion-handler';

// Mock the kernel bus
vi.mock('../../kernel/bus', () => ({
  bus: {
    emit: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// Mock supabase client
vi.mock('../../kernel/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { success: true, text: 'Hello from AI' },
        error: null,
      }),
    },
  },
}));

function createMockBridge(): WidgetBridge & { sentMessages: unknown[] } {
  const sentMessages: unknown[] = [];
  return {
    send(message: unknown) {
      sentMessages.push(message);
    },
    onMessage: vi.fn(),
    isReady: () => true,
    destroy: vi.fn(),
    sentMessages,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function registerWidgetWithPermissions(widgetId: string, permissions: string[]) {
  const ws = useWidgetStore.getState();
  ws.registerWidget({
    widgetId,
    manifest: {
      id: widgetId,
      name: widgetId,
      version: '1.0.0',
      license: 'MIT',
      tags: [],
      category: 'utilities',
      permissions,
      events: { emits: [], subscribes: [] },
      config: { fields: [] },
      size: { defaultWidth: 200, defaultHeight: 150, aspectLocked: false },
      entry: 'index.html',
      crossCanvasChannels: [],
      spatialSupport: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    htmlContent: '<html></html>',
    isBuiltIn: false,
    installedAt: new Date().toISOString(),
  });
}

describe('AI Completion Handler', () => {
  beforeEach(() => {
    const ws = useWidgetStore.getState();
    for (const key of Object.keys(ws.registry)) {
      ws.unregisterWidget(key);
    }
  });

  describe('permission enforcement', () => {
    it('rejects AI_COMPLETE without ai permission', () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', []);

      const handled = handleAiCompletionMessage(
        { type: 'AI_COMPLETE', requestId: 'r1', prompt: 'hello' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      expect(handled).toBe(true);
      expect(bridge.sentMessages).toHaveLength(1);
      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'AI_RESPONSE',
        requestId: 'r1',
        text: '',
        error: expect.stringContaining('ai permission'),
      });
    });

    it('rejects AI_STREAM without ai permission', () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['storage']);

      const handled = handleAiCompletionMessage(
        { type: 'AI_STREAM', requestId: 'r2', prompt: 'hello' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );

      expect(handled).toBe(true);
      // Should send AI_CHUNK (done) + AI_RESPONSE (error)
      expect(bridge.sentMessages.length).toBeGreaterThanOrEqual(1);
      const response = bridge.sentMessages.find(
        (m: unknown) => (m as { type: string }).type === 'AI_RESPONSE',
      );
      expect(response).toMatchObject({
        type: 'AI_RESPONSE',
        requestId: 'r2',
        error: expect.stringContaining('ai permission'),
      });
    });
  });

  describe('rate limiting', () => {
    it('rejects after exceeding rate limit', () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['ai']);

      // Send 10 requests (should all be accepted)
      for (let i = 0; i < 10; i++) {
        handleAiCompletionMessage(
          { type: 'AI_COMPLETE', requestId: `r-${i}`, prompt: 'hello' } as WidgetMessage,
          { widgetId: 'test-widget', instanceId: 'rate-test-inst', bridge },
        );
      }

      // 11th should be rate limited
      const bridge2 = createMockBridge();
      handleAiCompletionMessage(
        { type: 'AI_COMPLETE', requestId: 'r-11', prompt: 'hello' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'rate-test-inst', bridge: bridge2 },
      );

      expect(bridge2.sentMessages[0]).toMatchObject({
        type: 'AI_RESPONSE',
        requestId: 'r-11',
        error: expect.stringContaining('Rate limit'),
      });
    });
  });

  describe('non-streaming completion', () => {
    it('handles AI_COMPLETE with ai permission', async () => {
      const bridge = createMockBridge();
      registerWidgetWithPermissions('test-widget', ['ai']);

      handleAiCompletionMessage(
        { type: 'AI_COMPLETE', requestId: 'r1', prompt: 'say hello' } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'complete-inst', bridge },
      );

      // Wait for async edge function call
      await vi.waitFor(() => {
        expect(bridge.sentMessages).toHaveLength(1);
      });

      expect(bridge.sentMessages[0]).toMatchObject({
        type: 'AI_RESPONSE',
        requestId: 'r1',
        text: 'Hello from AI',
      });
    });
  });

  describe('unhandled message types', () => {
    it('returns false for non-AI messages', () => {
      const bridge = createMockBridge();
      const handled = handleAiCompletionMessage(
        { type: 'EMIT', eventType: 'test', payload: {} } as WidgetMessage,
        { widgetId: 'test-widget', instanceId: 'inst-1', bridge },
      );
      expect(handled).toBe(false);
    });
  });
});
