/**
 * Gallery Widget Events
 * @module runtime/widgets/gallery
 */

import { z } from 'zod';

export const GALLERY_EVENTS = {
  emits: {
    READY: 'widget.gallery.ready',
    IMAGE_ABSORBED: 'widget.gallery.image.absorbed',
    IMAGE_EMITTED: 'widget.gallery.image.emitted',
    IMAGE_DELETED: 'widget.gallery.image.deleted',
  },
  subscribes: {
    CONFIG_UPDATE: 'widget.gallery.config.update',
    ABSORB_ENTITY: 'widget.gallery.command.absorb',
  },
} as const;

export const GalleryEventPayloads = {
  emits: {
    [GALLERY_EVENTS.emits.READY]: z.object({
      instanceId: z.string(),
      timestamp: z.number(),
    }),
    [GALLERY_EVENTS.emits.IMAGE_ABSORBED]: z.object({
      instanceId: z.string(),
      assetId: z.string(),
      sourceEntityId: z.string().optional(),
      timestamp: z.number(),
    }),
    [GALLERY_EVENTS.emits.IMAGE_EMITTED]: z.object({
      instanceId: z.string(),
      assetId: z.string(),
      entityId: z.string(),
      timestamp: z.number(),
    }),
    [GALLERY_EVENTS.emits.IMAGE_DELETED]: z.object({
      instanceId: z.string(),
      assetId: z.string(),
      timestamp: z.number(),
    }),
  },
  subscribes: {
    [GALLERY_EVENTS.subscribes.CONFIG_UPDATE]: z.record(z.string(), z.unknown()),
    [GALLERY_EVENTS.subscribes.ABSORB_ENTITY]: z.object({
      entityId: z.string(),
      imageUrl: z.string(),
      name: z.string().optional(),
      removeFromCanvas: z.boolean().default(false),
    }),
  },
};
