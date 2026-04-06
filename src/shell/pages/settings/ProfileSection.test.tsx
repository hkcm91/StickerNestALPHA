/**
 * ProfileSection tests
 * @vitest-environment jsdom
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../../../kernel/stores/auth/auth.store';

// Mock dependencies
vi.mock('../../../kernel/social-graph', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  isUsernameAvailable: vi.fn(),
}));

vi.mock('../../../kernel/storage', () => ({
  validateProfileImage: vi.fn(),
  uploadProfileImage: vi.fn(),
  cropToAspectRatio: vi.fn(),
  resizeImage: vi.fn(),
}));

// Must import after vi.mock
import { getProfile, updateProfile, isUsernameAvailable } from '../../../kernel/social-graph';

import { ProfileSection } from './ProfileSection';

const mockGetProfile = getProfile as ReturnType<typeof vi.fn>;
const mockUpdateProfile = updateProfile as ReturnType<typeof vi.fn>;
const mockIsUsernameAvailable = isUsernameAvailable as ReturnType<typeof vi.fn>;

const TEST_USER = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  tier: 'free' as const,
};

const TEST_PROFILE = {
  userId: 'user-1',
  displayName: 'Test User',
  username: 'testuser',
  bio: 'Hello world',
  avatarUrl: undefined,
  bannerUrl: undefined,
  location: 'New York',
  websiteUrl: 'https://example.com',
  visibility: 'public' as const,
  followerCount: 10,
  followingCount: 5,
  postCount: 3,
  isVerified: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('ProfileSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().reset();
    useAuthStore.getState().setUser(TEST_USER);

    mockGetProfile.mockResolvedValue({ success: true, data: TEST_PROFILE });
    mockUpdateProfile.mockResolvedValue({ success: true, data: TEST_PROFILE });
    mockIsUsernameAvailable.mockResolvedValue(true);
  });

  it('renders loading state initially', () => {
    render(<ProfileSection />);
    expect(screen.getByTestId('profile-section-loading')).toBeTruthy();
  });

  it('renders form fields after profile loads', async () => {
    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByTestId('input-display-name')).toBeTruthy();
    });

    expect((screen.getByTestId('input-display-name') as HTMLInputElement).value).toBe('Test User');
    expect((screen.getByTestId('input-username') as HTMLInputElement).value).toBe('testuser');
    expect((screen.getByTestId('input-bio') as HTMLTextAreaElement).value).toBe('Hello world');
    expect((screen.getByTestId('input-location') as HTMLInputElement).value).toBe('New York');
    expect((screen.getByTestId('input-website') as HTMLInputElement).value).toBe('https://example.com');
    expect((screen.getByTestId('select-visibility') as HTMLSelectElement).value).toBe('public');
  });

  it('calls updateProfile on save with changed fields', async () => {
    const updatedProfile = { ...TEST_PROFILE, bio: 'Updated bio' };
    mockUpdateProfile.mockResolvedValue({ success: true, data: updatedProfile });

    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByTestId('input-bio')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('input-bio'), { target: { value: 'Updated bio' } });
    fireEvent.click(screen.getByTestId('btn-save-profile'));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ bio: 'Updated bio' }),
        'user-1',
      );
    });
  });

  it('shows error when profile fails to load', async () => {
    mockGetProfile.mockResolvedValue({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });

    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByText('Could not load profile.')).toBeTruthy();
    });
  });

  it('shows success message after save', async () => {
    mockUpdateProfile.mockResolvedValue({ success: true, data: { ...TEST_PROFILE, location: 'LA' } });

    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByTestId('input-location')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('input-location'), { target: { value: 'LA' } });
    fireEvent.click(screen.getByTestId('btn-save-profile'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-success')).toBeTruthy();
      expect(screen.getByText('Profile saved!')).toBeTruthy();
    });
  });

  it('sanitizes username input to allowed characters only', async () => {
    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByTestId('input-username')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'hello@world!' } });
    expect((screen.getByTestId('input-username') as HTMLInputElement).value).toBe('helloworld');
  });

  it('renders avatar and banner preview areas', async () => {
    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-avatar-preview')).toBeTruthy();
      expect(screen.getByTestId('profile-banner-preview')).toBeTruthy();
    });
  });

  it('shows save button', async () => {
    render(<ProfileSection />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-save-profile')).toBeTruthy();
    });

    expect(screen.getByText('Save Changes')).toBeTruthy();
  });
});
