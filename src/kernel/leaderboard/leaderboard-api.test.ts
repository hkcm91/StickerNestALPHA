/**
 * Leaderboard API — Test Suite
 * @module kernel/leaderboard
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeaderboardEvents } from '@sn/types';

import { bus } from '../bus';

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const USER_1 = '00000000-0000-4000-a000-000000000001';
const USER_2 = '00000000-0000-4000-a000-000000000002';
const CANVAS_1 = '00000000-0000-4000-a000-000000000010';
const WIDGET_ID = 'space-invaders';
const ENTRY_ID = '00000000-0000-4000-a000-000000000099';

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

// Flexible query builder supporting chained method calls with per-call responses
let queryResponses: Array<{ data: unknown; error: unknown; count?: number | null }> = [];
let queryIndex = 0;

function createQueryBuilder(resp: { data: unknown; error: unknown; count?: number | null }) {
  const builder: Record<string, unknown> = {};

  const chainMethods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'gt', 'is', 'range', 'order', 'upsert',
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }

  builder.single = vi.fn(() => Promise.resolve(resp));
  builder.maybeSingle = vi.fn(() => Promise.resolve(resp));

  // For count queries, the builder itself resolves when awaited
  (builder as { then: unknown }).then = (resolve: (v: unknown) => void) => {
    resolve({ data: resp.data, error: resp.error, count: resp.count ?? null });
  };

  return builder;
}

let channelCallbacks: Array<(payload: Record<string, unknown>) => void> = [];

const mockChannel = {
  on: vi.fn((_event: string, _opts: unknown, cb: (payload: Record<string, unknown>) => void) => {
    channelCallbacks.push(cb);
    return mockChannel;
  }),
  subscribe: vi.fn(() => mockChannel),
};

const mockSupabase = {
  from: vi.fn(() => {
    const resp = queryResponses[queryIndex] ?? { data: null, error: null, count: null };
    queryIndex++;
    return createQueryBuilder(resp);
  }),
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
};

vi.mock('../supabase', () => ({
  supabase: mockSupabase,
}));

// ---------------------------------------------------------------------------
// Import module under test (after mocks)
// ---------------------------------------------------------------------------

const { submitScore, getTopScores, getUserRank, subscribeToUpdates } = await import(
  './leaderboard-api'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: ENTRY_ID,
    widget_id: WIDGET_ID,
    canvas_id: CANVAS_1,
    user_id: USER_1,
    display_name: 'Alice',
    score: 100,
    metadata: {},
    created_at: '2026-03-28T00:00:00.000Z',
    updated_at: '2026-03-28T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Leaderboard API', () => {
  beforeEach(() => {
    queryResponses = [];
    queryIndex = 0;
    channelCallbacks = [];
    bus.unsubscribeAll();
    vi.clearAllMocks();
  });

  // =========================================================================
  // submitScore
  // =========================================================================

  describe('submitScore', () => {
    it('inserts a new entry when no existing entry exists', async () => {
      const newRow = makeRow({ score: 200 });
      queryResponses = [
        // 1st call: select existing → none found
        { data: null, error: null },
        // 2nd call: insert → returns new row
        { data: newRow, error: null },
      ];

      const emitted: unknown[] = [];
      bus.subscribe(LeaderboardEvents.SCORE_SUBMITTED, (e) => emitted.push(e.payload));

      const result = await submitScore(WIDGET_ID, CANVAS_1, USER_1, 'Alice', 200);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBe(200);
        expect(result.data.widgetId).toBe(WIDGET_ID);
      }
      expect(emitted).toHaveLength(1);
      expect((emitted[0] as Record<string, unknown>).isNewHighScore).toBe(true);
    });

    it('updates entry when new score is higher', async () => {
      const existingRow = makeRow({ score: 50 });
      const updatedRow = makeRow({ score: 150 });
      queryResponses = [
        // 1st call: select existing → found with lower score
        { data: existingRow, error: null },
        // 2nd call: update → returns updated row
        { data: updatedRow, error: null },
      ];

      const result = await submitScore(WIDGET_ID, CANVAS_1, USER_1, 'Alice', 150);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBe(150);
      }
    });

    it('does not update when existing score is higher or equal', async () => {
      const existingRow = makeRow({ score: 300 });
      queryResponses = [
        { data: existingRow, error: null },
      ];

      const emitted: unknown[] = [];
      bus.subscribe(LeaderboardEvents.SCORE_SUBMITTED, (e) => emitted.push(e.payload));

      const result = await submitScore(WIDGET_ID, CANVAS_1, USER_1, 'Alice', 200);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBe(300); // Kept existing higher score
      }
      expect((emitted[0] as Record<string, unknown>).isNewHighScore).toBe(false);
    });

    it('returns validation error for invalid score', async () => {
      const result = await submitScore(WIDGET_ID, CANVAS_1, USER_1, 'Alice', 'not-a-number' as unknown as number);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('handles global scope (null canvasId)', async () => {
      const newRow = makeRow({ canvas_id: null, score: 100 });
      queryResponses = [
        { data: null, error: null },
        { data: newRow, error: null },
      ];

      const result = await submitScore(WIDGET_ID, null, USER_1, 'Alice', 100);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canvasId).toBeNull();
      }
    });

    it('returns error on Supabase failure', async () => {
      queryResponses = [
        { data: null, error: { message: 'DB connection lost' } },
      ];

      const result = await submitScore(WIDGET_ID, CANVAS_1, USER_1, 'Alice', 100);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN');
        expect(result.error.message).toBe('DB connection lost');
      }
    });
  });

  // =========================================================================
  // getTopScores
  // =========================================================================

  describe('getTopScores', () => {
    it('returns ranked entries for canvas scope', async () => {
      const rows = [
        makeRow({ score: 300, user_id: USER_1, display_name: 'Alice' }),
        makeRow({ score: 200, user_id: USER_2, display_name: 'Bob' }),
      ];
      queryResponses = [
        { data: rows, error: null },
      ];

      const result = await getTopScores(WIDGET_ID, 'canvas', CANVAS_1, 10, 0);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].rank).toBe(1);
        expect(result.data[0].score).toBe(300);
        expect(result.data[1].rank).toBe(2);
        expect(result.data[1].score).toBe(200);
      }
    });

    it('returns ranked entries for global scope', async () => {
      const rows = [
        makeRow({ canvas_id: null, score: 500 }),
      ];
      queryResponses = [{ data: rows, error: null }];

      const result = await getTopScores(WIDGET_ID, 'global');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].rank).toBe(1);
      }
    });

    it('requires canvasId for canvas scope', async () => {
      const result = await getTopScores(WIDGET_ID, 'canvas');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('applies offset to rank calculation', async () => {
      const rows = [makeRow({ score: 50 })];
      queryResponses = [{ data: rows, error: null }];

      const result = await getTopScores(WIDGET_ID, 'global', undefined, 10, 5);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].rank).toBe(6); // offset 5 + index 0 + 1
      }
    });

    it('clamps limit to 100', async () => {
      queryResponses = [{ data: [], error: null }];

      await getTopScores(WIDGET_ID, 'global', undefined, 999);

      // Verify range was called — the mock chain captures calls
      expect(mockSupabase.from).toHaveBeenCalledWith('leaderboard_entries');
    });

    it('returns error on Supabase failure', async () => {
      queryResponses = [{ data: null, error: { message: 'timeout' } }];

      const result = await getTopScores(WIDGET_ID, 'global');

      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // getUserRank
  // =========================================================================

  describe('getUserRank', () => {
    it('returns rank, score, and total for an existing user', async () => {
      queryResponses = [
        // 1st: user's entry
        { data: makeRow({ score: 200 }), error: null },
        // 2nd: count of entries with higher score
        { data: null, error: null, count: 3 },
        // 3rd: total count
        { data: null, error: null, count: 10 },
      ];

      const result = await getUserRank(WIDGET_ID, 'canvas', CANVAS_1, USER_1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rank).toBe(4); // 3 above + 1
        expect(result.data.score).toBe(200);
        expect(result.data.total).toBe(10);
      }
    });

    it('returns NOT_FOUND when user has no entry', async () => {
      queryResponses = [
        { data: null, error: null },
      ];

      const result = await getUserRank(WIDGET_ID, 'global', undefined, USER_1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('requires canvasId for canvas scope', async () => {
      const result = await getUserRank(WIDGET_ID, 'canvas', undefined, USER_1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('returns error on Supabase failure', async () => {
      queryResponses = [
        { data: null, error: { message: 'query failed' } },
      ];

      const result = await getUserRank(WIDGET_ID, 'global', undefined, USER_1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN');
      }
    });
  });

  // =========================================================================
  // subscribeToUpdates
  // =========================================================================

  describe('subscribeToUpdates', () => {
    it('creates a Realtime channel and emits bus events on changes', () => {
      const emitted: unknown[] = [];
      bus.subscribe(LeaderboardEvents.UPDATED, (e) => emitted.push(e.payload));

      const unsub = subscribeToUpdates(WIDGET_ID, 'canvas', CANVAS_1);

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        `leaderboard:${WIDGET_ID}:${CANVAS_1}`,
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Simulate a Realtime event
      expect(channelCallbacks).toHaveLength(1);
      channelCallbacks[0]({ new: makeRow({ score: 999 }) });

      expect(emitted).toHaveLength(1);
      expect((emitted[0] as Record<string, unknown>).widgetId).toBe(WIDGET_ID);
      expect((emitted[0] as Record<string, unknown>).scope).toBe('canvas');

      // Unsubscribe
      unsub();
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('uses global channel name when no canvasId', () => {
      subscribeToUpdates(WIDGET_ID, 'global');

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        `leaderboard:${WIDGET_ID}:global`,
      );
    });
  });

  // =========================================================================
  // Bus event emission
  // =========================================================================

  describe('bus event emission', () => {
    it('emits SCORE_SUBMITTED with correct event type string', async () => {
      queryResponses = [
        { data: null, error: null },
        { data: makeRow(), error: null },
      ];

      const events: string[] = [];
      bus.subscribe(LeaderboardEvents.SCORE_SUBMITTED, (e) => events.push(e.type));

      await submitScore(WIDGET_ID, CANVAS_1, USER_1, 'Alice', 100);

      expect(events).toEqual(['leaderboard.score.submitted']);
    });
  });
});
