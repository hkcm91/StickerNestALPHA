/**
 * StickerNest Capture Pipeline — Type Definitions
 *
 * @packageDocumentation
 * @module stickernest-capture
 *
 * @remarks
 * Zod schemas defining the capture script format and output manifest.
 * These schemas are the central contract: the Demo agent writes scripts
 * conforming to CaptureScriptSchema, and the CaptureRunner produces
 * results conforming to CaptureResultSchema.
 */

import { z } from 'zod';

// =============================================================================
// Action Schemas — What the browser does at each step
// =============================================================================

export const NavigateActionSchema = z.object({
  type: z.literal('navigate'),
  url: z.string().url(),
});

export const ClickActionSchema = z.object({
  type: z.literal('click'),
  selector: z.string(),
  button: z.enum(['left', 'right', 'middle']).default('left'),
  clickCount: z.number().int().min(1).max(3).default(1),
});

export const DragActionSchema = z.object({
  type: z.literal('drag'),
  from: z.object({ x: z.number(), y: z.number() }),
  to: z.object({ x: z.number(), y: z.number() }),
  steps: z.number().int().min(1).default(10),
});

export const TypeActionSchema = z.object({
  type: z.literal('type'),
  selector: z.string(),
  text: z.string(),
  delay: z.number().min(0).default(50),
});

export const ScrollActionSchema = z.object({
  type: z.literal('scroll'),
  deltaX: z.number().default(0),
  deltaY: z.number().default(0),
});

export const WaitActionSchema = z.object({
  type: z.literal('wait'),
  ms: z.number().int().min(0).max(30000),
});

export const WaitForSelectorActionSchema = z.object({
  type: z.literal('waitForSelector'),
  selector: z.string(),
  state: z.enum(['visible', 'hidden', 'attached', 'detached']).default('visible'),
  timeout: z.number().int().min(0).max(30000).default(5000),
});

export const ViewportActionSchema = z.object({
  type: z.literal('viewport'),
  width: z.number().int().min(320).max(3840),
  height: z.number().int().min(240).max(2160),
});

export const KeyboardActionSchema = z.object({
  type: z.literal('keyboard'),
  key: z.string(),
  modifiers: z.array(z.enum(['Shift', 'Control', 'Alt', 'Meta'])).default([]),
});

export const HoverActionSchema = z.object({
  type: z.literal('hover'),
  selector: z.string(),
});

export const EvalActionSchema = z.object({
  type: z.literal('eval'),
  script: z.string(),
});

/** Union of all possible browser actions */
export const ActionSchema = z.discriminatedUnion('type', [
  NavigateActionSchema,
  ClickActionSchema,
  DragActionSchema,
  TypeActionSchema,
  ScrollActionSchema,
  WaitActionSchema,
  WaitForSelectorActionSchema,
  ViewportActionSchema,
  KeyboardActionSchema,
  HoverActionSchema,
  EvalActionSchema,
]);

export type Action = z.infer<typeof ActionSchema>;

// =============================================================================
// Capture Config — What to capture at each step
// =============================================================================

export const CaptureConfigSchema = z.object({
  /** Take a PNG screenshot after this step */
  screenshot: z.boolean().default(true),
  /** Record video during this step (until next step begins) */
  video: z.boolean().default(false),
  /** Capture a GIF segment during this step */
  gif: z.boolean().default(false),
  /** GIF duration in ms (only used when gif: true) */
  gifDuration: z.number().int().min(500).max(15000).default(3000),
  /** GIF framerate (only used when gif: true) */
  gifFps: z.number().int().min(5).max(30).default(10),
  /** Ms to wait after action completes before capturing */
  settleDelay: z.number().int().min(0).max(5000).default(500),
  /** Text annotation to overlay on the screenshot */
  annotation: z.string().optional(),
  /** Region to focus on (crop). If omitted, captures full viewport */
  clip: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});

export type CaptureConfig = z.infer<typeof CaptureConfigSchema>;

// =============================================================================
// Capture Step — One action + what to capture
// =============================================================================

export const CaptureStepSchema = z.object({
  /** Unique step identifier */
  id: z.string().regex(/^[a-z0-9-]+$/, 'Step ID must be lowercase alphanumeric with hyphens'),
  /** Human-readable label shown in output manifest */
  label: z.string().min(1).max(200),
  /** The browser action to perform */
  action: ActionSchema,
  /** What to capture after the action */
  capture: CaptureConfigSchema.default({
    screenshot: true,
    video: false,
    gif: false,
    gifDuration: 3000,
    gifFps: 10,
    settleDelay: 500,
  }),
  /** Narration script text for this step (used by Stage 2 video composition) */
  narration: z.string().optional(),
});

export type CaptureStep = z.infer<typeof CaptureStepSchema>;

// =============================================================================
// Capture Script — The full demo script
// =============================================================================

export const CaptureScriptSchema = z.object({
  /** Script name (used for output directory naming) */
  name: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Script name must be lowercase alphanumeric with hyphens'),
  /** Feature being demonstrated */
  feature: z.string().min(1),
  /** Target audience for this demo */
  audience: z.enum(['creator', 'developer', 'investor']).default('creator'),
  /** Capture target configuration */
  target: z
    .object({
      /** Base URL to navigate to */
      baseUrl: z.string().url().default('http://localhost:5173/StickerNest5.0/'),
      /** Browser viewport size */
      viewport: z
        .object({
          width: z.number().int().min(320).max(3840).default(1920),
          height: z.number().int().min(240).max(2160).default(1080),
        })
        .default({ width: 1920, height: 1080 }),
      /** Device scale factor */
      deviceScaleFactor: z.number().min(1).max(3).default(2),
    })
    .default({
      baseUrl: 'http://localhost:5173/StickerNest5.0/',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
    }),
  /** Setup steps — executed before demo, no captures taken */
  setup: z.array(CaptureStepSchema).default([]),
  /** Demo steps — the actual demonstration with captures */
  steps: z.array(CaptureStepSchema).min(1, 'At least one demo step is required'),
  /** Metadata for video composition (Stage 2) */
  metadata: z.object({
    /** Opening hook text (first 3-5 seconds) */
    hook: z.string().min(1),
    /** Closing call-to-action */
    cta: z.string().min(1),
    /** Social media tags */
    tags: z.array(z.string()).default([]),
    /** Brief description for video metadata */
    description: z.string().optional(),
  }),
});

export type CaptureScript = z.infer<typeof CaptureScriptSchema>;

// =============================================================================
// Capture Result — Output manifest from a capture run
// =============================================================================

export const ScreenshotResultSchema = z.object({
  stepId: z.string(),
  label: z.string(),
  /** Relative path to the PNG file from the output directory */
  path: z.string(),
  /** Milliseconds from capture start */
  timestamp: z.number(),
  /** Annotation text if provided */
  annotation: z.string().optional(),
  /** Narration text for this step */
  narration: z.string().optional(),
});

export type ScreenshotResult = z.infer<typeof ScreenshotResultSchema>;

export const RecordingResultSchema = z.object({
  stepId: z.string(),
  label: z.string(),
  /** Relative path to the video file from the output directory */
  path: z.string(),
  /** Start time in ms from capture start */
  startMs: z.number(),
  /** End time in ms from capture start */
  endMs: z.number(),
  /** Narration text for this step */
  narration: z.string().optional(),
});

export type RecordingResult = z.infer<typeof RecordingResultSchema>;

export const GifResultSchema = z.object({
  stepId: z.string(),
  label: z.string(),
  /** Relative path to the GIF file from the output directory */
  path: z.string(),
  /** Duration of the GIF in ms */
  durationMs: z.number(),
});

export type GifResult = z.infer<typeof GifResultSchema>;

export const CaptureResultSchema = z.object({
  /** Script name */
  scriptName: z.string(),
  /** Feature that was demonstrated */
  feature: z.string(),
  /** Audience the demo targets */
  audience: z.string(),
  /** All captured screenshots */
  screenshots: z.array(ScreenshotResultSchema),
  /** All captured video recordings */
  recordings: z.array(RecordingResultSchema),
  /** All captured GIF segments */
  gifs: z.array(GifResultSchema),
  /** Total capture session duration in ms */
  totalDurationMs: z.number(),
  /** ISO timestamp of when the capture started */
  capturedAt: z.string().datetime(),
  /** The original capture script metadata */
  metadata: z.object({
    hook: z.string(),
    cta: z.string(),
    tags: z.array(z.string()),
    description: z.string().optional(),
  }),
  /** Target URL that was captured */
  targetUrl: z.string(),
  /** Viewport dimensions used */
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }),
});

export type CaptureResult = z.infer<typeof CaptureResultSchema>;
