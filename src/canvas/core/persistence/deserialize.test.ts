/**
 * Canvas Deserialization — Tests
 *
 * @module canvas/core/persistence
 * @layer L4A-1
 */

import { describe, it, expect } from 'vitest';

import { deserialize, looksLikeCanvasDocument, peekEntityCount, peekVersion } from './deserialize';
import { createEmptyDocument } from './serialize';
import { CURRENT_VERSION } from './version';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('deserialize', () => {
  it('deserializes a valid empty document', () => {
    const doc = createEmptyDocument('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Test Canvas');
    const result = deserialize(doc);

    expect(result.success).toBe(true);
    expect(result.document).toBeDefined();
    expect(result.document!.meta.name).toBe('Test Canvas');
    expect(result.wasMigrated).toBe(false);
  });

  it('deserializes from JSON string', () => {
    const doc = createEmptyDocument('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'JSON Test');
    const json = JSON.stringify(doc);
    const result = deserialize(json);

    expect(result.success).toBe(true);
    expect(result.document!.meta.id).toBe('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
  });

  it('fails on invalid JSON string', () => {
    const result = deserialize('not-valid-json{{{');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('fails on unsupported version', () => {
    const doc = createEmptyDocument('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Test');
    (doc as Record<string, unknown>).version = 999;
    const result = deserialize(doc);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not supported');
  });

  it('round-trips a document', () => {
    const original = createEmptyDocument('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Round Trip', {
      layoutMode: 'bento',
    });

    const result = deserialize(JSON.stringify(original));

    expect(result.success).toBe(true);
    expect(result.document!.meta.name).toBe('Round Trip');
    expect(result.document!.layoutMode).toBe('bento');
    expect(result.document!.entities).toEqual([]);
  });
});

describe('looksLikeCanvasDocument', () => {
  it('returns true for valid structure', () => {
    const doc = createEmptyDocument('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Test');
    expect(looksLikeCanvasDocument(doc)).toBe(true);
  });

  it('returns true for JSON string', () => {
    const doc = createEmptyDocument('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Test');
    expect(looksLikeCanvasDocument(JSON.stringify(doc))).toBe(true);
  });

  it('returns false for null', () => {
    expect(looksLikeCanvasDocument(null)).toBe(false);
  });

  it('returns false for non-JSON string', () => {
    expect(looksLikeCanvasDocument('hello')).toBe(false);
  });

  it('returns false for object without version', () => {
    expect(looksLikeCanvasDocument({ meta: {}, entities: [] })).toBe(false);
  });

  it('returns false for object without entities', () => {
    expect(looksLikeCanvasDocument({ version: 1, meta: {} })).toBe(false);
  });
});

describe('peekEntityCount', () => {
  it('returns entity count', () => {
    const doc = createEmptyDocument('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Test');
    expect(peekEntityCount(doc)).toBe(0);
  });

  it('returns null for invalid input', () => {
    expect(peekEntityCount('not json')).toBeNull();
  });
});

describe('peekVersion', () => {
  it('returns version number', () => {
    const doc = createEmptyDocument('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Test');
    expect(peekVersion(doc)).toBe(CURRENT_VERSION);
  });

  it('returns version from JSON string', () => {
    const doc = createEmptyDocument('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Test');
    expect(peekVersion(JSON.stringify(doc))).toBe(CURRENT_VERSION);
  });

  it('returns null for invalid input', () => {
    expect(peekVersion(null)).toBeNull();
    expect(peekVersion('bad')).toBeNull();
    expect(peekVersion({ noVersion: true })).toBeNull();
  });
});
