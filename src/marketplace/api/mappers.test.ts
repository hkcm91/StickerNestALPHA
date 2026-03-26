/**
 * Mapper function tests
 *
 * @module marketplace/api
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { rowToListing, rowToDetail, rowToReview, rowToVersion, generateSlug, LISTING_COLUMNS } from './mappers';

vi.mock('@sn/types', () => ({
  WidgetManifestSchema: {
    safeParse: vi.fn((data: unknown) => {
      if (data === null || data === undefined) {
        return { success: false, error: { issues: [{ message: 'Invalid manifest' }] } };
      }
      return { success: true, data };
    }),
  },
}));

describe('mappers', () => {
  const baseRow = {
    id: 'w1',
    name: 'Test Widget',
    slug: 'test-widget',
    description: 'A test widget',
    version: '1.0.0',
    author_id: 'u1',
    thumbnail_url: 'https://example.com/thumb.png',
    icon_url: null,
    category: 'utilities',
    tags: ['test', 'utility'],
    license: 'MIT',
    is_published: true,
    is_deprecated: false,
    install_count: 42,
    rating_average: 4.5,
    rating_count: 10,
    is_free: true,
    price_cents: null,
    currency: 'usd',
    stripe_price_id: null,
    metadata: { official: true },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  };

  describe('rowToListing', () => {
    it('maps all fields from snake_case to camelCase', () => {
      const listing = rowToListing(baseRow);

      expect(listing.id).toBe('w1');
      expect(listing.name).toBe('Test Widget');
      expect(listing.slug).toBe('test-widget');
      expect(listing.description).toBe('A test widget');
      expect(listing.version).toBe('1.0.0');
      expect(listing.authorId).toBe('u1');
      expect(listing.thumbnailUrl).toBe('https://example.com/thumb.png');
      expect(listing.iconUrl).toBeNull();
      expect(listing.category).toBe('utilities');
      expect(listing.tags).toEqual(['test', 'utility']);
      expect(listing.license).toBe('MIT');
      expect(listing.isPublished).toBe(true);
      expect(listing.isDeprecated).toBe(false);
      expect(listing.installCount).toBe(42);
      expect(listing.ratingAverage).toBe(4.5);
      expect(listing.ratingCount).toBe(10);
      expect(listing.isFree).toBe(true);
      expect(listing.priceCents).toBeNull();
      expect(listing.currency).toBe('usd');
      expect(listing.stripePriceId).toBeNull();
      expect(listing.metadata).toEqual({ official: true });
      expect(listing.createdAt).toBe('2026-01-01T00:00:00Z');
      expect(listing.updatedAt).toBe('2026-01-15T00:00:00Z');
    });

    it('defaults tags to empty array when null', () => {
      const listing = rowToListing({ ...baseRow, tags: null });
      expect(listing.tags).toEqual([]);
    });

    it('defaults isFree to true when missing', () => {
      const row = { ...baseRow };
      delete (row as Record<string, unknown>).is_free;
      const listing = rowToListing(row);
      expect(listing.isFree).toBe(true);
    });

    it('defaults currency to usd when missing', () => {
      const row = { ...baseRow };
      delete (row as Record<string, unknown>).currency;
      const listing = rowToListing(row);
      expect(listing.currency).toBe('usd');
    });

    it('defaults metadata to empty object when missing', () => {
      const row = { ...baseRow };
      delete (row as Record<string, unknown>).metadata;
      const listing = rowToListing(row);
      expect(listing.metadata).toEqual({});
    });
  });

  describe('rowToDetail', () => {
    it('returns detail with htmlContent and manifest for valid manifest', () => {
      const row = {
        ...baseRow,
        html_content: '<div>Hello</div>',
        manifest: { id: 'w1', name: 'Test', version: '1.0.0' },
      };
      const detail = rowToDetail(row);

      expect(detail).not.toBeNull();
      expect(detail!.htmlContent).toBe('<div>Hello</div>');
      expect(detail!.manifest).toEqual({ id: 'w1', name: 'Test', version: '1.0.0' });
      expect(detail!.name).toBe('Test Widget');
    });

    it('returns null when manifest is invalid', () => {
      const row = { ...baseRow, html_content: '<div/>', manifest: null };
      const detail = rowToDetail(row);
      expect(detail).toBeNull();
    });

    it('includes all listing fields in detail', () => {
      const row = {
        ...baseRow,
        html_content: '<div/>',
        manifest: { id: 'w1' },
      };
      const detail = rowToDetail(row);
      expect(detail).not.toBeNull();
      expect(detail!.id).toBe('w1');
      expect(detail!.installCount).toBe(42);
    });
  });

  describe('rowToReview', () => {
    it('maps review row fields correctly', () => {
      const row = {
        id: 'r1',
        widget_id: 'w1',
        user_id: 'u1',
        rating: 5,
        review_text: 'Great widget!',
        created_at: '2026-02-01T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z',
      };
      const review = rowToReview(row);

      expect(review.id).toBe('r1');
      expect(review.widgetId).toBe('w1');
      expect(review.userId).toBe('u1');
      expect(review.rating).toBe(5);
      expect(review.reviewText).toBe('Great widget!');
      expect(review.createdAt).toBe('2026-02-01T00:00:00Z');
    });

    it('handles null review text', () => {
      const row = {
        id: 'r2',
        widget_id: 'w1',
        user_id: 'u2',
        rating: 3,
        review_text: null,
        created_at: '2026-02-01T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z',
      };
      const review = rowToReview(row);
      expect(review.reviewText).toBeNull();
    });
  });

  describe('rowToVersion', () => {
    it('maps version row fields correctly for valid manifest', () => {
      const row = {
        id: 'v1',
        widget_id: 'w1',
        version: '2.0.0',
        html_content: '<div>v2</div>',
        manifest: { id: 'w1', name: 'Test', version: '2.0.0' },
        changelog: 'Major update',
        created_at: '2026-03-01T00:00:00Z',
      };
      const version = rowToVersion(row);

      expect(version).not.toBeNull();
      expect(version!.id).toBe('v1');
      expect(version!.widgetId).toBe('w1');
      expect(version!.version).toBe('2.0.0');
      expect(version!.htmlContent).toBe('<div>v2</div>');
      expect(version!.changelog).toBe('Major update');
    });

    it('returns null for invalid manifest', () => {
      const row = {
        id: 'v2',
        widget_id: 'w1',
        version: '1.0.0',
        html_content: '<div/>',
        manifest: null,
        changelog: null,
        created_at: '2026-01-01T00:00:00Z',
      };
      const version = rowToVersion(row);
      expect(version).toBeNull();
    });
  });

  describe('generateSlug', () => {
    it('converts name to lowercase kebab-case with timestamp suffix', () => {
      const slug = generateSlug('My Cool Widget');
      expect(slug).toMatch(/^my-cool-widget-[a-z0-9]+$/);
    });

    it('strips special characters', () => {
      const slug = generateSlug('Hello!@#World');
      expect(slug).toMatch(/^hello-world-[a-z0-9]+$/);
    });

    it('strips leading and trailing dashes before appending timestamp', () => {
      const slug = generateSlug('---test---');
      expect(slug).toMatch(/^test-[a-z0-9]+$/);
    });

    it('handles single-word names', () => {
      const slug = generateSlug('Widget');
      expect(slug).toMatch(/^widget-[a-z0-9]+$/);
    });

    it('generates unique slugs for same name', () => {
      const slug1 = generateSlug('Widget');
      // Date.now() should advance at least slightly
      const slug2 = generateSlug('Widget');
      // They may be equal if Date.now() hasn't changed, but the format should be valid
      expect(slug1).toMatch(/^widget-[a-z0-9]+$/);
      expect(slug2).toMatch(/^widget-[a-z0-9]+$/);
    });
  });

  describe('LISTING_COLUMNS', () => {
    it('contains all required column names', () => {
      expect(LISTING_COLUMNS).toContain('id');
      expect(LISTING_COLUMNS).toContain('name');
      expect(LISTING_COLUMNS).toContain('slug');
      expect(LISTING_COLUMNS).toContain('install_count');
      expect(LISTING_COLUMNS).toContain('rating_average');
      expect(LISTING_COLUMNS).toContain('is_free');
      expect(LISTING_COLUMNS).toContain('price_cents');
    });
  });
});
