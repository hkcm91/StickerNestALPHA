/**
 * Gallery Asset Schemas
 * @module @sn/types/gallery
 *
 * @remarks
 * Defines schemas for user-uploaded gallery assets.
 * Assets are stored in Supabase Storage (assets bucket) with metadata
 * tracked in the gallery_assets database table.
 */

import { z } from 'zod';

/**
 * Gallery Asset schema — metadata for user-uploaded files
 */
export const GalleryAssetSchema = z.object({
  /** Unique asset identifier (UUID) */
  id: z.string().uuid(),

  /** Owner user ID */
  ownerId: z.string().uuid(),

  /** Original filename */
  name: z.string().min(1).max(255),

  /** Storage path in Supabase Storage (e.g., gallery/user_id/filename.jpg) */
  storagePath: z.string().min(1),

  /** Public URL for the asset */
  url: z.string().url(),

  /** Optional thumbnail URL */
  thumbnailUrl: z.string().url().optional(),

  /** MIME type (e.g., 'image/png', 'image/gif') */
  fileType: z.string().min(1),

  /** File size in bytes */
  fileSize: z.number().int().nonnegative(),

  /** Image width in pixels (nullable for non-images) */
  width: z.number().int().positive().optional(),

  /** Image height in pixels (nullable for non-images) */
  height: z.number().int().positive().optional(),

  /** Optional description */
  description: z.string().max(1000).optional(),

  /** Tags for organization and search */
  tags: z.array(z.string().max(50)).max(20).optional(),

  /** Creation timestamp (ISO 8601) */
  createdAt: z.string().datetime(),

  /** Last update timestamp (ISO 8601) */
  updatedAt: z.string().datetime(),
});

/**
 * GalleryAsset type inferred from schema
 */
export type GalleryAsset = z.infer<typeof GalleryAssetSchema>;

/**
 * Input schema for creating a gallery asset
 */
export const CreateGalleryAssetInputSchema = z.object({
  name: z.string().min(1).max(255),
  storagePath: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export type CreateGalleryAssetInput = z.infer<typeof CreateGalleryAssetInputSchema>;

/**
 * Input schema for updating a gallery asset
 */
export const UpdateGalleryAssetInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export type UpdateGalleryAssetInput = z.infer<typeof UpdateGalleryAssetInputSchema>;

/**
 * JSON Schema export for external validation
 */
export const GalleryAssetJSONSchema = GalleryAssetSchema.toJSONSchema();
