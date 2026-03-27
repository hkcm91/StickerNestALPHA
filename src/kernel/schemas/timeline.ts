/**
 * Timeline schemas — the backbone of the video production system
 *
 * @module @sn/types/timeline
 *
 * @remarks
 * Defines the time-driven data model for video composition:
 * - CompositionSettings: resolution, fps, duration
 * - TimelineTrack: a row in the timeline (entity, audio, or adjustment)
 * - TimelineClip: an entity's presence on the timeline with in/out points
 * - TimelineKeyframe: a property value at a specific absolute time
 * - PropertyTrack: keyframes for a single property over time
 * - TimelineMarker: named time points for navigation
 * - LoopRegion: loop preview region
 * - TimelineData: the full timeline document attached to a CanvasDocument
 */

import { z } from 'zod';

import { EasingNameSchema } from './entity-animation';

// =============================================================================
// Composition Settings
// =============================================================================

/**
 * Composition-level settings for the video output.
 */
export const CompositionSettingsSchema = z.object({
  /** Duration in seconds */
  duration: z.number().positive().default(30),
  /** Frames per second for editing/preview/export */
  fps: z.number().int().min(1).max(120).default(30),
  /** Output width in pixels */
  width: z.number().int().positive().default(1920),
  /** Output height in pixels */
  height: z.number().int().positive().default(1080),
  /** Background color for the composition */
  backgroundColor: z.string().default('#000000'),
  /** Audio sample rate */
  sampleRate: z.number().int().default(48000),
});

export type CompositionSettings = z.infer<typeof CompositionSettingsSchema>;

// =============================================================================
// Track Types
// =============================================================================

/**
 * Timeline track types.
 * - entity: any visual canvas entity
 * - audio: audio-only track
 * - adjustment: effects applied to layers below (future)
 */
export const TrackTypeSchema = z.enum(['entity', 'audio', 'adjustment']);
export type TrackType = z.infer<typeof TrackTypeSchema>;

// =============================================================================
// Timeline Track
// =============================================================================

/**
 * A timeline track — a horizontal row that holds clips.
 */
export const TimelineTrackSchema = z.object({
  /** Unique track ID */
  id: z.string().uuid(),
  /** Human-readable name */
  name: z.string().default('Track'),
  /** Track type */
  type: TrackTypeSchema,
  /** Z-order within composition (higher = rendered in front) */
  order: z.number().int(),
  /** Track is locked from editing */
  locked: z.boolean().default(false),
  /** Track visibility (video) / audibility (audio) */
  visible: z.boolean().default(true),
  /** Track-level volume for audio tracks (0-2, >1 = boost) */
  volume: z.number().min(0).max(2).default(1),
  /** Solo this track (only play this track's audio) */
  solo: z.boolean().default(false),
  /** Track height in timeline UI (pixels) */
  height: z.number().int().positive().default(40),
});

export type TimelineTrack = z.infer<typeof TimelineTrackSchema>;

// =============================================================================
// Blend Mode
// =============================================================================

export const BlendModeSchema = z.enum([
  'normal', 'multiply', 'screen', 'overlay', 'darken',
  'lighten', 'color-dodge', 'color-burn', 'hard-light',
  'soft-light', 'difference', 'exclusion',
]);

export type BlendMode = z.infer<typeof BlendModeSchema>;

// =============================================================================
// Timeline Clip
// =============================================================================

/**
 * A timeline clip — represents an entity's presence on the timeline.
 *
 * @remarks
 * A clip binds an entity to a time range. When the playhead is within
 * [timelineIn, timelineOut], the entity is visible and its properties
 * are driven by the clip's property tracks.
 *
 * For video/audio entities, sourceIn/sourceOut define the trim range
 * within the source media.
 */
export const TimelineClipSchema = z.object({
  /** Unique clip ID */
  id: z.string().uuid(),
  /** Track this clip belongs to */
  trackId: z.string().uuid(),
  /** Entity ID this clip controls */
  entityId: z.string().uuid(),
  /** In-point on timeline (seconds) */
  timelineIn: z.number().nonnegative(),
  /** Out-point on timeline (seconds) */
  timelineOut: z.number().positive(),
  /** Source media in-point (seconds, for video/audio trim) */
  sourceIn: z.number().nonnegative().default(0),
  /** Source media out-point (seconds, for video/audio trim) */
  sourceOut: z.number().nonnegative().optional(),
  /** Playback speed multiplier */
  speed: z.number().positive().default(1),
  /** Whether clip audio is muted */
  muted: z.boolean().default(false),
  /** Whether clip is disabled (skipped during playback) */
  disabled: z.boolean().default(false),
  /** Blend mode for compositing */
  blendMode: BlendModeSchema.default('normal'),
  /** CSS filter string (e.g., "blur(5px) brightness(1.2)") */
  filters: z.string().optional(),
  /** Mask entity ID (entity A clips this entity) */
  maskEntityId: z.string().uuid().optional(),
  /** Mask mode */
  maskMode: z.enum(['alpha', 'luminance', 'inverted']).optional(),
  /** Parent entity ID for transform parenting */
  parentEntityId: z.string().uuid().optional(),
});

export type TimelineClip = z.infer<typeof TimelineClipSchema>;

// =============================================================================
// Timeline Keyframe
// =============================================================================

/**
 * A timeline keyframe — a property value at a specific absolute time.
 *
 * @remarks
 * Unlike AnimationKeyframe (which uses 0-1 offset), TimelineKeyframe
 * uses absolute time in seconds from composition start. This enables
 * direct scrubbing and frame-accurate evaluation.
 */
export const TimelineKeyframeSchema = z.object({
  /** Time position in seconds */
  time: z.number().nonnegative(),
  /** Property value at this keyframe */
  value: z.number(),
  /** Easing to next keyframe */
  easing: EasingNameSchema.default('linear'),
  /** Custom cubic bezier control points [x1, y1, x2, y2] */
  bezierHandles: z.tuple([
    z.number(), z.number(), z.number(), z.number(),
  ]).optional(),
});

export type TimelineKeyframe = z.infer<typeof TimelineKeyframeSchema>;

// =============================================================================
// Animatable Timeline Property
// =============================================================================

/**
 * Properties that can be keyframed on the timeline.
 */
export const TimelinePropertySchema = z.enum([
  'opacity', 'positionX', 'positionY', 'scaleX', 'scaleY',
  'rotation', 'width', 'height', 'borderRadius',
  'volume', 'playbackRate',
  'filterBlur', 'filterBrightness', 'filterContrast',
  'filterSaturate', 'filterHueRotate',
]);

export type TimelineProperty = z.infer<typeof TimelinePropertySchema>;

// =============================================================================
// Property Track
// =============================================================================

/**
 * A property track — keyframes for a single property over time.
 *
 * @remarks
 * Each clip can have multiple property tracks, one per animated property.
 * The TimelineSystem interpolates between keyframes at the current
 * playhead time and writes the result to the AnimationOverlay store.
 */
export const PropertyTrackSchema = z.object({
  /** Unique track ID */
  id: z.string().uuid(),
  /** Clip this property track belongs to */
  clipId: z.string().uuid(),
  /** Property being animated */
  property: TimelinePropertySchema,
  /** Keyframes for this property (sorted by time) */
  keyframes: z.array(TimelineKeyframeSchema).min(1),
});

export type PropertyTrack = z.infer<typeof PropertyTrackSchema>;

// =============================================================================
// Timeline Marker
// =============================================================================

/**
 * A timeline marker — a named time point for navigation.
 */
export const TimelineMarkerSchema = z.object({
  /** Unique marker ID */
  id: z.string().uuid(),
  /** Time position in seconds */
  time: z.number().nonnegative(),
  /** Label text */
  label: z.string().default(''),
  /** Marker color (hex) */
  color: z.string().default('#ff0000'),
});

export type TimelineMarker = z.infer<typeof TimelineMarkerSchema>;

// =============================================================================
// Loop Region
// =============================================================================

/**
 * Loop region for preview playback.
 */
export const LoopRegionSchema = z.object({
  /** Whether loop is active */
  enabled: z.boolean().default(false),
  /** Loop start time in seconds */
  inPoint: z.number().nonnegative().default(0),
  /** Loop end time in seconds */
  outPoint: z.number().nonnegative().default(10),
});

export type LoopRegion = z.infer<typeof LoopRegionSchema>;

// =============================================================================
// Timeline Data (attached to CanvasDocument)
// =============================================================================

/**
 * The complete timeline data model — attached to a CanvasDocument
 * when timeline/video mode is active for that canvas.
 */
export const TimelineDataSchema = z.object({
  /** Composition settings (resolution, fps, duration) */
  composition: CompositionSettingsSchema.default(CompositionSettingsSchema.parse({})),
  /** All tracks (ordered top to bottom) */
  tracks: z.array(TimelineTrackSchema).default([]),
  /** All clips across all tracks */
  clips: z.array(TimelineClipSchema).default([]),
  /** All property tracks (keyframe automation) */
  propertyTracks: z.array(PropertyTrackSchema).default([]),
  /** Navigation markers */
  markers: z.array(TimelineMarkerSchema).default([]),
  /** Loop region for preview */
  loopRegion: LoopRegionSchema.default(LoopRegionSchema.parse({})),
});

export type TimelineData = z.infer<typeof TimelineDataSchema>;

// =============================================================================
// JSON Schema exports
// =============================================================================

export const CompositionSettingsJSONSchema = CompositionSettingsSchema.toJSONSchema();
export const TimelineTrackJSONSchema = TimelineTrackSchema.toJSONSchema();
export const TimelineClipJSONSchema = TimelineClipSchema.toJSONSchema();
export const Time