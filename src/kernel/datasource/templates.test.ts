/**
 * Templates — Unit Tests
 *
 * Tests template listing, filtering, and application.
 *
 * @module kernel/datasource/templates.test
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock supabase before imports
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock bus before imports
vi.mock('../bus', () => ({
  bus: {
    emit: vi.fn(),
    subscribe: vi.fn(),
  },
}));

import { DataManagerEvents } from '@sn/types';

import { bus } from '../bus';
import { supabase } from '../supabase';

import {
  getTemplates,
  getTemplatesByCategory,
  getTemplate,
  applyTemplate,
} from './templates';

const TEST_USER_ID = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTemplates', () => {
  it('returns all templates', () => {
    const templates = getTemplates();
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((t) => t.id && t.name && t.columns.length > 0)).toBe(true);
  });

  it('every template has a unique ID', () => {
    const templates = getTemplates();
    const ids = templates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getTemplatesByCategory', () => {
  it('filters by category', () => {
    const pmTemplates = getTemplatesByCategory('project_management');
    expect(pmTemplates.length).toBeGreaterThan(0);
    expect(pmTemplates.every((t) => t.category === 'project_management')).toBe(true);
  });

  it('returns empty array for unused category', () => {
    const result = getTemplatesByCategory('finance');
    expect(result).toEqual([]);
  });
});

describe('getTemplate', () => {
  it('returns a template by ID', () => {
    const template = getTemplate('project-tracker');
    expect(template).toBeDefined();
    expect(template?.name).toBe('Project Tracker');
  });

  it('returns undefined for unknown ID', () => {
    expect(getTemplate('nonexistent')).toBeUndefined();
  });
});

describe('applyTemplate', () => {
  it('creates a DataSource from a template', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'new-ds-id' },
        error: null,
      }),
    };
    (supabase.from as Mock).mockReturnValue(chain);

    const result = await applyTemplate('project-tracker', TEST_USER_ID, {
      includeSampleRows: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dataSourceId).toBe('new-ds-id');
    }

    // Verify insert was called with correct data
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'table',
        owner_id: TEST_USER_ID,
        scope: 'user',
      }),
    );

    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.TEMPLATE_APPLIED,
      expect.objectContaining({ templateId: 'project-tracker' }),
    );
  });

  it('returns NOT_FOUND for unknown template', async () => {
    const result = await applyTemplate('nonexistent', TEST_USER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('creates empty rows when includeSampleRows is false', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'new-ds-id' },
        error: null,
      }),
    };
    (supabase.from as Mock).mockReturnValue(chain);

    await applyTemplate('project-tracker', TEST_USER_ID, {
      includeSampleRows: false,
    });

    // Verify content has empty rows
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        content: { rows: [] },
      }),
    );
  });
});
