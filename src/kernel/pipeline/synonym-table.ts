/**
 * Synonym Table — curated synonym groups for semantic port matching.
 *
 * Each group contains words that are semantically equivalent in the context
 * of widget event names. Used by the port matcher to score fuzzy matches.
 *
 * @module kernel/pipeline
 * @layer L0
 */

/** A group of synonymous terms */
export type SynonymGroup = readonly string[];

/**
 * Curated synonym groups for common event/data patterns.
 *
 * Each array is a group of interchangeable terms. If two tokens belong
 * to the same group, they are considered synonymous (score boost).
 */
export const SYNONYM_GROUPS: readonly SynonymGroup[] = [
  // Lifecycle
  ['changed', 'updated', 'modified', 'mutated'],
  ['created', 'added', 'new', 'inserted'],
  ['deleted', 'removed', 'cleared', 'destroyed'],
  ['ready', 'initialized', 'loaded', 'mounted'],
  ['completed', 'finished', 'done'],
  ['started', 'begun', 'launched', 'opened'],
  ['stopped', 'ended', 'closed', 'terminated'],

  // Data
  ['value', 'data', 'result', 'output', 'payload'],
  ['input', 'source', 'origin'],
  ['count', 'total', 'number', 'amount', 'quantity'],
  ['item', 'entry', 'element', 'record', 'row'],
  ['list', 'array', 'collection', 'items', 'entries'],
  ['text', 'string', 'content', 'message', 'label'],
  ['name', 'title', 'heading'],
  ['id', 'identifier', 'key', 'uid'],

  // Actions
  ['click', 'press', 'tap', 'activate', 'trigger'],
  ['select', 'pick', 'choose', 'highlight'],
  ['submit', 'send', 'post', 'publish'],
  ['cancel', 'abort', 'dismiss', 'close'],
  ['save', 'store', 'persist', 'write'],
  ['load', 'fetch', 'read', 'get', 'retrieve'],
  ['move', 'drag', 'reposition', 'relocate'],
  ['resize', 'scale', 'expand', 'shrink'],

  // State
  ['enabled', 'active', 'on'],
  ['disabled', 'inactive', 'off'],
  ['visible', 'shown', 'displayed'],
  ['hidden', 'concealed', 'collapsed'],
  ['error', 'failure', 'fault', 'exception'],
  ['success', 'ok', 'pass'],

  // Domain
  ['color', 'colour', 'hue', 'tint'],
  ['position', 'location', 'coords', 'point'],
  ['size', 'dimensions', 'extent'],
  ['image', 'picture', 'photo', 'thumbnail'],
] as const;

/**
 * Pre-built lookup: token → group index.
 * Lazily initialized on first call to `getSynonymGroupIndex`.
 */
let synonymIndex: Map<string, number> | null = null;

/**
 * Returns the synonym lookup map (token → group index).
 * Built once, cached for the lifetime of the process.
 */
export function getSynonymIndex(): Map<string, number> {
  if (synonymIndex) return synonymIndex;

  synonymIndex = new Map<string, number>();
  for (let i = 0; i < SYNONYM_GROUPS.length; i++) {
    for (const term of SYNONYM_GROUPS[i]) {
      synonymIndex.set(term, i);
    }
  }
  return synonymIndex;
}

/**
 * Checks whether two tokens are synonyms.
 */
export function areSynonyms(a: string, b: string): boolean {
  if (a === b) return true;
  const index = getSynonymIndex();
  const groupA = index.get(a);
  const groupB = index.get(b);
  return groupA !== undefined && groupA === groupB;
}
