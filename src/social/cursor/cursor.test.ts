import { describe, it } from 'vitest';

describe('CursorBroadcaster', () => {
  // AC3: Cursor Broadcast
  it.todo('broadcasts cursor position to other users via channel');
  it.todo('throttles outbound broadcasts to 30fps (33ms window)');
  it.todo('does not send on every call if within throttle window');
  it.todo('incoming cursor positions emit social.cursor.moved bus event');
  it.todo('cursor data includes userId, position (canvas-space), and color');
  it.todo('cursor removal on user disconnect/leave');
  it.todo('stop() ceases all broadcasting and cleans up');
  it.todo('cursors visible for ALL user types including Guests');
});
