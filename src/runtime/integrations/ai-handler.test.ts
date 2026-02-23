/**
 * AI Integration Handler Tests
 *
 * @module runtime/integrations
 * @layer L3
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Supabase client before imports
vi.mock('../../kernel/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from '../../kernel/supabase/client';

import { createAiHandler } from './ai-handler';

const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;

describe('AI Integration Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('query()', () => {
    it('returns data on successful generation', async () => {
      const responseData = {
        success: true,
        data: {
          output: ['https://replicate.delivery/image.png'],
          id: 'pred_abc123',
          status: 'succeeded',
        },
      };
      mockInvoke.mockResolvedValue({ data: responseData, error: null });

      const handler = createAiHandler();
      const result = await handler.query({
        action: 'generate-image',
        model: 'stability-ai/sdxl:abc123',
        input: { prompt: 'a cat' },
      });

      expect(result).toEqual(responseData.data);
      expect(mockInvoke).toHaveBeenCalledWith('ai-generate', {
        body: {
          action: 'generate-image',
          model: 'stability-ai/sdxl:abc123',
          input: { prompt: 'a cat' },
        },
      });
    });

    it('throws on missing action', async () => {
      const handler = createAiHandler();
      await expect(
        handler.query({ model: 'some-model', input: { prompt: 'test' } }),
      ).rejects.toThrow('Invalid AI query params');
    });

    it('throws on invalid action value', async () => {
      const handler = createAiHandler();
      await expect(
        handler.query({
          action: 'generate-video',
          model: 'some-model',
          input: { prompt: 'test' },
        }),
      ).rejects.toThrow('Invalid AI query params');
    });

    it('throws on empty model string', async () => {
      const handler = createAiHandler();
      await expect(
        handler.query({
          action: 'generate-image',
          model: '',
          input: { prompt: 'test' },
        }),
      ).rejects.toThrow('Invalid AI query params');
    });

    it('throws on Supabase invoke error', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Edge function not found' },
      });

      const handler = createAiHandler();
      await expect(
        handler.query({
          action: 'generate-image',
          model: 'some-model',
          input: { prompt: 'test' },
        }),
      ).rejects.toThrow('AI generation failed: Edge function not found');
    });

    it('throws on Replicate error (success: false)', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          success: false,
          error: 'Model not found',
          code: 'PROVIDER_ERROR',
        },
        error: null,
      });

      const handler = createAiHandler();
      await expect(
        handler.query({
          action: 'generate-image',
          model: 'bad-model',
          input: { prompt: 'test' },
        }),
      ).rejects.toThrow('Model not found');
    });

    it('throws on unexpected response shape', async () => {
      mockInvoke.mockResolvedValue({
        data: { unexpected: 'garbage' },
        error: null,
      });

      const handler = createAiHandler();
      await expect(
        handler.query({
          action: 'generate-image',
          model: 'some-model',
          input: { prompt: 'test' },
        }),
      ).rejects.toThrow('unexpected response format');
    });

    it('handles string output (single image)', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          data: {
            output: 'https://replicate.delivery/single.png',
            id: 'pred_single',
            status: 'succeeded',
          },
        },
        error: null,
      });

      const handler = createAiHandler();
      const result = await handler.query({
        action: 'generate-image',
        model: 'some-model',
        input: { prompt: 'test' },
      });

      expect(result).toEqual({
        output: 'https://replicate.delivery/single.png',
        id: 'pred_single',
        status: 'succeeded',
      });
    });
  });

  describe('mutate()', () => {
    it('throws — mutate is not supported', async () => {
      const handler = createAiHandler();
      await expect(handler.mutate({ anything: true })).rejects.toThrow(
        'does not support mutate',
      );
    });
  });
});
