/**
 * Synonym Table Tests
 *
 * @module kernel/pipeline
 * @layer L0
 */

import { describe, expect, it } from 'vitest';

import {
  SYNONYM_GROUPS,
  getSynonymIndex,
  areSynonyms,
} from './synonym-table';

describe('SYNONYM_GROUPS', () => {
  it('contains at least 20 synonym groups', () => {
    expect(SYNONYM_GROUPS.length).toBeGreaterThanOrEqual(20);
  });

  it('each group has at least 2 entries', () => {
    for (const group of SYNONYM_GROUPS) {
      expect(group.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('all entries are lowercase strings', () => {
    for (const group of SYNONYM_GROUPS) {
      for (const term of group) {
        expect(term).toBe(term.toLowerCase());
        expect(typeof term).toBe('string');
      }
    }
  });

  it('contains expected lifecycle synonyms', () => {
    const flat = SYNONYM_GROUPS.flat();
    expect(flat).toContain('changed');
    expect(flat).toContain('updated');
    expect(flat).toContain('created');
    expect(flat).toContain('deleted');
  });

  it('contains expected action synonyms', () => {
    const flat = SYNONYM_GROUPS.flat();
    expect(flat).toContain('click');
    expect(flat).toContain('press');
    expect(flat).toContain('submit');
    expect(flat).toContain('send');
  });
});

describe('getSynonymIndex', () => {
  it('returns a Map', () => {
    const index = getSynonymIndex();
    expect(index).toBeInstanceOf(Map);
  });

  it('maps every term in every group', () => {
    const index = getSynonymIndex();
    for (const group of SYNONYM_GROUPS) {
      for (const term of group) {
        expect(index.has(term)).toBe(true);
      }
    }
  });

  it('returns the same group index for synonyms', () => {
    const index = getSynonymIndex();
    // 'changed' and 'updated' are in the same group
    expect(index.get('changed')).toBe(index.get('updated'));
    expect(index.get('changed')).toBe(index.get('modified'));
  });

  it('returns different group indexes for non-synonyms', () => {
    const index = getSynonymIndex();
    expect(index.get('changed')).not.toBe(index.get('created'));
  });

  it('returns the same instance on subsequent calls (cached)', () => {
    const index1 = getSynonymIndex();
    const index2 = getSynonymIndex();
    expect(index1).toBe(index2);
  });
});

describe('areSynonyms', () => {
  it('returns true for identical tokens', () => {
    expect(areSynonyms('hello', 'hello')).toBe(true);
  });

  it('returns true for tokens in the same synonym group', () => {
    expect(areSynonyms('changed', 'updated')).toBe(true);
    expect(areSynonyms('changed', 'modified')).toBe(true);
    expect(areSynonyms('created', 'added')).toBe(true);
    expect(areSynonyms('deleted', 'removed')).toBe(true);
  });

  it('returns false for tokens in different synonym groups', () => {
    expect(areSynonyms('changed', 'created')).toBe(false);
    expect(areSynonyms('click', 'save')).toBe(false);
  });

  it('returns false for unknown tokens', () => {
    expect(areSynonyms('xyzzy', 'plugh')).toBe(false);
  });

  it('returns false when only one token is in a group', () => {
    expect(areSynonyms('changed', 'xyzzy')).toBe(false);
    expect(areSynonyms('xyzzy', 'changed')).toBe(false);
  });

  it('handles domain synonyms correctly', () => {
    expect(areSynonyms('color', 'colour')).toBe(true);
    expect(areSynonyms('position', 'location')).toBe(true);
    expect(areSynonyms('image', 'photo')).toBe(true);
  });

  it('handles state synonyms correctly', () => {
    expect(areSynonyms('enabled', 'active')).toBe(true);
    expect(areSynonyms('disabled', 'inactive')).toBe(true);
    expect(areSynonyms('visible', 'shown')).toBe(true);
    expect(areSynonyms('hidden', 'collapsed')).toBe(true);
  });
});
