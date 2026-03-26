/**
 * PresenceCursorsLayer component tests.
 *
 * @module shell/canvas/components
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let mockPresenceMap: Record<string, any> = {};

vi.mock('../../../kernel/stores/social/social.store', () => ({
  useSocialStore: vi.fn((selector) => {
    const state = { presenceMap: mockPresenceMap };
    return selector(state);
  }),
}));

import { PresenceCursorsLayer } from './PresenceCursorsLayer';

describe('PresenceCursorsLayer', () => {
  it('renders nothing when no remote cursors are present', () => {
    mockPresenceMap = {};
    const { container } = render(<PresenceCursorsLayer />);
    expect(screen.queryByTestId('presence-cursors-layer')).toBeNull();
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing for local user cursor only', () => {
    mockPresenceMap = {
      local: {
        userId: 'local',
        displayName: 'Me',
        color: '#ff0000',
        cursorPosition: { x: 50, y: 50 },
        joinedAt: new Date().toISOString(),
      },
    };
    const { container } = render(<PresenceCursorsLayer />);
    expect(screen.queryByTestId('presence-cursors-layer')).toBeNull();
  });

  it('renders cursors for remote users with cursor positions', () => {
    mockPresenceMap = {
      'user-1': {
        userId: 'user-1',
        displayName: 'Alice',
        color: '#3366ff',
        cursorPosition: { x: 200, y: 300 },
        joinedAt: new Date().toISOString(),
      },
      'user-2': {
        userId: 'user-2',
        displayName: 'Bob',
        color: '#ff6633',
        cursorPosition: { x: 400, y: 500 },
        joinedAt: new Date().toISOString(),
      },
    };
    render(<PresenceCursorsLayer />);
    expect(screen.getByTestId('presence-cursors-layer')).toBeTruthy();
    // Should render both user names
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('filters out users without cursor positions', () => {
    mockPresenceMap = {
      'user-1': {
        userId: 'user-1',
        displayName: 'Alice',
        color: '#3366ff',
        cursorPosition: { x: 100, y: 100 },
        joinedAt: new Date().toISOString(),
      },
      'user-2': {
        userId: 'user-2',
        displayName: 'Bob',
        color: '#ff6633',
        cursorPosition: null,
        joinedAt: new Date().toISOString(),
      },
    };
    render(<PresenceCursorsLayer />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.queryByText('Bob')).toBeNull();
  });
});
