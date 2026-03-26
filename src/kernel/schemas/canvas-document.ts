/**
 * Canvas Document schemas for persistence and serialization
 * @module @sn/types/canvas-document
 */

import { z } from 'zod';

import { CanvasEntitySchema } from './canvas-entity';
import { SpatialModeSchema } from './spatial';
import { ThemeNameSchema } from './theme';

// =============================================================================
// Background Specification (Discriminated Union)
// =============================================================================

/**
 * Solid color background
 */
export const SolidBackgroundSchema = z.object({
  type: z.literal('solid'),
  /** CSS color value (hex, rgb, hsl, etc.) */
  color: z.string().default('#ffffff'),
  /** Opacity from 0 to 1 */
  opacity: z.number().min(0).max(1).default(1),
});

export type SolidBackground = z.infer<typeof SolidBackgroundSchema>;

/**
 * Gradient color stop
 */
export const GradientStopSchema = z.object({
  /** Position in gradient (0-1) */
  offset: z.number().min(0).max(1),
  /** CSS color value */
  color: z.string(),
});

export type GradientStop = z.infer<typeof GradientStopSchema>;

/**
 * Gradient type
 */
export const GradientTypeSchema = z.enum(['linear', 'radial']);

export type GradientType = z.infer<typeof GradientTypeSchema>;

/**
 * Gradient background
 */
export const GradientBackgroundSchema = z.object({
  type: z.literal('gradient'),
  /** Gradient type (linear or radial) */
  gradientType: GradientTypeSchema.default('linear'),
  /** Array of color stops (min 2) */
  stops: z.array(GradientStopSchema).min(2),
  /** Angle in degrees (0 = right, 90 = down) — used for linear gradients */
  angle: z.number().default(0),
  /** Opacity from 0 to 1 */
  opacity: z.number().min(0).max(1).default(1),
});

export type GradientBackground = z.infer<typeof GradientBackgroundSchema>;

/**
 * Image background display mode
 */
export const ImageBackgroundModeSchema = z.enum(['cover', 'contain', 'tile']);

export type ImageBackgroundMode = z.infer<typeof ImageBackgroundModeSchema>;

/**
 * Image background
 */
export const ImageBackgroundSchema = z.object({
  type: z.literal('image'),
  /** URL to background image (proxied) */
  url: z.string().url(),
  /** How to display the image */
  mode: ImageBackgroundModeSchema.default('cover'),
  /** Opacity from 0 to 1 */
  opacity: z.number().min(0).max(1).default(1),
});

export type ImageBackground = z.infer<typeof ImageBackgroundSchema>;

/**
 * Background specification - discriminated union
 */
export const BackgroundSpecSchema = z.discriminatedUnion('type', [
  SolidBackgroundSchema,
  GradientBackgroundSchema,
  ImageBackgroundSchema,
]);

export type BackgroundSpec = z.infer<typeof BackgroundSpecSchema>;

/**
 * Default background (white solid)
 */
export const DEFAULT_BACKGROUND: BackgroundSpec = {
  type: 'solid',
  color: '#ffffff',
  opacity: 1,
};

// =============================================================================
// Canvas Viewport Configuration
// =============================================================================

/**
 * Viewport configuration for canvas document
 */
export const ViewportConfigSchema = z.object({
  /** Fixed width in canvas units (optional - infinite if not set) */
  width: z.number().positive().optional(),
  /** Fixed height in canvas units (optional - infinite if not set) */
  height: z.number().positive().optional(),
  /** Background specification */
  background: BackgroundSpecSchema.default(DEFAULT_BACKGROUND),
  /** Whether the viewport is in preview mode (showing one artboard) */
  isPreviewMode: z.boolean().optional(),
  /** Canvas size mode: 'infinite' fills workspace, 'bounded' renders as artboard */
  sizeMode: z.enum(['infinite', 'bounded']).default('infinite'),
});

export type ViewportConfig = z.infer<typeof ViewportConfigSchema>;

// =============================================================================
// Canvas Platform
// =============================================================================

/**
 * Target platform for the canvas.
 * - `web`: Standard web browser view
 * - `mobile`: Mobile device view
 * - `desktop`: Personal computer desktop experience
 */
export const CanvasPlatformSchema = z.enum(['web', 'mobile', 'desktop']);

export type CanvasPlatform = z.infer<typeof CanvasPlatformSchema>;

// =============================================================================
// Layout Mode
// =============================================================================

/**
 * Canvas layout mode
 * - freeform: No constraints, entities can be placed anywhere
 * - bento: Grid slot constraints
 * - desktop: Window/docking constraints
 * - artboard: Multiple artboards (pages) layout
 */
export const LayoutModeSchema = z.enum(['freeform', 'bento', 'desktop', 'artboard']);

export type LayoutMode = z.infer<typeof LayoutModeSchema>;

// =============================================================================
// Canvas Document Metadata
// =============================================================================

/**
 * Canvas document metadata
 */
export const CanvasDocumentMetaSchema = z.object({
  /** Unique document ID */
  id: z.string().uuid(),
  /** Document name */
  name: z.string().min(1),
  /** Creation timestamp (ISO 8601) */
  createdAt: z.string().datetime(),
  /** Last update timestamp (ISO 8601) */
  updatedAt: z.string().datetime(),
  /** Optional description */
  description: z.string().optional(),
  /** Optional thumbnail URL */
  thumbnailUrl: z.string().url().optional(),
});

export type CanvasDocumentMeta = z.infer<typeof CanvasDocumentMetaSchema>;

// =============================================================================
// Canvas Document
// =============================================================================

/**
 * Current document version for migrations
 */
export const CANVAS_DOCUMENT_VERSION = 1;

/**
 * Canvas Document - the complete serialized state of a canvas
 *
 * @remarks
 * This is the top-level schema for persisting and loading canvas state.
 * It contains all entities, viewport configuration, layout mode, and metadata.
 *
 * The version field enables migrations when the schema changes.
 */
/**
 * Canvas position alignment configuration
 */
export const CanvasPositionConfigSchema = z.object({
  horizontal: z.enum(['left', 'center', 'right']).default('center'),
  vertical: z.enum(['top', 'center', 'bottom']).default('center'),
  topOffset: z.number().default(40),
});

export type CanvasPositionConfig = z.infer<typeof CanvasPositionConfigSchema>;

export const CanvasDocumentSchema = z.object({
  /** Schema version for migrations */
  version: z.number().int().positive().default(CANVAS_DOCUMENT_VERSION),
  /** Document metadata */
  meta: CanvasDocumentMetaSchema,
  /** Viewport configuration (dimensions and background) */
  viewport: ViewportConfigSchema.default({
    background: DEFAULT_BACKGROUND,
    sizeMode: 'infinite' as const,
    isPreviewMode: false,
  }),
  /** Configurations per platform (width/height) */
  platformConfigs: z.record(z.string(), ViewportConfigSchema).optional(),
  /** All entities on the canvas */
  entities: z.array(CanvasEntitySchema).default([]),
  /** Layout mode for entity positioning */
  layoutMode: LayoutModeSchema.default('freeform'),
  /** Target platform for the canvas */
  platform: CanvasPlatformSchema.default('web'),
  /** Spatial visualization mode */
  spatialMode: SpatialModeSchema.default('2d'),
  /** Canvas border radius in pixels */
  borderRadius: z.number().optional(),
  /** Canvas position/alignment configuration */
  canvasPosition: CanvasPositionConfigSchema.optional(),
  /** Per-canvas theme override — falls back to global uiStore.theme when not set */
  theme: ThemeNameSchema.optional(),
});

export type CanvasDocument = z.infer<typeof CanvasDocumentSchema>;

// =============================================================================
// Helper Types
// =============================================================================

/**
 * Input type for creating a new canvas document
 */
export const CreateCanvasDocumentInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  viewport: ViewportConfigSchema.optional(),
  layoutMode: LayoutModeSchema.optional(),
  platform: CanvasPlatformSchema.optional(),
  spatialMode: SpatialModeSchema.optional(),
});

export type CreateCanvasDocumentInput = z.infer<typeof CreateCanvasDocumentInputSchema>;

/**
 * Input type for updating canvas document metadata
 */
export const UpdateCanvasDocumentInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  viewport: ViewportConfigSchema.partial().optional(),
  layoutMode: LayoutModeSchema.optional(),
  platform: CanvasPlatformSchema.optional(),
  spatialMode: SpatialModeSchema.optional(),
});

export type UpdateCanvasDocumentInput = z.infer<typeof UpdateCanvasDocumentInputSchema>;

// =============================================================================
// JSON Schema Exports
// =============================================================================

export const BackgroundSpecJSONSchema = BackgroundSpecSchema.toJSONSchema();
export const ViewportConfigJSONSchema = ViewportConfigSchema.toJSONSchema();
export const LayoutModeJSONSchema = LayoutModeSchema.toJSONSchema();
export const CanvasPlatformJSONSchema = CanvasPlatformSchema.toJSONSchema();
export const CanvasDocumentMetaJSONSchema = CanvasDocumentMetaSchema.toJSONSchema();
export const CanvasDocumentJSONSchema = CanvasDocumentSchema.toJSONSchema();
