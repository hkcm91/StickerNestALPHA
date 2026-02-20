import { describe, it } from 'vitest';

describe('EntitySyncManager', () => {
  // AC4: Entity Transform Broadcast
  it.todo('broadcasts entity position optimistically during drag');
  it.todo('performs LWW reconciliation on drop');
  it.todo('emits social.entity.transformed bus event after reconciliation');
  it.todo('includes position, rotation, scale in transform data');
  it.todo('uses server timestamp for LWW comparison');
  it.todo('both clients converge to same position after concurrent moves');
  it.todo('handles rapid successive transforms without dropping');
  it.todo('destroy() cleans up all subscriptions');
});
