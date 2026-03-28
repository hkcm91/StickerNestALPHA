/**
 * Gallery Widget Schemas
 * @module runtime/widgets/gallery
 * @layer L3
 */

import { z } from 'zod';

export const galleryConfigSchema = z.object({
  columnsMin: z.number().int().min(2).max(6).default(3),
  thumbnailSize: z.number().int().min(60).max(200).default(100),
});

export type GalleryConfig = z.infer<typeof galleryConfigSchema>;

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = galleryConfigSchema.parse({});
