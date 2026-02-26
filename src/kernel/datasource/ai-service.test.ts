/**
 * AI Service — Unit Tests
 *
 * Tests AI-assisted database operations: schema generation,
 * autofill, column suggestions, natural language queries,
 * and data extraction.
 *
 * @module kernel/datasource/ai-service.test
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
    }),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock bus
vi.mock('../bus', () => ({
  bus: {
    emit: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// Mock acl
vi.mock('./acl', () => ({
  getEffectiveRole: vi.fn().mockResolvedValue('owner'),
  canWrite: vi.fn().mockReturnValue(true),
}));

// Mock table-ops for schema/row fetching
vi.mock('./table-ops', () => ({
  getTableSchema: vi.fn(),
  getTableRows: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { DataManagerEvents } from '@sn/types';

import { bus } from '../bus';

import { generateSchema, autofill, suggestColumn, naturalLanguageQuery, extractData } from './ai-service';
import { getTableSchema, getTableRows } from './table-ops';

// =============================================================================
// Helpers
// =============================================================================

const TEST_DS_ID = '11111111-1111-4111-8111-111111111111';
const TEST_USER_ID = '22222222-2222-4222-8222-222222222222';
const TEST_PROXY_URL = 'https://proxy.example.com/ai';

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

function setupTableMocks() {
  (getTableSchema as Mock).mockResolvedValue({
    success: true,
    data: {
      columns: [
        { id: 'col1', name: 'Title', type: 'text', order: 0 },
        { id: 'col2', name: 'Priority', type: 'select', order: 1 },
      ],
    },
  });
  (getTableRows as Mock).mockResolvedValue({
    success: true,
    data: [
      { id: 'r1', cells: { col1: 'Bug fix', col2: 'High' }, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ],
  });
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  // Set env for proxy URL
  vi.stubEnv('VITE_AI_PROXY_URL', TEST_PROXY_URL);
});

describe('generateSchema', () => {
  it('generates schema from prompt and emits events', async () => {
    const aiResponse = {
      columns: [
        { id: 'c1', name: 'Task', type: 'text', order: 0 },
        { id: 'c2', name: 'Status', type: 'select', order: 1 },
      ],
      name: 'Task Tracker',
      description: 'Track your tasks',
    };
    mockFetchResponse(aiResponse);

    const result = await generateSchema(
      { prompt: 'Create a task tracker' },
      { proxyUrl: TEST_PROXY_URL },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.columns).toHaveLength(2);
      expect(result.data.name).toBe('Task Tracker');
    }

    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.AI_OPERATION_STARTED,
      expect.objectContaining({ operation: 'generate_schema' }),
    );
    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.AI_OPERATION_COMPLETED,
      expect.objectContaining({ operation: 'generate_schema', columnCount: 2 }),
    );
  });

  it('handles proxy failure', async () => {
    mockFetchResponse({}, false, 500);

    const result = await generateSchema(
      { prompt: 'anything' },
      { proxyUrl: TEST_PROXY_URL },
    );

    expect(result.success).toBe(false);
    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.AI_OPERATION_FAILED,
      expect.objectContaining({ operation: 'generate_schema' }),
    );
  });

  it('fails when proxy URL is not configured', async () => {
    const result = await generateSchema(
      { prompt: 'anything' },
      { proxyUrl: undefined as unknown as string },
    );

    // The function should check for proxyUrl being falsy
    // With undefined proxyUrl and no env, it fails
    expect(result.success).toBe(false);
  });
});

describe('autofill', () => {
  it('autofills cells and emits events', async () => {
    setupTableMocks();
    const aiResponse = {
      fills: { r1: 'Generated text' },
    };
    mockFetchResponse(aiResponse);

    const result = await autofill(
      TEST_DS_ID,
      'col1',
      TEST_USER_ID,
      undefined,
      { proxyUrl: TEST_PROXY_URL },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fills).toHaveProperty('r1');
    }
    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.AI_OPERATION_COMPLETED,
      expect.objectContaining({ operation: 'autofill' }),
    );
  });

  it('filters to specified row IDs', async () => {
    setupTableMocks();
    mockFetchResponse({
      fills: { r1: 'A', r2: 'B', r3: 'C' },
    });

    const result = await autofill(
      TEST_DS_ID,
      'col1',
      TEST_USER_ID,
      ['r1', 'r3'],
      { proxyUrl: TEST_PROXY_URL },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data.fills)).toEqual(
        expect.arrayContaining(['r1', 'r3']),
      );
      expect(result.data.fills).not.toHaveProperty('r2');
    }
  });
});

describe('suggestColumn', () => {
  it('suggests a column based on prompt', async () => {
    setupTableMocks();
    mockFetchResponse({
      column: { id: 'ai1', name: 'Summary', type: 'ai', order: 2 },
      sampleValues: { r1: 'Bug fix for high priority issue' },
    });

    const result = await suggestColumn(
      TEST_DS_ID,
      'Summarize the title',
      TEST_USER_ID,
      { proxyUrl: TEST_PROXY_URL },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.column.name).toBe('Summary');
      expect(result.data.column.type).toBe('ai');
    }
  });
});

describe('naturalLanguageQuery', () => {
  it('converts natural language to filters', async () => {
    setupTableMocks();
    mockFetchResponse({
      filters: [{ columnId: 'col2', operator: 'equals', value: 'High' }],
      sorts: [{ columnId: 'col1', direction: 'asc' }],
      explanation: 'Showing high priority items sorted by title',
    });

    const result = await naturalLanguageQuery(
      TEST_DS_ID,
      'Show high priority items',
      TEST_USER_ID,
      { proxyUrl: TEST_PROXY_URL },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filters).toHaveLength(1);
      expect(result.data.sorts).toHaveLength(1);
      expect(result.data.explanation).toContain('high priority');
    }
  });
});

describe('extractData', () => {
  it('extracts rows from pasted text', async () => {
    setupTableMocks();
    mockFetchResponse({
      rows: [
        { col1: 'Fix login bug', col2: 'High' },
        { col1: 'Update docs', col2: 'Low' },
      ],
    });

    const result = await extractData(
      TEST_DS_ID,
      'Fix login bug - High priority\nUpdate docs - Low priority',
      TEST_USER_ID,
      { proxyUrl: TEST_PROXY_URL },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows).toHaveLength(2);
    }
    expect(bus.emit).toHaveBeenCalledWith(
      DataManagerEvents.AI_OPERATION_COMPLETED,
      expect.objectContaining({ operation: 'extract_data', rowCount: 2 }),
    );
  });
});
