/**
 * Profile upload utility tests
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the module under test
vi.mock('../supabase', () => {
  const mockUpload = vi.fn();
  const mockGetPublicUrl = vi.fn();
  return {
    supabase: {
      storage: {
        from: vi.fn(() => ({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
        })),
      },
    },
    __mockUpload: mockUpload,
    __mockGetPublicUrl: mockGetPublicUrl,
  };
});

import { supabase } from '../supabase';

import { validateProfileImage, uploadProfileImage } from './profile-upload';

// Get mock references
const mockFrom = supabase.storage.from as ReturnType<typeof vi.fn>;

describe('validateProfileImage', () => {
  const makeFile = (type: string, size: number): File =>
    new File(['x'.repeat(size)], 'test.jpg', { type });

  it('accepts valid JPEG avatar under 2 MB', () => {
    const file = makeFile('image/jpeg', 1024);
    expect(validateProfileImage(file, 'avatar')).toEqual({ valid: true });
  });

  it('accepts valid PNG banner under 5 MB', () => {
    const file = makeFile('image/png', 1024);
    expect(validateProfileImage(file, 'banner')).toEqual({ valid: true });
  });

  it('accepts WebP and GIF formats', () => {
    expect(validateProfileImage(makeFile('image/webp', 100), 'avatar').valid).toBe(true);
    expect(validateProfileImage(makeFile('image/gif', 100), 'banner').valid).toBe(true);
  });

  it('rejects unsupported MIME types', () => {
    const file = makeFile('image/bmp', 100);
    const result = validateProfileImage(file, 'avatar');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported format');
  });

  it('rejects avatar over 2 MB', () => {
    const file = makeFile('image/jpeg', 3 * 1024 * 1024);
    const result = validateProfileImage(file, 'avatar');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('2 MB');
  });

  it('rejects banner over 5 MB', () => {
    const file = makeFile('image/jpeg', 6 * 1024 * 1024);
    const result = validateProfileImage(file, 'banner');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('5 MB');
  });

  it('accepts avatar at exactly 2 MB', () => {
    const file = makeFile('image/jpeg', 2 * 1024 * 1024);
    expect(validateProfileImage(file, 'avatar').valid).toBe(true);
  });
});

describe('uploadProfileImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads to correct storage path with upsert', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/profile-images/user-123/avatar.jpg' },
    });
    mockFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    const blob = new Blob(['test'], { type: 'image/jpeg' });
    const result = await uploadProfileImage({ userId: 'user-123', file: blob, type: 'avatar' });

    expect(mockFrom).toHaveBeenCalledWith('profile-images');
    expect(mockUpload).toHaveBeenCalledWith(
      'user-123/avatar.jpg',
      blob,
      { upsert: true, contentType: 'image/jpeg' },
    );
    expect(result.publicUrl).toContain('https://storage.example.com/profile-images/user-123/avatar.jpg');
  });

  it('uploads banner to correct path', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/profile-images/user-456/banner.jpg' },
    });
    mockFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    const blob = new Blob(['test'], { type: 'image/jpeg' });
    await uploadProfileImage({ userId: 'user-456', file: blob, type: 'banner' });

    expect(mockUpload).toHaveBeenCalledWith(
      'user-456/banner.jpg',
      blob,
      { upsert: true, contentType: 'image/jpeg' },
    );
  });

  it('throws on upload failure', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: { message: 'Storage full' } });
    mockFrom.mockReturnValue({ upload: mockUpload, getPublicUrl: vi.fn() });

    const blob = new Blob(['test'], { type: 'image/jpeg' });
    await expect(
      uploadProfileImage({ userId: 'user-123', file: blob, type: 'avatar' }),
    ).rejects.toThrow('Upload failed: Storage full');
  });
});
