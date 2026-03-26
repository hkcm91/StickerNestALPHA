/**
 * Entity Animation schemas — declarative, trigger-based animation system
 *
 * @module @sn/types/entity-animation
 *
 * @remarks
 * Defines the data model for canvas entity animations:
 * - AnimationKeyframe: property values at a point in time (0-1 offset)
 * - AnimationClip: a named, reusable animation with keyframes + timing
 * - AnimationTrigger: what causes an animation to fire (click, hover, timer, etc.)
 * - AnimationBinding: connects a trigger to a clip on an entity
 * - AnimationState: named state for state-machine patterns (light on/off)
 * - EntityAnimationConfig: top-level config stored on CanvasEntityBase
 *
 * All types here are pure data — no runtime behavior. The orchestrator system
 * in `src/kernel/systems/` compiles these into tweens at runtime.
 */

import { z } from 'zod';

// =============================================================================
// Animatable Properties
// =============================================================================

/**
 * Animatable property values at a specific point in time.
 *
 * @remarks
 * Position values are relative offsets from the entity's base position,
 * not absolute canvas coordinates. This allows animations to work
 * regardless of where the entity is placed.
 *
 * Color properties are stored as hex strings and interpolated via HSL
 * at runtime for perceptually smooth transitions.
 */
export const AnimatablePropertiesSchema = z.object({
  /** Opacity (0 = transparent, 1 = opaque) */
  opacity: z.number().min(0).max(1).optional(),
  /** Horizontal scale multiplier */
  scaleX: z.number().optional(),
  /** Vertical scale multiplier */
  scaleY: z.number().optional(),
  /** Rotation in degrees */
  rotation: z.number().optional(),
  /** Horizontal position offset from base (canvas units) */
  positionX: z.number().optional(),
  /** Vertical position offset from base (canvas units) */
  positionY: z.number().optional(),
  /** Border radius in canvas units */
  borderRadius: z.number().nonnegative().optional(),
  /** Width (canvas units) */
  width: z.number().positive().optional(),
  /** Height (canvas units) */
  height: z.number().positive().optional(),
  /** Fill color (hex string, for shapes/paths) */
  fill: z.string().optional(),
  /** Stroke color (hex string, for shapes/paths) */
  stroke: z.string().optional(),
  /** Text/foreground color (hex string) */
  color: z.string().optional(),
  /** Stroke width (canvas units) */
  strokeWidth: z.number().nonnegative().optional(),
  /** Font size (canvas units, for text entities) */
  fontSize: z.number().positive().optional(),
});

export type AnimatableProperties = z.infer<typeof AnimatablePropertiesSchema>;

// =============================================================================
// Easing Names
// =============================================================================

/**
 * Named easing functions available for keyframes.
 * Maps to the Easing registry in `src/kernel/systems/animation-system.ts`.
 */
export const EasingNameSchema = z.enum([
  'linear',
  'easeInQuad',
  'easeOutQuad',
  'easeInOutQuad',
  'easeInCubic',
  'easeOutCubic',
  'easeInOutCubic',
  'easeInElastic',
  'easeOutElastic',
  'easeInBounce',
  'easeOutBounce',
]);

export type EasingName = z.infer<typeof EasingNameSchema>;

// =============================================================================
// Keyframe
// =============================================================================

/**
 * A single keyframe — property values at a specific point in the timeline.
 *
 * @remarks
 * Offset 0 = start of the animation, 1 = end.
 * Only properties present in the keyframe are animated; absent properties
 * are not affected. The easing applies from the previous keyframe to this one.
 */
export const AnimationKeyframeSchema = z.object({
  /** Position in timeline (0 = start, 1 = end) */
  offset: z.number().min(0).max(1),
  /** Animatable property values at this point */
  properties: AnimatablePropertiesSchema,
  /** Easing applied from previous keyframe to this one (default: linear) */
  easing: EasingNameSchema.default('linear'),
});

export type AnimationKeyframe = z.infer<typeof AnimationKeyframeSchema>;

// =============================================================================
// Animation Clip
// =============================================================================

/**
 * Fill mode — determines how the animation affects the entity before/after playback.
 * Mirrors CSS animation-fill-mode behavior.
 */
export const AnimationFillModeSchema = z.enum([
  'none',       // Revert to base values when animation ends
  'forwards',   // Retain final keyframe values after animation ends
  'backwards',  // Apply first keyframe values during delay period
  'both',       // Apply both forwards and backwards behavior
]);

export type AnimationFillMode = z.infer<typeof AnimationFillModeSchema>;

/**
 * An animation clip — a named, reusable animation definition.
 *
 * @remarks
 * A clip contains keyframes (at least 2) that define how properties change
 * over time. Clips are referenced by ID from AnimationBindings and AnimationStates.
 * They can be shared as presets.
 */
export const AnimationClipSchema = z.object({
  /** Unique clip identifier */
  id: z.string().uuid(),
  /** User-facing name (e.g., "Pulse", "Slide In Left") */
  name: z.string().default('Untitled Animation'),
  /** Keyframes defining the animation (minimum 2: start and end) */
  keyframes: z.array(AnimationKeyframeSchema).min(2),
  /** Duration in seconds */
  duration: z.number().positive(),
  /** Delay before starting in seconds (default: 0) */
  delay: z.number().nonnegative().default(0),
  /** Repeat count: -1 = infinite, 0 = no repeat (default: 0) */
  repeat: z.number().int().min(-1).default(0),
  /** Reverse direction on repeat (yoyo effect, default: false) */
  yoyo: z.boolean().default(false),
  /** How animation affects entity before/after playback */
  fillMode: AnimationFillModeSchema.default('none'),
});

export type AnimationClip = z.infer<typeof AnimationClipSchema>;

// =============================================================================
// Animation Trigger
// =============================================================================

/**
 * Trigger types that can fire an animation.
 */
export const AnimationTriggerTypeSchema = z.enum([
  'click',            // Entity is clicked
  'hover-enter',      // Pointer enters entity bounds
  'hover-leave',      // Pointer leaves entity bounds
  'double-click',     // Entity is double-clicked
  'page-load',        // Canvas finishes loading
  'scroll-into-view', // Entity enters the viewport
  'timer',            // Fixed delay after entity load
  'bus-event',        // A specific bus event is emitted
  'state-change',     // Entity transitions to a named state
]);

export type AnimationTriggerType = z.infer<typeof AnimationTriggerTypeSchema>;

/**
 * Animation trigger — defines what causes an animation to fire.
 *
 * @remarks
 * Trigger-specific config fields are optional and only relevant for
 * their respective trigger type. Irrelevant fields are ignored at runtime.
 */
export const AnimationTriggerSchema = z.object({
  /** Trigger type */
  type: AnimationTriggerTypeSchema,
  /** For 'bus-event': the event type to listen for */
  eventType: z.string().optional(),
  /** For 'bus-event': optional payload filter (key-value match) */
  eventFilter: z.record(z.string(), z.unknown()).optional(),
  /** For 'timer': delay in seconds before auto-triggering */
  timerDelay: z.number().positive().optional(),
  /** For 'scroll-into-view': visibility threshold (0-1, default: 0.5) */
  scrollThreshold: z.number().min(0).max(1).optional(),
  /** For 'state-change': the state name to react to */
  stateName: z.string().optional(),
  /** For 'state-change': optional source state (fires only from this state) */
  fromState: z.string().optional(),
});

export type AnimationTrigger = z.infer<typeof AnimationTriggerSchema>;

// =============================================================================
// Animation Binding
// =============================================================================

/**
 * An animation binding — connects a trigger to a clip on a specific entity.
 *
 * @remarks
 * When the trigger fires, the referenced clip plays. Multiple bindings
 * can exist on one entity. Priority determines which fires first when
 * multiple triggers match simultaneously.
 */
export const AnimationBindingSchema = z.object({
  /** Unique binding identifier */
  id: z.string().uuid(),
  /** What triggers this animation */
  trigger: AnimationTriggerSchema,
  /** ID of the AnimationClip to play */
  clipId: z.string().uuid(),
  /** Whether this binding is active (default: true) */
  enabled: z.boolean().default(true),
  /** Priority when multiple bindings match (higher = first, default: 0) */
  priority: z.number().int().default(0),
  /** Optional: state to transition to after animation completes */
  targetState: z.string().optional(),
});

export type AnimationBinding = z.infer<typeof AnimationBindingSchema>;

// =============================================================================
// Animation State (State Machine)
// =============================================================================

/**
 * A named animation state for state-machine patterns.
 *
 * @remarks
 * States enable toggle behaviors (light on/off, expanded/collapsed) and
 * multi-step interaction flows (idle -> hover -> active -> complete).
 *
 * Each state can define:
 * - Property overrides (the "resting pose" for this state)
 * - Enter/exit/loop clips that play during state transitions
 *
 * State transitions happen via AnimationBinding.targetState or
 * the orchestrator's setEntityState() method.
 */
export const AnimationStateSchema = z.object({
  /** Unique state identifier */
  id: z.string().uuid(),
  /** State name (e.g., "off", "on", "hover", "active") */
  name: z.string().min(1),
  /** Clip played when entering this state */
  enterClipId: z.string().uuid().optional(),
  /** Clip played when leaving this state */
  exitClipId: z.string().uuid().optional(),
  /** Clip that loops while in this state */
  loopClipId: z.string().uuid().optional(),
  /** Static property values when resting in this state */
  propertyOverrides: z.record(z.string(), z.number()).optional(),
});

export type AnimationState = z.infer<typeof AnimationStateSchema>;

// =============================================================================
// Entity Animation Config
// =============================================================================

/**
 * Top-level animation configuration stored on a canvas entity.
 *
 * @remarks
 * This is the single field added to CanvasEntityBaseSchema. It contains
 * all animation data: clip definitions, trigger bindings, and optional
 * state machine configuration.
 *
 * The config is pure data — the EntityAnimationOrchestrator system
 * reads it and creates runtime tweens from it.
 */
export const EntityAnimationConfigSchema = z.object({
  /** Animation clip definitions */
  clips: z.array(AnimationClipSchema).default([]),
  /** Trigger-to-clip bindings */
  bindings: z.array(AnimationBindingSchema).default([]),
  /** Optional state machine states */
  states: z.array(AnimationStateSchema).default([]),
  /** Initial state ID on entity load (must reference a state by name) */
  initialState: z.string().optional(),
  /** Master enable flag (default: true) */
  enabled: z.boolean().default(true),
});

export type EntityAnimationConfig = z.infer<typeof EntityAnimationConfigSchema>;

// =============================================================================
// Animation Overlay (runtime-only, not persisted)
// =============================================================================

/**
 * Animation overlay — transient property deltas applied at render time.
 *
 * @remarks
 * The orchestrator writes to this structure during animation playback.
 * Renderers read it via useAnimationOverlay() and apply deltas on top
 * of the entity's base properties. This prevents animations from
 * corrupting persisted entity state.
 *
 * This schema is NOT stored on the entity — it exists only in the
 * animation overlay store at runtime.
 */
export const AnimationOverlaySchema = z.object({
  /** Opacity override (absolute, not delta) */
  opacity: z.number().min(0).max(1).optional(),
  /** Horizontal scale multiplier */
  scaleX: z.number().optional(),
  /** Vertical scale multiplier */
  scaleY: z.number().optional(),
  /** Rotation offset in degrees */
  rotation: z.number().optional(),
  /** Horizontal position offset (canvas units) */
  positionX: z.number().optional(),
  /** Vertical position offset (canvas units) */
  positionY: z.number().optional(),
  /** Border radius override */
  borderRadius: z.number().nonnegative().optional(),
  /** Width override */
  width: z.number().positive().optional(),
  /** Height override */
  height: z.number().positive().optional(),
  /** Fill color override */
  fill: z.string().optional(),
  /** Stroke color override */
  stroke: z.string().optional(),
  /** Text/foreground color override */
  color: z.string().optional(),
  /** Stroke width override */
  strokeWidth: z.number().nonnegative().optional(),
  /** Font size override */
  fontSize: z.number().positive().optional(),
});

export type AnimationOverlay = z.infer<typeof AnimationOverlaySchema>;

// =============================================================================
// JSON Schema exports
// =============================================================================

export const AnimationKeyframeJSONSchema = AnimationKeyframeSchema.toJSONSchema();
export const AnimationClipJSONSchema = AnimationClipSchema.toJSONSchema();
export const AnimationTriggerJSONSchema = AnimationTriggerSchema.toJSONSchema();
export const AnimationBindingJSONSchema = AnimationBindingSchema.toJSONSchema();
export const AnimationStateJSONSchema = AnimationStateSchema.toJSONSchema();
export const EntityAnimationConfigJSONSchema = EntityAnimationConfigSchema.toJSONSchema();
export const AnimationOverlayJSONSchema = AnimationOverlaySchema.toJSONSchema();
