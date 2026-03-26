/**
 * Canvas Entity schemas
 * @module @sn/types/canvas-entity
 */

import { z } from "zod";


import { EntityAnimationConfigSchema } from "./entity-animation";
import { AnchorPointSchema, PathFillRuleSchema } from "./path";
import {
  Point2DSchema,
  Size2DSchema,
  BoundingBox2DSchema,
  Vector3Schema,
  QuaternionSchema,
} from "./spatial";

/**
 * Entity type enum
 *
 * @remarks
 * All objects on the canvas extend CanvasEntity with a specific type.
 * - `sticker` - Visual asset (image/GIF/video) that may trigger logic
 * - `text` - Text block entity
 * - `widget` - Interactive program container
 * - `shape` - Vector shape (rect, ellipse, line, etc.)
 * - `drawing` - Freehand pen stroke
 * - `group` - Container for grouped entities
 * - `docker` - Container widget that hosts child widgets
 * - `audio` - Audio player with waveform visualization
 * - `svg` - Vector graphic (inline SVG markup)
 */
export const CanvasEntityTypeSchema = z.enum([
  "sticker",
  "text",
  "widget",
  "shape",
  "drawing",
  "group",
  "docker",
  "lottie",
  "audio",
  "svg",
  "path",
  "object3d",
  "artboard",
  "folder",
]);

export type CanvasEntityType = z.infer<typeof CanvasEntityTypeSchema>;

/**
 * Transform schema for 2D canvas positioning
 */
export const Transform2DSchema = z.object({
  /** Position in canvas space (not screen space) */
  position: Point2DSchema,
  /** Size in canvas units */
  size: Size2DSchema,
  /** Rotation in degrees */
  rotation: z.number().default(0),
  /** Scale factor */
  scale: z.number().positive().default(1),
});

export type Transform2D = z.infer<typeof Transform2DSchema>;

/**
 * Optional spatial transform for 3D/VR positioning
 */
export const Transform3DSchema = z.object({
  /** Position in 3D world space */
  position: Vector3Schema,
  /** Rotation as quaternion */
  rotation: QuaternionSchema,
  /** Scale in 3D */
  scale: Vector3Schema,
});

export type Transform3D = z.infer<typeof Transform3DSchema>;

/**
 * Crop rectangle — percentage-based insets from each edge.
 *
 * @remarks
 * Values are in the range [0, 1] where 0 means no crop from that edge
 * and 1 means fully cropped. For example, `{ top: 0.1, right: 0.2, bottom: 0.1, left: 0.2 }`
 * crops 10% from top/bottom and 20% from left/right.
 * Applied via CSS `clip-path: inset(top right bottom left)`.
 */
export const CropRectSchema = z.object({
  /** Percentage cropped from the top edge (0–1) */
  top: z.number().min(0).max(1).default(0),
  /** Percentage cropped from the right edge (0–1) */
  right: z.number().min(0).max(1).default(0),
  /** Percentage cropped from the bottom edge (0–1) */
  bottom: z.number().min(0).max(1).default(0),
  /** Percentage cropped from the left edge (0–1) */
  left: z.number().min(0).max(1).default(0),
});

export type CropRect = z.infer<typeof CropRectSchema>;

/**
 * Base CanvasEntity schema
 *
 * @remarks
 * All canvas entities extend this base schema. Entity positions are ALWAYS
 * stored in canvas space, never screen space.
 */
export const CanvasEntityBaseSchema = z.object({
  /** Unique entity identifier */
  id: z.string().uuid(),
  /** Entity type discriminator */
  type: CanvasEntityTypeSchema,
  /** Canvas this entity belongs to */
  canvasId: z.string().uuid(),
  /** 2D transform (position, size, rotation, scale) */
  transform: Transform2DSchema,
  /**
   * Optional 3D transform for spatial/VR positioning.
   * When present, entity can be placed in 3D space.
   */
  spatialTransform: Transform3DSchema.optional(),
  /**
   * Per-platform 2D transforms for responsive positioning.
   * Web uses the `transform` field directly. Mobile/desktop overrides live here.
   * Falls back to `transform` when a platform key is not present.
   */
  platformTransforms: z.record(z.string(), Transform2DSchema).optional(),
  /**
   * When true, 2D position changes project to spatialTransform and vice versa.
   * When false, 2D and 3D positions are independent.
   */
  syncTransform2d3d: z.boolean().default(true),
  /** Z-order index (higher = in front) */
  zIndex: z.number().int(),
  /** Whether entity is visible */
  visible: z.boolean().default(true),
  /** Which canvas types this entity should appear in */
  canvasVisibility: z.enum(["2d", "3d", "both"]).default("both"),
  /** Whether entity is locked from editing */
  locked: z.boolean().default(false),
  /** Whether entity is flipped horizontally */
  flipH: z.boolean().default(false),
  /** Whether entity is flipped vertically */
  flipV: z.boolean().default(false),
  /** Opacity (0 = fully transparent, 1 = fully opaque) */
  opacity: z.number().min(0).max(1).default(1),
  /** Border radius in canvas units */
  borderRadius: z.number().nonnegative().default(0),
  /** Optional crop rectangle — percentage-based edge insets */
  cropRect: CropRectSchema.optional(),
  /** Parent group/docker ID — set when entity is a child of a group */
  parentId: z.string().uuid().optional(),
  /** Optional name for layers panel */
  name: z.string().optional(),
  /** Animation configuration (clips, triggers, states) */
  animations: EntityAnimationConfigSchema.optional(),
  /** Creation timestamp */
  createdAt: z.string().datetime(),
  /** Last update timestamp */
  updatedAt: z.string().datetime(),
  /** User who created this entity */
  createdBy: z.string().uuid(),
});

export type CanvasEntityBase = z.infer<typeof CanvasEntityBaseSchema>;

/**
 * Sticker click action type enum.
 *
 * @remarks
 * Defines what happens when a sticker is clicked:
 * - `none` - No action, sticker is purely decorative
 * - `open-url` - Opens a URL in a new tab
 * - `launch-widget` - Launches/creates a widget on the canvas
 * - `emit-event` - Emits a custom bus event for pipeline integration
 */
export const StickerClickActionTypeSchema = z.enum([
  "none",
  "open-url",
  "launch-widget",
  "emit-event",
]);

export type StickerClickActionType = z.infer<
  typeof StickerClickActionTypeSchema
>;

/**
 * Sticker click action schema — defines behavior when sticker is clicked.
 */
export const StickerClickActionSchema = z.object({
  /** Action type */
  type: StickerClickActionTypeSchema.default("none"),
  /** URL to open (for 'open-url' action) */
  url: z.string().url().optional(),
  /** Whether to open URL in new tab (default: true) */
  urlNewTab: z.boolean().default(true),
  /** Widget ID to launch (for 'launch-widget' action) */
  widgetId: z.string().optional(),
  /** Widget configuration to apply when launching */
  widgetConfig: z.record(z.string(), z.unknown()).optional(),
  /** Bus event type to emit (for 'emit-event' action) */
  eventType: z.string().optional(),
  /** Custom payload data for the emitted event */
  eventPayload: z.record(z.string(), z.unknown()).optional(),
});

export type StickerClickAction = z.infer<typeof StickerClickActionSchema>;

/**
 * Sticker entity schema
 *
 * @remarks
 * Stickers are visual assets that can act as interactive buttons on the canvas.
 * They can launch widgets, open URLs, or emit events when clicked.
 */
export const StickerEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("sticker"),
  /** Asset URL (proxied, never direct bucket URL) */
  assetUrl: z.string().url(),
  /** Asset type */
  assetType: z.enum(["image", "gif", "video"]),
  /** Alt text for accessibility */
  altText: z.string().optional(),
  /** Aspect ratio lock */
  aspectLocked: z.boolean().default(true),
  /** Click action configuration */
  clickAction: StickerClickActionSchema.optional(),
  /** Hover effect style */
  hoverEffect: z.enum(["none", "scale", "glow", "opacity"]).default("none"),
});

export type StickerEntity = z.infer<typeof StickerEntitySchema>;

/**
 * Lottie animation entity schema
 */
export const LottieEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("lottie"),
  /** URL to the .lottie or .json animation file */
  assetUrl: z.string().url(),
  /** Whether animation loops */
  loop: z.boolean().default(true),
  /** Playback speed multiplier (1.0 = normal) */
  speed: z.number().positive().default(1),
  /** Playback direction: 1 = forward, -1 = reverse */
  direction: z.number().int().min(-1).max(1).default(1),
  /** Whether animation starts playing immediately */
  autoplay: z.boolean().default(true),
  /** Alt text for accessibility */
  altText: z.string().optional(),
  /** Aspect ratio lock */
  aspectLocked: z.boolean().default(true),
});

export type LottieEntity = z.infer<typeof LottieEntitySchema>;

/**
 * Text entity schema
 */
export const TextEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("text"),
  /** Text content (may include basic formatting) */
  content: z.string(),
  /** Font family */
  fontFamily: z.string().default("system-ui"),
  /** Font size in canvas units */
  fontSize: z.number().positive().default(16),
  /** Font weight */
  fontWeight: z.number().int().min(100).max(900).default(400),
  /** Text color */
  color: z.string().default("#000000"),
  /** Text alignment */
  textAlign: z.enum(["left", "center", "right"]).default("left"),
});

export type TextEntity = z.infer<typeof TextEntitySchema>;

// =============================================================================
// Widget Extension Schemas (backwards compatible - all optional)
// =============================================================================

/**
 * Widget intrinsic size - the natural dimensions of the widget content
 *
 * @remarks
 * Used to calculate aspect ratio for proportional scaling and to determine
 * when scrollbars are needed in fit mode.
 */
export const WidgetIntrinsicSizeSchema = z.object({
  /** Natural width in pixels */
  width: z.number().positive(),
  /** Natural height in pixels */
  height: z.number().positive(),
});

export type WidgetIntrinsicSize = z.infer<typeof WidgetIntrinsicSizeSchema>;

/**
 * Widget scaling mode
 *
 * @remarks
 * Controls how the widget content scales within its container:
 * - `proportional`: Maintains aspect ratio, scales to fit container
 * - `orientation`: Scales differently for portrait vs landscape containers
 * - `fit`: Content at natural size with scrollbars if needed
 */
export const WidgetScalingModeSchema = z.enum([
  "proportional",
  "orientation",
  "fit",
]);

export type WidgetScalingMode = z.infer<typeof WidgetScalingModeSchema>;

/**
 * Widget crop configuration
 *
 * @remarks
 * Allows displaying a portion of the widget content. The rect defines
 * the visible area in the widget's intrinsic coordinate space.
 */
export const WidgetCropConfigSchema = z.object({
  /** Whether cropping is enabled */
  enabled: z.boolean().default(false),
  /**
   * Crop rectangle in widget intrinsic coordinates.
   * min is the top-left corner; max is the bottom-right corner of the visible area.
   */
  rect: BoundingBox2DSchema.optional(),
});

export type WidgetCropConfig = z.infer<typeof WidgetCropConfigSchema>;

/**
 * Widget container entity schema
 */
export const WidgetContainerEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("widget"),
  /** Widget instance ID */
  widgetInstanceId: z.string().uuid(),
  /** Widget definition ID (from marketplace/registry) */
  widgetId: z.string(),
  /** Widget configuration (shape defined by widget manifest) */
  config: z.record(z.string(), z.unknown()).default({}),
  /**
   * Widget intrinsic size for aspect ratio calculations.
   * Optional - widgets without this use container dimensions directly.
   */
  intrinsicSize: WidgetIntrinsicSizeSchema.optional(),
  /**
   * Scaling mode for widget content.
   * Optional - defaults to proportional scaling when intrinsicSize is set.
   */
  scalingMode: WidgetScalingModeSchema.optional(),
  /**
   * Crop configuration for showing a portion of widget content.
   * Optional - no cropping when not specified.
   */
  crop: WidgetCropConfigSchema.optional(),
});

export type WidgetContainerEntity = z.infer<typeof WidgetContainerEntitySchema>;

/**
 * Shape type enum
 */
export const ShapeTypeSchema = z.enum([
  "rectangle",
  "ellipse",
  "line",
  "polygon",
]);

/**
 * Shape entity schema
 */
export const ShapeEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("shape"),
  /** Shape sub-type */
  shapeType: ShapeTypeSchema,
  /** Fill color (null for transparent) */
  fill: z.string().nullable().default(null),
  /** Stroke color */
  stroke: z.string().default("#000000"),
  /** Stroke width */
  strokeWidth: z.number().nonnegative().default(1),
  /** Corner radius for rectangles */
  cornerRadius: z.number().nonnegative().default(0),
  /** Polygon points (for polygon shape type) */
  points: z.array(Point2DSchema).optional(),
});

export type ShapeEntity = z.infer<typeof ShapeEntitySchema>;

/**
 * Drawing (pen stroke) entity schema
 */
export const DrawingEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("drawing"),
  /** Path points */
  points: z.array(Point2DSchema),
  /** Stroke color */
  stroke: z.string().default("#000000"),
  /** Stroke width */
  strokeWidth: z.number().positive().default(2),
  /** Smoothing factor */
  smoothing: z.number().min(0).max(1).default(0.5),
});

export type DrawingEntity = z.infer<typeof DrawingEntitySchema>;

/**
 * Group entity schema
 */
export const GroupEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("group"),
  /** Child entity IDs */
  children: z.array(z.string().uuid()),
});

export type GroupEntity = z.infer<typeof GroupEntitySchema>;

/**
 * Docker (container widget) entity schema
 */
export const DockerEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("docker"),
  /** Child widget instance IDs */
  children: z.array(z.string().uuid()),
  /** Layout mode */
  layout: z.enum(["free", "stack", "grid", "folder"]).default("free"),
  /** Optional Widget definition ID if this docker uses a custom widget renderer */
  widgetId: z.string().optional(),
  /** Widget configuration if widgetId is provided */
  config: z.record(z.string(), z.unknown()).default({}),
});

export type DockerEntity = z.infer<typeof DockerEntitySchema>;

/**
 * Audio entity schema
 */
export const AudioEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("audio"),
  /** URL to the audio file (proxied, never direct bucket URL) */
  assetUrl: z.string().url(),
  /** Whether audio starts playing immediately */
  autoplay: z.boolean().default(false),
  /** Whether audio loops */
  loop: z.boolean().default(false),
  /** Volume (0 = muted, 1 = full) */
  volume: z.number().min(0).max(1).default(1),
  /** Waveform visualization color */
  waveformColor: z.string().optional(),
  /** Alt text for accessibility */
  altText: z.string().optional(),
});

export type AudioEntity = z.infer<typeof AudioEntitySchema>;

/**
 * SVG vector graphic entity schema
 */
export const SvgEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("svg"),
  /** Raw SVG markup (sanitized before rendering) */
  svgContent: z.string(),
  /** Optional URL to load SVG from */
  assetUrl: z.string().url().optional(),
  /** Override fill color */
  fill: z.string().optional(),
  /** Override stroke color */
  stroke: z.string().optional(),
  /** Alt text for accessibility */
  altText: z.string().optional(),
  /** Aspect ratio lock */
  aspectLocked: z.boolean().default(true),
});

export type SvgEntity = z.infer<typeof SvgEntitySchema>;

/**
 * Path entity schema — Bezier path with configurable fill and stroke.
 *
 * @remarks
 * Anchor positions are stored in **entity-local coordinates** (relative to
 * `transform.position`). The entity's bounding box (`transform.position` +
 * `transform.size`) encompasses all anchors and their control handles.
 */
export const PathEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("path"),
  /** Ordered list of anchor points defining the path */
  anchors: z.array(AnchorPointSchema).min(1),
  /** Whether the path is closed (last anchor connects back to first) */
  closed: z.boolean().default(false),
  /** Fill color (null for no fill / transparent) */
  fill: z.string().nullable().default(null),
  /** SVG fill-rule for complex/self-intersecting paths */
  fillRule: PathFillRuleSchema.default("nonzero"),
  /** Stroke color */
  stroke: z.string().default("#000000"),
  /** Stroke width in canvas units */
  strokeWidth: z.number().nonnegative().default(2),
  /** Stroke line cap style */
  strokeLinecap: z.enum(["butt", "round", "square"]).default("round"),
  /** Stroke line join style */
  strokeLinejoin: z.enum(["miter", "round", "bevel"]).default("round"),
  /** SVG stroke-dasharray for dashed/dotted lines */
  strokeDasharray: z.string().optional(),
});

export type PathEntity = z.infer<typeof PathEntitySchema>;

/**
 * 3D Object entity schema
 */
export const Object3DEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("object3d"),
  /** Asset URL for 3D model (GLTF/GLB) */
  assetUrl: z.string().url().optional(),
  /** Basic primitive type if no assetUrl */
  primitive: z.enum(["box", "sphere", "cylinder", "plane"]).default("box"),
  /** Color of primitive */
  color: z.string().default("#cccccc"),
});

export type Object3DEntity = z.infer<typeof Object3DEntitySchema>;

/**
 * Artboard entity schema
 */
export const ArtboardEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("artboard"),
  /** Child entity IDs specifically for this artboard */
  children: z.array(z.string().uuid()).default([]),
  /** Device preset name (e.g., 'iPhone 15', 'Pixel 8') */
  devicePreset: z.string().optional(),
  /** Linked canvas document ID */
  childCanvasId: z.string().uuid().optional(),
  /** Linked canvas document slug */
  childCanvasSlug: z.string().optional(),
});

export type ArtboardEntity = z.infer<typeof ArtboardEntitySchema>;

/**
 * Folder entity schema for desktop experience
 */
export const FolderEntitySchema = CanvasEntityBaseSchema.extend({
  type: z.literal("folder"),
  /** Child entity IDs (files, shortcuts, or other folders) */
  children: z.array(z.string().uuid()).default([]),
  /** Icon asset URL */
  iconUrl: z.string().url().optional(),
});

export type FolderEntity = z.infer<typeof FolderEntitySchema>;

/**
 * Union of all entity types
 */
export const CanvasEntitySchema = z.discriminatedUnion("type", [
  StickerEntitySchema,
  LottieEntitySchema,
  TextEntitySchema,
  WidgetContainerEntitySchema,
  ShapeEntitySchema,
  DrawingEntitySchema,
  GroupEntitySchema,
  DockerEntitySchema,
  AudioEntitySchema,
  SvgEntitySchema,
  PathEntitySchema,
  Object3DEntitySchema,
  ArtboardEntitySchema,
  FolderEntitySchema,
]);

export type CanvasEntity = z.infer<typeof CanvasEntitySchema>;

/**
 * JSON Schema exports for external validation
 */
export const CropRectJSONSchema = CropRectSchema.toJSONSchema();
export const CanvasEntityBaseJSONSchema = CanvasEntityBaseSchema.toJSONSchema();
export const LottieEntityJSONSchema = LottieEntitySchema.toJSONSchema();
export const AudioEntityJSONSchema = AudioEntitySchema.toJSONSchema();
export const SvgEntityJSONSchema = SvgEntitySchema.toJSONSchema();
export const PathEntityJSONSchema = PathEntitySchema.toJSONSchema();
export const ArtboardEntityJSONSchema = ArtboardEntitySchema.toJSONSchema();
export const FolderEntityJSONSchema = FolderEntitySchema.toJSONSchema();
export const CanvasEntityJSONSchema = CanvasEntitySchema.toJSONSchema();
export const WidgetIntrinsicSizeJSONSchema =
  WidgetIntrinsicSizeSchema.toJSONSchema();
export const WidgetScalingModeJSONSchema =
  WidgetScalingModeSchema.toJSONSchema();
export const WidgetCropConfigJSONSchema = WidgetCropConfigSchema.toJSONSchema();
export const WidgetContainerEntityJSONSchema =
  WidgetContainerEntitySchema.toJSONSchema();
