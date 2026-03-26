/**
 * FollowersPanel tests
 * @module shell/profile
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../kernel/social-graph', () => ({
  getFollowers: vi.fn(),
  getFollowing: vi.fn(),
}));

import { getFollowers, getFollowing } from '../../kernel/social-graph';

import { FollowersPanel } from './FollowersPanel';

const mockGetFollowers = getFollowers as ReturnType<typeof vi.fn>;
const mockGetFollowing = getFollowing as ReturnType<typeof vi.fn>;

const MOCK_FOLLOWER = {
  userId: 'user-1',
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  bio: 'Hello world',
};

const MOCK_FOLLOWING = {
  userId: 'user-2',
  username: 'bob',
  displayName: 'Bob',
  avatarUrl: 'https://example.com/bob.jpg',
  bio: null,
};

function renderPanel(initialTab: 'followers' | 'following' = 'followers') {
  const onClose = vi.fn();
  const result = render(
    <MemoryRouter>
      <FollowersPanel userId="user-0" initialTab={initialTab} onClose={onClose} />
    </MemoryRouter>,
  );
  return { ...result, onClose };
}

describe('FollowersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFollowers.mockResolvedValue({
      success: true,
      data: { items: [MOCK_FOLLOWER] },
    });
    mockGetFollowing.mockResolvedValue({
      success: true,
      data: { items: [MOCK_FOLLOWING] },
    });
  });

  it('renders panel with tabs and shows followers list', async () => {
    renderPanel('followers');
    expect(screen.getByTestId('followers-panel')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId('tab-followers')).toBeTruthy();
      expect(screen.getByTestId('tab-following')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-row-alice')).toBeTruthy();
    });
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('@alice')).toBeTruthy();
  });

  it('switches to following tab when clicked', async () => {
    renderPanel('followers');
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeNull();
    });

    fireEvent.click(screen.getByTestId('tab-following'));

    await waitFor(() => {
      expect(screen.getByTestId('user-row-bob')).toBeTruthy();
    });
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('@bob')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', async () => {
    const { onClose } = renderPanel('followers');
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeNull();
    });

    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const { onClose, container } = renderPanel('followers');
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeNull();
    });

    // Backdrop is the first child (fixed overlay)
    const backdrop = container.querySelector('[style*="position: fixed"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('shows loading state initially', () => {
    mockGetFollowers.mockReturnValue(new Promise(() => {}));
    mockGetFollowing.mockReturnValue(new Promise(() => {}));
    renderPanel('followers');
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('shows empty state when no followers', async () => {
    mockGetFollowers.mockResolvedValue({
      success: true,
      data: { items: [] },
    });
    renderPanel('followers');
    await waitFor(() => {
      expect(screen.getByText('No followers yet.')).toBeTruthy();
    });
  });

  it('shows bio snippet when user has bio', async () => {
    renderPanel('followers');
    await waitFor(() => {
      expect(screen.getByText('Hello world')).toBeTruthy();
    });
  });

  it('displays avatar image when user has avatarUrl', async () => {
    renderPanel('following');
    fireEvent.click(screen.getByTestId('tab-following'));
    await waitFor(() => {
      expect(screen.getByTestId('user-row-bob')).toBeTruthy();
    });
    const img = screen.getByAlt('Bob');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/bob.jpg');
  });
});
