/**
 * usePersistence — unit tests
 *
 * Tests the pure utility functions exported from usePersistence
 * (slugification, local canvas CRUD, storage key generation).
 * The hook itself is integration-heavy (localStorage + sceneGraph + bus),
 * so we focus on the exported pure functions and basic hook behavior.
 *
 * @module shell/canvas/hooks
 * @layer L6
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  getStorageKey,
  slugifyCanvasName,
  createLocalCanvas,
  listLocalCanvases,
  getLocalCanvasBySlug,
  renameLocalCanvas,
  deleteLocalCanvas,
  duplicateLocalCanvas,
  ensureLocalCanvas,
  readStoredDocument,
} from './usePersistence';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests: getStorageKey
// ---------------------------------------------------------------------------

describe('getStorageKey', () => {
  it('prefixes the slug with sn:canvas:', () => {
    expect(getStorageKey('my-canvas')).toBe('sn:canvas:my-canvas');
  });

  it('handles empty string', () => {
    expect(getStorageKey('')).toBe('sn:canvas:');
  });
});

// ---------------------------------------------------------------------------
// Tests: slugifyCanvasName
// ---------------------------------------------------------------------------

describe('slugifyCanvasName', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugifyCanvasName('My Cool Canvas')).toBe('my-cool-canvas');
  });

  it('removes special characters', () => {
    expect(slugifyCanvasName('Hello! @World #2026')).toBe('hello-world-2026');
  });

  it('returns "canvas" for empty/whitespace input', () => {
    expect(slugifyCanvasName('')).toBe('canvas');
    expect(slugifyCanvasName('   ')).toBe('canvas');
  });

  it('collapses multiple hyphens', () => {
    expect(slugifyCanvasName('a---b')).toBe('a-b');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugifyCanvasName('---hello---')).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// Tests: createLocalCanvas / listLocalCanvases / getLocalCanvasBySlug
// ---------------------------------------------------------------------------

describe('createLocalCanvas', () => {
  it('creates a canvas with a unique slug and returns a summary', () => {
    const summary = createLocalCanvas({ name: 'Test Canvas' });
    expect(summary.name).toBe('Test Canvas');
    expect(summary.slug).toBe('test-canvas');
    expect(summary.id).toBeDefined();
    expect(summary.createdAt).toBeDefined();
  });

  it('generates unique slugs for duplicate names', () => {
    const a = createLocalCanvas({ name: 'Dup' });
    const b = createLocalCanvas({ name: 'Dup' });
    expect(a.slug).toBe('dup');
    expect(b.slug).toBe('dup-2');
  });

  it('defaults name to "Untitled canvas"', () => {
    const summary = createLocalCanvas();
    expect(summary.name).toBe('Untitled canvas');
  });
});

describe('listLocalCanvases', () => {
  it('lists canvases sorted by updatedAt descending', () => {
    createLocalCanvas({ name: 'First' });
    createLocalCanvas({ name: 'Second' });
    const list = listLocalCanvases();
    expect(list.length).toBe(2);
    // Second was created later so has a later updatedAt
    expect(list[0].name).toBe('Second');
  });
});

describe('getLocalCanvasBySlug', () => {
  it('returns the canvas matching the slug', () => {
    createLocalCanvas({ name: 'Find Me' });
    const found = getLocalCanvasBySlug('find-me');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Find Me');
  });

  it('returns null for non-existent slug', () => {
    expect(getLocalCanvasBySlug('nope')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: renameLocalCanvas
// ---------------------------------------------------------------------------

describe('renameLocalCanvas', () => {
  it('renames the canvas and updates the index', () => {
    createLocalCanvas({ name: 'Old Name' });
    const updated = renameLocalCanvas('old-name', 'New Name');
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('New Name');
    // Index should reflect the change
    const found = getLocalCanvasBySlug('old-name');
    expect(found!.name).toBe('New Name');
  });

  it('returns null for non-existent slug', () => {
    expect(renameLocalCanvas('no-exist', 'Whatever')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: deleteLocalCanvas
// ---------------------------------------------------------------------------

describe('deleteLocalCanvas', () => {
  it('removes the canvas from the index and storage', () => {
    const summary = createLocalCanvas({ name: 'To Delete' });
    localStorage.setItem(getStorageKey(summary.slug), JSON.stringify({ test: true }));
    deleteLocalCanvas(summary.slug);
    expect(getLocalCanvasBySlug(summary.slug)).toBeNull();
    expect(localStorage.getItem(getStorageKey(summary.slug))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: duplicateLocalCanvas
// ---------------------------------------------------------------------------

describe('duplicateLocalCanvas', () => {
  it('duplicates a canvas with a -copy suffix slug', () => {
    const original = createLocalCanvas({ name: 'Original' });
    localStorage.setItem(
      getStorageKey(original.slug),
      JSON.stringify({ meta: { id: original.id, name: original.name, createdAt: original.createdAt, updatedAt: original.updatedAt }, entities: [] }),
    );

    const copy = duplicateLocalCanvas(original.slug);
    expect(copy).not.toBeNull();
    expect(copy!.slug).toBe('original-copy');
    expect(copy!.name).toBe('Original (copy)');
    expect(copy!.id).not.toBe(original.id);
  });

  it('returns null for non-existent slug', () => {
    expect(duplicateLocalCanvas('nope')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: ensureLocalCanvas
// ---------------------------------------------------------------------------

describe('ensureLocalCanvas', () => {
  it('returns existing canvas if slug exists', () => {
    const original = createLocalCanvas({ name: 'Existing', slug: 'existing' });
    const result = ensureLocalCanvas({ slug: 'existing' });
    expect(result.id).toBe(original.id);
  });

  it('creates a new canvas if slug does not exist', () => {
    const result = ensureLocalCanvas({ slug: 'brand-new', fallbackName: 'Brand New' });
    expect(result.name).toBe('Brand New');
    expect(result.slug).toBe('brand-new');
  });
});

// ---------------------------------------------------------------------------
// Tests: readStoredDocument
// ---------------------------------------------------------------------------

describe('readStoredDocument', () => {
  it('returns null when no data stored', () => {
    expect(readStoredDocument('empty')).toBeNull();
  });

  it('parses stored JSON', () => {
    const doc = { meta: { id: '1' }, entities: [] };
    localStorage.setItem(getStorageKey('test'), JSON.stringify(doc));
    const result = readStoredDocument('test');
    expect(result).toEqual(doc);
  });

  it('returns null for invalid JSON', () => {
    localStorage.setItem(getStorageKey('bad'), 'not-json{');
    expect(readStoredDocument('bad')).toBeNull();
  });
});
