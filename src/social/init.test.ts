import { describe, it } from 'vitest';

describe('initSocial', () => {
  it.todo('creates canvas channel on init');
  it.todo('sets up presence manager');
  it.todo('sets up cursor broadcaster');
  it.todo('sets up entity sync manager');
  it.todo('sets up conflict resolution');
  it.todo('is idempotent — safe to call multiple times');
});

describe('teardownSocial', () => {
  it.todo('destroys all managers');
  it.todo('leaves the canvas channel');
  it.todo('cleans up all bus subscriptions');
});

describe('isSocialInitialized', () => {
  it.todo('returns false before init');
  it.todo('returns true after init');
  it.todo('returns false after teardown');
});
