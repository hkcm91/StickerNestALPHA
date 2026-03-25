/**
 * AI Agent Widget Tests
 *
 * @module runtime/widgets/ai-agent
 * @layer L3
 */

import { describe, it, expect, vi } from 'vitest';

import { AI_AGENT_EVENTS } from './ai-agent.events';
import { AgentMessageSchema, MAX_CONVERSATION_LENGTH, AGENT_COLORS } from './ai-agent.schema';
import { aiAgentManifest } from './ai-agent.widget';

// Mock React hooks to avoid rendering dependencies
vi.mock('../../hooks', () => ({
  useEmit: () => vi.fn(),
  useSubscribe: vi.fn(),
  useWidgetState: () => [{}, vi.fn()],
}));

describe('AI Agent Widget', () => {
  describe('manifest', () => {
    it('has correct widget id', () => {
      expect(aiAgentManifest.id).toBe('sn.builtin.ai-agent');
    });

    it('declares ai permission', () => {
      expect(aiAgentManifest.permissions).toContain('ai');
    });

    it('declares storage permission', () => {
      expect(aiAgentManifest.permissions).toContain('storage');
    });

    it('declares user-state permission', () => {
      expect(aiAgentManifest.permissions).toContain('user-state');
    });

    it('has correct size defaults', () => {
      expect(aiAgentManifest.size?.defaultWidth).toBe(400);
      expect(aiAgentManifest.size?.defaultHeight).toBe(600);
      expect(aiAgentManifest.size?.minWidth).toBe(320);
      expect(aiAgentManifest.size?.minHeight).toBe(400);
    });

    it('declares all required emits events', () => {
      const emitNames = aiAgentManifest.events?.emits?.map((e) => e.name) ?? [];
      expect(emitNames).toContain(AI_AGENT_EVENTS.emits.READY);
      expect(emitNames).toContain(AI_AGENT_EVENTS.emits.MESSAGE_SENT);
      expect(emitNames).toContain(AI_AGENT_EVENTS.emits.RESPONSE_RECEIVED);
      expect(emitNames).toContain(AI_AGENT_EVENTS.emits.ACTION_TAKEN);
      expect(emitNames).toContain(AI_AGENT_EVENTS.emits.ERROR);
    });

    it('declares all required subscribes events', () => {
      const subNames = aiAgentManifest.events?.subscribes?.map((e) => e.name) ?? [];
      expect(subNames).toContain(AI_AGENT_EVENTS.subscribes.SEND_MESSAGE);
      expect(subNames).toContain(AI_AGENT_EVENTS.subscribes.CANVAS_EVENT);
      expect(subNames).toContain(AI_AGENT_EVENTS.subscribes.CLEAR_HISTORY);
    });

    it('has config fields for persona', () => {
      const fieldNames = aiAgentManifest.config?.fields?.map((f) => f.name) ?? [];
      expect(fieldNames).toContain('personaName');
      expect(fieldNames).toContain('personaRole');
      expect(fieldNames).toContain('systemInstructions');
      expect(fieldNames).toContain('preferredModel');
    });

    it('has inline entry point (built-in widget)', () => {
      expect(aiAgentManifest.entry).toBe('inline');
    });

    it('uses MIT license', () => {
      expect(aiAgentManifest.license).toBe('MIT');
    });
  });

  describe('events', () => {
    it('event constants are properly namespaced', () => {
      expect(AI_AGENT_EVENTS.emits.READY).toMatch(/^ai-agent\./);
      expect(AI_AGENT_EVENTS.emits.MESSAGE_SENT).toMatch(/^ai-agent\./);
      expect(AI_AGENT_EVENTS.subscribes.SEND_MESSAGE).toMatch(/^ai-agent\./);
    });
  });

  describe('schema', () => {
    it('validates a valid agent message', () => {
      const msg = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      };
      const result = AgentMessageSchema.safeParse(msg);
      expect(result.success).toBe(true);
    });

    it('rejects message with invalid role', () => {
      const msg = {
        id: 'msg-1',
        role: 'admin',
        content: 'Hello',
        timestamp: Date.now(),
      };
      const result = AgentMessageSchema.safeParse(msg);
      expect(result.success).toBe(false);
    });

    it('accepts assistant role', () => {
      const msg = {
        id: 'msg-1',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: Date.now(),
      };
      const result = AgentMessageSchema.safeParse(msg);
      expect(result.success).toBe(true);
    });

    it('accepts system role', () => {
      const msg = {
        id: 'msg-1',
        role: 'system',
        content: 'System message',
        timestamp: Date.now(),
      };
      const result = AgentMessageSchema.safeParse(msg);
      expect(result.success).toBe(true);
    });
  });

  describe('constants', () => {
    it('has reasonable max conversation length', () => {
      expect(MAX_CONVERSATION_LENGTH).toBe(100);
      expect(MAX_CONVERSATION_LENGTH).toBeGreaterThan(0);
    });

    it('has theme-aware colors', () => {
      expect(AGENT_COLORS.userBubble).toContain('var(--sn-');
      expect(AGENT_COLORS.assistantBubble).toContain('var(--sn-');
    });
  });
});
