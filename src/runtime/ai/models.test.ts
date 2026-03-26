/**
 * AI Models Registry Tests
 *
 * @module runtime/ai
 * @layer L3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  AI_MODELS,
  getDefaultModel,
  getModelById,
  loadSavedModelId,
  saveModelId,
  type AIModel,
} from './models';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const storageMock: Record<string, string> = {};

beforeEach(() => {
  // Clear storage mock
  Object.keys(storageMock).forEach((k) => delete storageMock[k]);
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => storageMock[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storageMock[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storageMock[key];
    }),
  });
});

// ---------------------------------------------------------------------------
// AI_MODELS constant
// ---------------------------------------------------------------------------

describe('AI_MODELS', () => {
  it('contains at least one model', () => {
    expect(AI_MODELS.length).toBeGreaterThan(0);
  });

  it('has exactly one default model', () => {
    const defaults = AI_MODELS.filter((m) => m.isDefault);
    expect(defaults).toHaveLength(1);
  });

  it('every model has a non-empty id, name, provider, and description', () => {
    for (const model of AI_MODELS) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(['anthropic', 'replicate']).toContain(model.provider);
      expect(model.description).toBeTruthy();
    }
  });

  it('replicate models have a replicateModel field', () => {
    const replicateModels = AI_MODELS.filter((m) => m.provider === 'replicate');
    for (const model of replicateModels) {
      expect(model.replicateModel).toBeTruthy();
    }
  });

  it('anthropic models do not have a replicateModel field', () => {
    const anthropicModels = AI_MODELS.filter((m) => m.provider === 'anthropic');
    for (const model of anthropicModels) {
      expect(model.replicateModel).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// getDefaultModel
// ---------------------------------------------------------------------------

describe('getDefaultModel', () => {
  it('returns the model marked as isDefault', () => {
    const model = getDefaultModel();
    expect(model.isDefault).toBe(true);
  });

  it('returns a valid AIModel with all required fields', () => {
    const model = getDefaultModel();
    expect(model.id).toBeTruthy();
    expect(model.name).toBeTruthy();
    expect(model.provider).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getModelById
// ---------------------------------------------------------------------------

describe('getModelById', () => {
  it('returns the correct model for a known id', () => {
    const model = getModelById('anthropic/claude-sonnet-4');
    expect(model.id).toBe('anthropic/claude-sonnet-4');
    expect(model.name).toBe('Claude Sonnet 4');
  });

  it('falls back to the default model for an unknown id', () => {
    const model = getModelById('nonexistent/model');
    expect(model).toEqual(getDefaultModel());
  });

  it('returns correctly for each model in the registry', () => {
    for (const m of AI_MODELS) {
      expect(getModelById(m.id).id).toBe(m.id);
    }
  });
});

// ---------------------------------------------------------------------------
// loadSavedModelId
// ---------------------------------------------------------------------------

describe('loadSavedModelId', () => {
  it('returns the default model id when nothing is saved', () => {
    expect(loadSavedModelId()).toBe(getDefaultModel().id);
  });

  it('returns the saved model id when it exists in AI_MODELS', () => {
    const target = AI_MODELS[AI_MODELS.length - 1];
    storageMock['sn:lab:ai-model'] = target.id;
    expect(loadSavedModelId()).toBe(target.id);
  });

  it('returns the default model id when the saved id is not in AI_MODELS', () => {
    storageMock['sn:lab:ai-model'] = 'nonexistent/model';
    expect(loadSavedModelId()).toBe(getDefaultModel().id);
  });

  it('returns the default model id when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('SecurityError');
      }),
      setItem: vi.fn(),
    });
    expect(loadSavedModelId()).toBe(getDefaultModel().id);
  });
});

// ---------------------------------------------------------------------------
// saveModelId
// ---------------------------------------------------------------------------

describe('saveModelId', () => {
  it('saves the model id to localStorage', () => {
    saveModelId('replicate/kimi-k2.5');
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'sn:lab:ai-model',
      'replicate/kimi-k2.5',
    );
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      }),
    });
    expect(() => saveModelId('anthropic/claude-sonnet-4')).not.toThrow();
  });
});
