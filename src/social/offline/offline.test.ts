import { describe, it } from 'vitest';

describe('OfflineManager', () => {
  // AC9: Offline Degradation
  it.todo('hides all remote cursors on disconnect');
  it.todo('continues accepting local edits while offline');
  it.todo('does not show error for interruptions under 5 seconds');
  it.todo('on reconnect: re-joins channel');
  it.todo('on reconnect: re-broadcasts presence');
  it.todo('on reconnect: replays queued edits with conflict resolution');
  it.todo('Yjs Doc edits handled natively — no separate queue');
  it.todo('Table/Custom offline edits queued and retried with revision check');
  it.todo('isOffline() returns correct status');
  it.todo('destroy() cleans up listeners and timers');
});
