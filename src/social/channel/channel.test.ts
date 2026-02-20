import { describe, it } from 'vitest';

describe('CanvasChannel', () => {
  // AC1: Channel Management
  it.todo('creates a channel with naming convention canvas:{canvasId}');
  it.todo('returns the same channel for the same canvasId (no duplicates)');
  it.todo('destroys channel on leave');
  it.todo('one channel per canvas — rejects per-user or per-widget channels');
  it.todo('handles channel creation failure gracefully');
  it.todo('reconnects channel after network interruption');
  it.todo('isConnected() returns correct status');
  it.todo('broadcast sends message to all other users');
  it.todo('onBroadcast receives messages from other users');
});
