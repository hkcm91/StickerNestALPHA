/**
 * Video Entity schema — re-export from canvas-entity
 *
 * @module @sn/types/video-entity
 *
 * @remarks
 * VideoEntitySchema is defined in canvas-entity.ts alongside all other
 * entity types to avoid circular imports. This file re-exports it for
 * convenience and separate JSON schema generation.
 */

export { VideoEntitySchema, type VideoEntity } from './canvas-entity';

import { VideoEntitySchema } from './canvas-entity';

export const VideoEntityJSONSchema = VideoEntitySchema.toJSONSchema();
