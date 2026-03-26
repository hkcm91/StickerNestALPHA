/**
 * ProfilePage tests
 * @vitest-environment jsdom
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

import { useAuthStore } from '../../kernel/stores/auth/auth.store';

import { ProfilePage } from './ProfilePage';

// ---------------------------------------------------------------------------
// Mocks for kernel social-graph
// ---------------------------------------------------------------------------

vi.mock('../../kernel/social-graph', () => ({
  getProfile: vi.fn(),
  getProfileByUsername: vi.fn(),
  getUserPublicCanvases: vi.fn(),
  getUserCanvases: vi.fn(),
  getSharedCanvases: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  isFollowing: vi.fn(),
  isBlocked: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  canMessage: vi.fn(),
  deriveCanvasCategory: vi.fn().mockReturnValue('public'),
}));

import {
  getProfile,
  getProfileByUsername,
  getUserPublicCanvases,
  getUserCanvases,
  getSharedCanvases,
  followUser,
  unfollowUser,
  isFollowing,
  isBlocked,
  blockUser,
  unblockUser,
  canMessage,
} from '../../kernel/social-graph';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_SESSION = { accessToken: 'tok', refreshToken: 'ref', expiresAt: Date.now() + 60000 };
const MOCK_USER = { id: 'user-1', email: 'a@b.c', displayName: 'Alice', avatarUrl: null, tier: 'free' as const };

const MOCK_PROFILE = {
  userId: 'user-2',
  displayName: 'Bob',
  username: 'bob',
  bio: 'Hello, I am Bob.',
  avatarUrl: undefined,
  bannerUrl: undefined,
  location: 'New York',
  websiteUrl: 'https://example.com',
  visibility: 'public' as const,
  followerCount: 42,
  followingCount: 10,
  postCount: 5,
  isVerified: true,
  createdAt: '2024-06-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
};

const MOCK_OWN_PROFILE = {
  ...MOCK_PROFILE,
  userId: 'user-1',
  username: 'alice',
  displayName: 'Alice',
};

const MOCK_CANVASES = {
  items: [
    {
      id: 'canvas-1',
      name: 'My Canvas',
      slug: 'my-canvas',
      description: 'A test canvas',
      thumbnailUrl: null,
      ownerId: 'user-2',
      createdAt: '2024-06-01T00:00:00Z',
      updatedAt: '2024-06-01T00:00:00Z',
    },
  ],
  hasMore: false,
};

function setAuth(user = MOCK_USER) {
  const store = useAuthStore.getState();
  store.setInitialized();
  store.setUser(user);
  store.setSession(MOCK_SESSION);
}

function renderProfile(username: string) {
  render(
    <MemoryRouter initialEntries={[`/profile/${username}`]}>
      <Routes>
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/settings" element={<div data-testid="page-settings" />} />
        <Route path="/canvas/:slug" element={<div data-testid="page-canvas" />} />
        <Route path="/" element={<div data-testid="page-dashboard" />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProfilePage', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    vi.clearAllMocks();

    // Default successful responses
    (getProfile as Mock).mockResolvedValue({ success: true, data: MOCK_PROFILE });
    (getProfileByUsername as Mock).mockResolvedValue({ success: true, data: MOCK_PROFILE });
    (getUserPublicCanvases as Mock).mockResolvedValue({ success: true, data: MOCK_CANVASES });
    (getUserCanvases as Mock).mockResolvedValue({ success: true, data: { items: [], hasMore: false } });
    (getSharedCanvases as Mock).mockResolvedValue({ success: true, data: { items: [], hasMore: false } });
    (isFollowing as Mock).mockResolvedValue(false);
    (isBlocked as Mock).mockResolvedValue(false);
    (canMessage as Mock).mockResolvedValue(true);
  });

  it('shows loading state initially', () => {
    // Stall the profile fetch so we can see loading
    (getProfileByUsername as Mock).mockReturnValue(new Promise(() => {}));
    setAuth();
    renderProfile('bob');
    expect(screen.getByTestId('profile-loading')).toBeTruthy();
  });

  it('shows error when profile is not found', async () => {
    (getProfileByUsername as Mock).mockResolvedValue({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Profile not found.' },
    });
    setAuth();
    renderProfile('nonexistent');
    await waitFor(() => {
      expect(screen.getByTestId('profile-error')).toBeTruthy();
    });
  });

  it('displays profile information', async () => {
    setAuth();
    renderProfile('bob');

    await waitFor(() => {
      expect(screen.getByTestId('page-profile')).toBeTruthy();
    });

    expect(screen.getByTestId('profile-display-name').textContent).toContain('Bob');
    expect(screen.getByTestId('profile-username').textContent).toBe('@bob');
    expect(screen.getByTestId('profile-bio').textContent).toBe('Hello, I am Bob.');
    expect(screen.getByTestId('profile-location').textContent).toBe('New York');
    expect(screen.getByTestId('profile-website')).toBeTruthy();
  });

  it('displays follower/following/post counts', async () => {
    setAuth();
    renderProfile('bob');

    await waitFor(() => {
      expect(screen.getByTestId('profile-stats')).toBeTruthy();
    });

    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('displays public canvases', async () => {
    setAuth();
    renderProfile('bob');

    await waitFor(() => {
      expect(screen.getByTestId('gallery-heading')).toBeTruthy();
    });

    expect(screen.getByText('My Canvas')).toBeTruthy();
  });

  it('shows empty state when no canvases', async () => {
    (getUserPublicCanvases as Mock).mockResolvedValue({
      success: true,
      data: { items: [], hasMore: false },
    });
    setAuth();
    renderProfile('bob');

    await waitFor(() => {
      expect(screen.getByTestId('no-canvases')).toBeTruthy();
    });
  });

  describe('social actions (viewing another user)', () => {
    it('shows follow button when not following', async () => {
      setAuth();
      renderProfile('bob');

      await waitFor(() => {
        expect(screen.getByTestId('btn-follow')).toBeTruthy();
      });
    });

    it('shows following button when already following', async () => {
      (isFollowing as Mock).mockResolvedValue(true);
      setAuth();
      renderProfile('bob');

      await waitFor(() => {
        expect(screen.getByTestId('btn-unfollow')).toBeTruthy();
      });
    });

    it('follow button calls followUser API', async () => {
      (followUser as Mock).mockResolvedValue({
        success: true,
        data: { id: 'f-1', followerId: 'user-1', followingId: 'user-2', status: 'active', createdAt: '' },
      });
      setAuth();
      renderProfile('bob');

      await waitFor(() => {
        expect(screen.getByTestId('btn-follow')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('btn-follow'));

      await waitFor(() => {
        expect(followUser).toHaveBeenCalledWith('user-2', 'user-1');
      });
    });

    it('unfollow button calls unfollowUser API', async () => {
      (isFollowing as Mock).mockResolvedValue(true);
      (unfollowUser as Mock).mockResolvedValue({ success: true, data: { id: 'f-1' } });
      setAuth();
      renderProfile('bob');

      await waitFor(() => {
        expect(screen.getByTestId('btn-unfollow')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('btn-unfollow'));

      await waitFor(() => {
        expect(unfollowUser).toHaveBeenCalledWith('user-2', 'user-1');
      });
    });

    it('shows message button when messaging is allowed', async () => {
      setAuth();
      renderProfile('bob');

      await waitFor(() => {
        expect(screen.getByTestId('btn-message')).toBeTruthy();
      });
    });

    it('hides message button when messaging is not allowed', async () => {
      (canMessage as Mock).mockResolvedValue(false);
      setAuth();
      renderProfile('bob');

      await waitFor(() => {
        expect(screen.getByTestId('btn-follow')).toBeTruthy();
      });

      expect(screen.queryByTestId('btn-message')).toBeNull();
    });

    it('shows block button', async () => {
      setAuth();
      renderProfile('bob');

      await waitFor(() => {
        expect(screen.getByTestId('btn-block')).toBeTruthy();
      });
    });

    it('block button calls blockUser API', async () => {
      (blockUser as Mock).mockResolvedValue({
        success: true,
        data: { blockerId: 'user-1', blockedId: 'user-2' },
      });
      setAuth();
      renderProfile('bob');

      await waitFor(() => {
        expect(screen.getByTestId('btn-block')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('btn-block'));

      await waitFor(() => {
        expect(blockUser).toHaveBeenCalledWith('user-2', 'user-1');
      });
    });

    it('shows unblock button when user is blocked', async () => {
      (isBlocked as Mock).mockResolvedValue(true);
      setAuth();
      renderProfile('bob');

      await waitFor(() => {
        expect(screen.getByTestId('btn-unblock')).toBeTruthy();
      });

      expect(screen.queryByTestId('btn-follow')).toBeNull();
      expect(screen.queryByTestId('btn-message')).toBeNull();
    });

    it('unblock button calls unblockUser API', async () => {
      (isBlocked as Mock).mockResolvedValue(true);
      (unblockUser as Mock).mockResolvedValue({
        success: true,
        data: { blockerId: 'user-1', blockedId: 'user-2' },
      });
      setAuth();
      renderProfile('bob');

      await waitFor(() => {
        expect(screen.getByTestId('btn-unblock')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('btn-unblock'));

      await waitFor(() => {
        expect(unblockUser).toHaveBeenCalledWith('user-2', 'user-1');
      });
    });
  });

  describe('own profile', () => {
    it('shows edit profile link instead of follow/block on own profile', async () => {
      (getProfileByUsername as Mock).mockResolvedValue({ success: true, data: MOCK_OWN_PROFILE });
      setAuth();
      renderProfile('alice');

      await waitFor(() => {
        expect(screen.getByTestId('btn-edit-profile')).toBeTruthy();
      });

      expect(screen.queryByTestId('btn-follow')).toBeNull();
      expect(screen.queryByTestId('btn-block')).toBeNull();
    });
  });

  describe('unauthenticated user', () => {
    it('shows profile without action buttons when not logged in', async () => {
      // Don't call setAuth — no user logged in
      useAuthStore.getState().setInitialized();
      renderProfile('bob');

      await waitFor(() => {
        expect(screen.getByTestId('page-profile')).toBeTruthy();
      });

      expect(screen.queryByTestId('profile-actions')).toBeNull();
      expect(screen.queryByTestId('btn-follow')).toBeNull();
    });
  });
});
