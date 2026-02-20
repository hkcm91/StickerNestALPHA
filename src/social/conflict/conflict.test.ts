import { describe, it } from 'vitest';

describe('getStrategyForType', () => {
  // AC5, AC6, AC7: Conflict Resolution
  it.todo('returns lww-silent for canvas entities');
  it.todo('returns yjs-crdt for Doc DataSources');
  it.todo('returns revision-based for Table DataSources');
  it.todo('returns revision-based for Custom DataSources');
  it.todo('returns lww-no-indicator for Note DataSources');
  it.todo('returns lww-silent for Folder DataSources');
  it.todo('returns lww-silent for File DataSources');
});

describe('LWW Conflict Resolution', () => {
  // AC5: LWW
  it.todo('most recent write wins silently — no toast, no UI');
  it.todo('applies server timestamp for comparison');
  it.todo('both clients converge after concurrent writes');
});

describe('Revision-based Conflict Resolution', () => {
  // AC7: Revision-based
  it.todo('sends lastSeenRevision with every write');
  it.todo('rejects write with 409 when revision has advanced');
  it.todo('client re-fetches row on 409');
  it.todo('shows non-intrusive toast: "Row changed - refreshed"');
  it.todo('no modal or blocking UI on conflict');
  it.todo('falls back to LWW if clock skew prevents comparison');
  it.todo('emits social.conflict.rejected bus event on 409');
});
