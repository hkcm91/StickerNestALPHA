/**
 * Remote upload utility tests
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

import { uploadRemoteImage } from './remote-upload';

const mockFrom = supabase.storage.from as ReturnType<typeof vi.fn>;

// Helper to mock global fetch
function mockFetchResponse(opts: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
  blob?: Blob;
}) {
  const blob = opts.blob ?? new Blob(['fake-image-data'], { type: opts.contentType ?? 'image/png' });
  const headers = new Headers();
  if (opts.contentType) headers.set('content-type', opts.contentType);

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: opts.ok ?? true,
      status: opts.status ?? 200,
      statusText: opts.statusText ?? 'OK',
      headers,
      blob: vi.fn().mockResolvedValue(blob),
    }),
  );
}

describe('uploadRemoteImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('fetches remote URL and uploads blob to correct bucket/path', async () => {
    const imageBlob = new Blob(['pixels'], { type: 'image/jpeg' });
    mockFetchResponse({ contentType: 'image/jpeg', blob: imageBlob });

    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/generated-images/user-1/my-file.jpg' },
    });
    mockFrom.mockReturnValue({ upload: mockUpload, getPublicUrl: mockGetPublicUrl });

    const result = await uploadRemoteImage({
      sourceUrl: 'https://replicate.delivery/temp/image.jpg',
      bucket: 'generated-images',
      userId: 'user-1',
      filename: 'my-file',
    });

    expect(fetch).toHaveBeenCalledWith('https://replicate.delivery/temp/image.jpg');
    expect(mockFrom).toHaveBeenCalledWith('generated-images');
    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/my-file.jpg',
      imageBlob,
      { upsert: false, contentType: 'image/jpeg' },
    );
    expect(result.publicUrl).toBe(
      'https://storage.example.com/generated-images/user-1/my-file.jpg',
    );
  });

  it('generates UUID filename when none provided', async () => {
    mockFetchResponse({ contentType: 'image/png' });

    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/bucket/user-1/uuid.png' },
    });
    mockFrom.mockReturnValue({ upload: mockUpload, getPublicUrl: mockGetPublicUrl });

    await uploadRemoteImage({
      sourceUrl: 'https://example.com/img.png',
      bucket: 'bucket',
      userId: 'user-1',
    });

    const uploadPath = mockUpload.mock.calls[0][0] as string;
    expect(uploadPath).toMatch(/^user-1\/[0-9a-f-]+\.png$/);
  });

  it('defaults to png when content-type header is missing', async () => {
    // No content-type header
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        blob: vi.fn().mockResolvedValue(new Blob(['data'])),
      }),
    );

    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/b/u/f.png' },
    });
    mockFrom.mockReturnValue({ upload: mockUpload, getPublicUrl: mockGetPublicUrl });

    await uploadRemoteImage({
      sourceUrl: 'https://example.com/img',
      bucket: 'b',
      userId: 'u',
      filename: 'f',
    });

    expect(mockUpload).toHaveBeenCalledWith(
      'u/f.png',
      expect.any(Blob),
      { upsert: false, contentType: 'image/png' },
    );
  });

  it('derives correct extension from content type', async () => {
    for (const [mime, ext] of [
      ['image/jpeg', 'jpg'],
      ['image/png', 'png'],
      ['image/webp', 'webp'],
      ['image/gif', 'gif'],
    ]) {
      vi.clearAllMocks();
      mockFetchResponse({ contentType: mime });

      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/url' },
      });
      mockFrom.mockReturnValue({ upload: mockUpload, getPublicUrl: mockGetPublicUrl });

      await uploadRemoteImage({
        sourceUrl: 'https://example.com/img',
        bucket: 'b',
        userId: 'u',
        filename: 'test',
      });

      const uploadPath = mockUpload.mock.calls[0][0] as string;
      expect(uploadPath).toBe(`u/test.${ext}`);
    }
  });

  it('throws on fetch failure (non-OK response)', async () => {
    mockFetchResponse({ ok: false, status: 404, statusText: 'Not Found' });

    await expect(
      uploadRemoteImage({
        sourceUrl: 'https://example.com/gone.png',
        bucket: 'b',
        userId: 'u',
      }),
    ).rejects.toThrow('Failed to fetch remote image: 404 Not Found');
  });

  it('throws on Supabase upload error', async () => {
    mockFetchResponse({ contentType: 'image/png' });

    const mockUpload = vi.fn().mockResolvedValue({ error: { message: 'Bucket full' } });
    mockFrom.mockReturnValue({ upload: mockUpload, getPublicUrl: vi.fn() });

    await expect(
      uploadRemoteImage({
        sourceUrl: 'https://example.com/img.png',
        bucket: 'b',
        userId: 'u',
      }),
    ).rejects.toThrow('Upload failed: Bucket full');
  });
});
