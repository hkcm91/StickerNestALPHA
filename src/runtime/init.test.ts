import { describe, it } from 'vitest';

describe('initRuntime', () => {
  it.todo('warms up iframe pool');
  it.todo('registers built-in widgets');
  it.todo('sets up bus subscriptions for widget events');
  it.todo('is idempotent — safe to call multiple times');
});

describe('teardownRuntime', () => {
  it.todo('destroys iframe pool');
  it.todo('unregisters all widgets');
  it.todo('cleans up bus subscriptions');
});

describe('isRuntimeInitialized', () => {
  it.todo('returns false before init');
  it.todo('returns true after init');
  it.todo('returns false after teardown');
});
