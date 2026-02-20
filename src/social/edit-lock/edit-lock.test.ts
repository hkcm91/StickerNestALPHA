import { describe, it } from 'vitest';

describe('EditLockManager', () => {
  // AC8: Edit Locks
  it.todo('acquires lock on entity optimistically');
  it.todo('broadcasts lock acquisition to channel');
  it.todo('lock expires after 30 seconds of inactivity');
  it.todo('other users see non-blocking indicator on locked entity');
  it.todo('lock is released on drop');
  it.todo('lock is released on leaving the canvas');
  it.todo('lock is released on timeout');
  it.todo('does NOT hard-block writes — lock is advisory only');
  it.todo('getLock returns null for unlocked entity');
  it.todo('getAllLocks returns all active locks');
  it.todo('destroy cleans up timers and subscriptions');
});
