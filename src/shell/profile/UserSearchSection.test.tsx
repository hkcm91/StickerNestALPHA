/**
 * UserSearchSection tests
 * @module shell/profile
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../kernel/social-graph', () => ({
  searchProfiles: vi.fn(),
  getFollowing: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  isFollowing: vi.fn(),
}));

vi.mock('../../kernel/stores/auth/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

import {
  searchProfiles,
  getFollowing,
  followUser,
  unfollowUser,
  isFollowing,
} from '../../kernel/social-graph';
import { useAuthStore } from '../../kernel/stores/auth/auth.store';

import { UserSearchSection } from './UserSearchSection';

const mockSearchProfiles = searchProfiles as ReturnType<typeof vi.fn>;
const mockGetFollowing = getFollowing as ReturnType<typeof vi.fn>;
const mockFollowUser = followUser as ReturnType<typeof vi.fn>;
const mockUnfollowUser = unfollowUser as ReturnType<typeof vi.fn>;
const mockIsFollowing = isFollowing as ReturnType<typeof vi.fn>;
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

const CURRENT_USER = { id: 'me-123' };

const MOCK_USERS = [
  {
    userId: 'user-1',
    username: 'alice',
    displayName: 'Alice Wonderland',
    bio: 'Loves stickers',
    avatarUrl: null,
    bannerUrl: undefined,
    location: undefined,
    websiteUrl: undefined,
    visibility: 'public' as const,
    followerCount: 100,
    followingCount: 50,
    postCount: 10,
    isVerified: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    userId: 'user-2',
    username: 'bob',
    displayName: 'Bob Builder',
    bio: 'Canvas creator',
    avatarUrl: 'https://example.com/bob.jpg',
    bannerUrl: undefined,
    location: undefined,
    websiteUrl: undefined,
    visibility: 'public' as const,
    followerCount: 50,
    followingCount: 30,
    postCount: 5,
    isVerified: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

function renderSection() {
  return render(
    <MemoryRouter>
      <UserSearchSection />
    </MemoryRouter>,
  );
}

describe('UserSearchSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockUseAuthStore.mockImplementation((selector: (s: { user: typeof CURRENT_USER }) => unknown) =>
      selector({ user: CURRENT_USER }),
    );

    mockGetFollowing.mockResolvedValue({
      success: true,
      data: { items: [MOCK_USERS[0]] },
    });

    mockSearchProfiles.mockResolvedValue({
      success: true,
      data: MOCK_USERS,
    });

    mockIsFollowing.mockResolvedValue(false);
    mockFollowUser.mockResolvedValue({ success: true, data: { id: 'f-1' } });
    mockUnfollowUser.mockResolvedValue({ success: true, data: { id: 'f-1' } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input and tabs', async () => {
    renderSection();
    await waitFor(() => {
      expect(screen.getByTestId('user-search-section')).toBeTruthy();
    });
    expect(screen.getByTestId('user-search-input')).toBeTruthy();
    expect(screen.getByTestId('tab-all-users')).toBeTruthy();
    expect(screen.getByTestId('tab-following')).toBeTruthy();
  });

  it('shows empty state when no query entered', async () => {
    renderSection();
    await waitFor(() => {
      expect(screen.getByTestId('user-search-empty')).toBeTruthy();
    });
    expect(screen.getByText('Search for users by name, username, or bio')).toBeTruthy();
  });

  it('debounces search and calls searchProfiles', async () => {
    renderSection();

    await act(async () => {
      fireEvent.change(screen.getByTestId('user-search-input'), {
        target: { value: 'alice' },
      });
    });

    // Should not have called yet (debounce)
    expect(mockSearchProfiles).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(mockSearchProfiles).toHaveBeenCalledWith('alice', 20);
    });
  });

  it('displays search results with follow buttons', async () => {
    renderSection();

    await act(async () => {
      fireEvent.change(screen.getByTestId('user-search-input'), {
        target: { value: 'alice' },
      });
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-row-alice')).toBeTruthy();
      expect(screen.getByTestId('user-row-bob')).toBeTruthy();
    });

    expect(screen.getByText('Alice Wonderland')).toBeTruthy();
    expect(screen.getByText('@alice')).toBeTruthy();
    expect(screen.getByTestId('btn-follow-alice')).toBeTruthy();
    expect(screen.getByTestId('btn-follow-bob')).toBeTruthy();
  });

  it('shows no results state for unmatched query', async () => {
    mockSearchProfiles.mockResolvedValue({ success: true, data: [] });

    renderSection();

    await act(async () => {
      fireEvent.change(screen.getByTestId('user-search-input'), {
        target: { value: 'zzzznotfound' },
      });
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-search-no-results')).toBeTruthy();
    });
    expect(screen.getByText('No results found')).toBeTruthy();
  });

  it('following tab filters followed users by query', async () => {
    renderSection();

    // Wait for following list to load
    await waitFor(() => {
      expect(mockGetFollowing).toHaveBeenCalled();
    });

    // Switch to Following tab
    await act(async () => {
      fireEvent.click(screen.getByTestId('tab-following'));
    });

    // Should show all following when no query
    await waitFor(() => {
      expect(screen.getByTestId('user-row-alice')).toBeTruthy();
    });

    // Type a filter query
    await act(async () => {
      fireEvent.change(screen.getByTestId('user-search-input'), {
        target: { value: 'alice' },
      });
    });

    // Alice should still show (matches), but no debounce needed for client-side filter
    await waitFor(() => {
      expect(screen.getByTestId('user-row-alice')).toBeTruthy();
    });
  });

  it('follow button calls followUser and toggles to Following', async () => {
    // All users start as not followed
    mockIsFollowing.mockResolvedValue(false);

    renderSection();

    await act(async () => {
      fireEvent.change(screen.getByTestId('user-search-input'), {
        target: { value: 'bob' },
      });
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByTestId('btn-follow-bob')).toBeTruthy();
    });

    // Click follow
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-follow-bob'));
    });

    expect(mockFollowUser).toHaveBeenCalledWith('user-2', 'me-123');

    // Button should now show "Following" (optimistic)
    await waitFor(() => {
      expect(screen.getByTestId('btn-follow-bob').textContent).toBe('Following');
    });
  });

  it('unfollow button calls unfollowUser and toggles to Follow', async () => {
    // Alice is already followed (she's in the following list)
    mockIsFollowing.mockImplementation(async (_followerId: string, followingId: string) => {
      return followingId === 'user-1';
    });

    renderSection();

    await act(async () => {
      fireEvent.change(screen.getByTestId('user-search-input'), {
        target: { value: 'alice' },
      });
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByTestId('btn-follow-alice')).toBeTruthy();
    });

    // Wait for follow status to be checked
    await waitFor(() => {
      expect(screen.getByTestId('btn-follow-alice').textContent).toBe('Following');
    });

    // Click unfollow
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-follow-alice'));
    });

    expect(mockUnfollowUser).toHaveBeenCalledWith('user-1', 'me-123');

    // Button should now show "Follow" (optimistic)
    await waitFor(() => {
      expect(screen.getByTestId('btn-follow-alice').textContent).toBe('Follow');
    });
  });
});
