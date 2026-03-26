import { describe, it, expect } from 'vitest';

import {
  GalleryAssetSchema,
  CreateGalleryAssetInputSchema,
  UpdateGalleryAssetInputSchema,
} from './gallery';

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const validAsset = () => ({
  id: uuid(),
  ownerId: uuid(),
  name: 'photo.jpg',
  storagePath: 'gallery/user123/photo.jpg',
  url: 'https://example.com/photo.jpg',
  fileType: 'image/jpeg',
  fileSize: 1024,
  createdAt: now(),
  updatedAt: now(),
});

describe('GalleryAssetSchema', () => {
  it('parses valid asset with required fields only', () => {
    const result = GalleryAssetSchema.parse(validAsset());
    expect(result.name).toBe('photo.jpg');
    expect(result.thumbnailUrl).toBeUndefined();
    expect(result.width).toBeUndefined();
  });

  it('parses asset with all optional fields', () => {
    const result = GalleryAssetSchema.parse({
      ...validAsset(),
      thumbnailUrl: 'https://example.com/thumb.jpg',
      width: 1920,
      height: 1080,
      description: 'A nice photo',
      tags: ['landscape', 'nature'],
    });
    expect(result.width).toBe(1920);
    expect(result.tags).toHaveLength(2);
  });

  it('rejects empty name', () => {
    expect(() => GalleryAssetSchema.parse({ ...validAsset(), name: '' })).toThrow();
  });

  it('rejects name exceeding 255 chars', () => {
    expect(() =>
      GalleryAssetSchema.parse({ ...validAsset(), name: 'a'.repeat(256) }),
    ).toThrow();
  });

  it('rejects invalid url', () => {
    expect(() =>
      GalleryAssetSchema.parse({ ...validAsset(), url: 'not-a-url' }),
    ).toThrow();
  });

  it('rejects negative fileSize', () => {
    expect(() =>
      GalleryAssetSchema.parse({ ...validAsset(), fileSize: -1 }),
    ).toThrow();
  });

  it('rejects non-positive width', () => {
    expect(() =>
      GalleryAssetSchema.parse({ ...validAsset(), width: 0 }),
    ).toThrow();
  });

  it('rejects more than 20 tags', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(() =>
      GalleryAssetSchema.parse({ ...validAsset(), tags }),
    ).toThrow();
  });

  it('rejects tag longer than 50 chars', () => {
    expect(() =>
      GalleryAssetSchema.parse({ ...validAsset(), tags: ['x'.repeat(51)] }),
    ).toThrow();
  });

  it('rejects description over 1000 chars', () => {
    expect(() =>
      GalleryAssetSchema.parse({ ...validAsset(), description: 'a'.repeat(1001) }),
    ).toThrow();
  });
});

describe('CreateGalleryAssetInputSchema', () => {
  it('parses valid create input', () => {
    const result = CreateGalleryAssetInputSchema.parse({
      name: 'image.png',
      storagePath: 'gallery/user/image.png',
      fileType: 'image/png',
      fileSize: 2048,
    });
    expect(result.name).toBe('image.png');
  });

  it('accepts optional dimensions', () => {
    const result = CreateGalleryAssetInputSchema.parse({
      name: 'img.png',
      storagePath: 'gallery/user/img.png',
      fileType: 'image/png',
      fileSize: 512,
      width: 800,
      height: 600,
    });
    expect(result.width).toBe(800);
  });

  it('rejects missing required fields', () => {
    expect(() => CreateGalleryAssetInputSchema.parse({})).toThrow();
  });
});

describe('UpdateGalleryAssetInputSchema', () => {
  it('parses empty update (all optional)', () => {
    const result = UpdateGalleryAssetInputSchema.parse({});
    expect(result).toEqual({});
  });

  it('parses partial update', () => {
    const result = UpdateGalleryAssetInputSchema.parse({
      name: 'renamed.png',
      tags: ['new-tag'],
    });
    expect(result.name).toBe('renamed.png');
    expect(result.tags).toEqual(['new-tag']);
  });

  it('rejects empty name in update', () => {
    expect(() => UpdateGalleryAssetInputSchema.parse({ name: '' })).toThrow();
  });
});
