import { describe, it } from 'vitest';

describe('PresenceManager', () => {
  // AC2: Presence Tracking
  it.todo('tracks join event and updates socialStore via bus event');
  it.todo('tracks leave event and removes from socialStore via bus event');
  it.todo('Guests appear with label "Guest" and random color');
  it.todo('removes user from presence map promptly on disconnect');
  it.todo('includes userId, displayName, color, cursorPosition, joinedAt');
  it.todo('handles multiple users joining the same canvas');
  it.todo('emits social.presence.joined on join');
  it.todo('emits social.presence.left on leave');
});

describe('generateGuestColor', () => {
  it.todo('returns a valid hex color string');
  it.todo('returns different colors on successive calls');
});
