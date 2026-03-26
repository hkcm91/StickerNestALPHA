/**
 * Built-in Animation Presets — ready-to-use AnimationClip definitions
 *
 * @module @sn/types/animation-presets
 *
 * @remarks
 * These are constant data objects (not Zod schemas). Users can apply
 * a preset to an entity, which copies the clip definition onto the
 * entity's animation config. Presets are identified by ID and grouped
 * by category for the UI preset browser.
 *
 * To use a preset: copy the clip, assign a new UUID as the clip ID,
 * and add it to the entity's `animations.clips` array.
 */

import type { AnimationClip } from './entity-animation';

// =============================================================================
// Preset Categories
// =============================================================================

export type AnimationPresetCategory = 'entrance' | 'exit' | 'emphasis' | 'attention';

export interface AnimationPreset {
  /** Stable preset identifier (not a UUID — these are constants) */
  id: string;
  /** Display name */
  name: string;
  /** Category for UI grouping */
  category: AnimationPresetCategory;
  /** The clip definition (id is a placeholder — replace with UUID on apply) */
  clip: Omit<AnimationClip, 'id'>;
}

// =============================================================================
// Entrance Presets
// =============================================================================

const fadeIn: AnimationPreset = {
  id: 'preset-fade-in',
  name: 'Fade In',
  category: 'entrance',
  clip: {
    name: 'Fade In',
    keyframes: [
      { offset: 0, properties: { opacity: 0 }, easing: 'linear' },
      { offset: 1, properties: { opacity: 1 }, easing: 'easeOutCubic' },
    ],
    duration: 0.5,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

const slideInLeft: AnimationPreset = {
  id: 'preset-slide-in-left',
  name: 'Slide In Left',
  category: 'entrance',
  clip: {
    name: 'Slide In Left',
    keyframes: [
      { offset: 0, properties: { positionX: -200, opacity: 0 }, easing: 'linear' },
      { offset: 1, properties: { positionX: 0, opacity: 1 }, easing: 'easeOutCubic' },
    ],
    duration: 0.6,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

const slideInRight: AnimationPreset = {
  id: 'preset-slide-in-right',
  name: 'Slide In Right',
  category: 'entrance',
  clip: {
    name: 'Slide In Right',
    keyframes: [
      { offset: 0, properties: { positionX: 200, opacity: 0 }, easing: 'linear' },
      { offset: 1, properties: { positionX: 0, opacity: 1 }, easing: 'easeOutCubic' },
    ],
    duration: 0.6,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

const slideInUp: AnimationPreset = {
  id: 'preset-slide-in-up',
  name: 'Slide In Up',
  category: 'entrance',
  clip: {
    name: 'Slide In Up',
    keyframes: [
      { offset: 0, properties: { positionY: 200, opacity: 0 }, easing: 'linear' },
      { offset: 1, properties: { positionY: 0, opacity: 1 }, easing: 'easeOutCubic' },
    ],
    duration: 0.6,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

const slideInDown: AnimationPreset = {
  id: 'preset-slide-in-down',
  name: 'Slide In Down',
  category: 'entrance',
  clip: {
    name: 'Slide In Down',
    keyframes: [
      { offset: 0, properties: { positionY: -200, opacity: 0 }, easing: 'linear' },
      { offset: 1, properties: { positionY: 0, opacity: 1 }, easing: 'easeOutCubic' },
    ],
    duration: 0.6,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

const scaleIn: AnimationPreset = {
  id: 'preset-scale-in',
  name: 'Scale In',
  category: 'entrance',
  clip: {
    name: 'Scale In',
    keyframes: [
      { offset: 0, properties: { scaleX: 0, scaleY: 0, opacity: 0 }, easing: 'linear' },
      { offset: 1, properties: { scaleX: 1, scaleY: 1, opacity: 1 }, easing: 'easeOutCubic' },
    ],
    duration: 0.5,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

const bounceIn: AnimationPreset = {
  id: 'preset-bounce-in',
  name: 'Bounce In',
  category: 'entrance',
  clip: {
    name: 'Bounce In',
    keyframes: [
      { offset: 0, properties: { scaleX: 0, scaleY: 0, opacity: 0 }, easing: 'linear' },
      { offset: 0.5, properties: { scaleX: 1.15, scaleY: 1.15, opacity: 1 }, easing: 'easeOutQuad' },
      { offset: 0.75, properties: { scaleX: 0.95, scaleY: 0.95 }, easing: 'easeInOutQuad' },
      { offset: 1, properties: { scaleX: 1, scaleY: 1, opacity: 1 }, easing: 'easeOutQuad' },
    ],
    duration: 0.8,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

const flipIn: AnimationPreset = {
  id: 'preset-flip-in',
  name: 'Flip In',
  category: 'entrance',
  clip: {
    name: 'Flip In',
    keyframes: [
      { offset: 0, properties: { rotation: -90, opacity: 0 }, easing: 'linear' },
      { offset: 1, properties: { rotation: 0, opacity: 1 }, easing: 'easeOutCubic' },
    ],
    duration: 0.6,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

// =============================================================================
// Emphasis Presets
// =============================================================================

const pulse: AnimationPreset = {
  id: 'preset-pulse',
  name: 'Pulse',
  category: 'emphasis',
  clip: {
    name: 'Pulse',
    keyframes: [
      { offset: 0, properties: { scaleX: 1, scaleY: 1 }, easing: 'linear' },
      { offset: 0.5, properties: { scaleX: 1.1, scaleY: 1.1 }, easing: 'easeInOutQuad' },
      { offset: 1, properties: { scaleX: 1, scaleY: 1 }, easing: 'easeInOutQuad' },
    ],
    duration: 0.6,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'none',
  },
};

const shake: AnimationPreset = {
  id: 'preset-shake',
  name: 'Shake',
  category: 'emphasis',
  clip: {
    name: 'Shake',
    keyframes: [
      { offset: 0, properties: { positionX: 0 }, easing: 'linear' },
      { offset: 0.2, properties: { positionX: -10 }, easing: 'easeInOutQuad' },
      { offset: 0.4, properties: { positionX: 10 }, easing: 'easeInOutQuad' },
      { offset: 0.6, properties: { positionX: -8 }, easing: 'easeInOutQuad' },
      { offset: 0.8, properties: { positionX: 5 }, easing: 'easeInOutQuad' },
      { offset: 1, properties: { positionX: 0 }, easing: 'easeOutQuad' },
    ],
    duration: 0.5,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'none',
  },
};

const bounce: AnimationPreset = {
  id: 'preset-bounce',
  name: 'Bounce',
  category: 'emphasis',
  clip: {
    name: 'Bounce',
    keyframes: [
      { offset: 0, properties: { positionY: 0 }, easing: 'linear' },
      { offset: 0.4, properties: { positionY: -30 }, easing: 'easeOutQuad' },
      { offset: 0.55, properties: { positionY: 0 }, easing: 'easeInQuad' },
      { offset: 0.7, properties: { positionY: -15 }, easing: 'easeOutQuad' },
      { offset: 0.85, properties: { positionY: 0 }, easing: 'easeInQuad' },
      { offset: 1, properties: { positionY: 0 }, easing: 'easeOutQuad' },
    ],
    duration: 0.8,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'none',
  },
};

const wobble: AnimationPreset = {
  id: 'preset-wobble',
  name: 'Wobble',
  category: 'emphasis',
  clip: {
    name: 'Wobble',
    keyframes: [
      { offset: 0, properties: { rotation: 0 }, easing: 'linear' },
      { offset: 0.15, properties: { rotation: -5 }, easing: 'easeInOutQuad' },
      { offset: 0.3, properties: { rotation: 5 }, easing: 'easeInOutQuad' },
      { offset: 0.45, properties: { rotation: -3 }, easing: 'easeInOutQuad' },
      { offset: 0.6, properties: { rotation: 3 }, easing: 'easeInOutQuad' },
      { offset: 0.75, properties: { rotation: -1 }, easing: 'easeInOutQuad' },
      { offset: 1, properties: { rotation: 0 }, easing: 'easeOutQuad' },
    ],
    duration: 0.8,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'none',
  },
};

const heartbeat: AnimationPreset = {
  id: 'preset-heartbeat',
  name: 'Heartbeat',
  category: 'emphasis',
  clip: {
    name: 'Heartbeat',
    keyframes: [
      { offset: 0, properties: { scaleX: 1, scaleY: 1 }, easing: 'linear' },
      { offset: 0.14, properties: { scaleX: 1.3, scaleY: 1.3 }, easing: 'easeInOutQuad' },
      { offset: 0.28, properties: { scaleX: 1, scaleY: 1 }, easing: 'easeInOutQuad' },
      { offset: 0.42, properties: { scaleX: 1.3, scaleY: 1.3 }, easing: 'easeInOutQuad' },
      { offset: 0.7, properties: { scaleX: 1, scaleY: 1 }, easing: 'easeInOutQuad' },
      { offset: 1, properties: { scaleX: 1, scaleY: 1 }, easing: 'linear' },
    ],
    duration: 1.0,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'none',
  },
};

const flash: AnimationPreset = {
  id: 'preset-flash',
  name: 'Flash',
  category: 'emphasis',
  clip: {
    name: 'Flash',
    keyframes: [
      { offset: 0, properties: { opacity: 1 }, easing: 'linear' },
      { offset: 0.25, properties: { opacity: 0 }, easing: 'easeInOutQuad' },
      { offset: 0.5, properties: { opacity: 1 }, easing: 'easeInOutQuad' },
      { offset: 0.75, properties: { opacity: 0 }, easing: 'easeInOutQuad' },
      { offset: 1, properties: { opacity: 1 }, easing: 'easeInOutQuad' },
    ],
    duration: 0.8,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'none',
  },
};

const rubberBand: AnimationPreset = {
  id: 'preset-rubber-band',
  name: 'Rubber Band',
  category: 'emphasis',
  clip: {
    name: 'Rubber Band',
    keyframes: [
      { offset: 0, properties: { scaleX: 1, scaleY: 1 }, easing: 'linear' },
      { offset: 0.3, properties: { scaleX: 1.25, scaleY: 0.75 }, easing: 'easeInOutQuad' },
      { offset: 0.4, properties: { scaleX: 0.75, scaleY: 1.25 }, easing: 'easeInOutQuad' },
      { offset: 0.5, properties: { scaleX: 1.15, scaleY: 0.85 }, easing: 'easeInOutQuad' },
      { offset: 0.65, properties: { scaleX: 0.95, scaleY: 1.05 }, easing: 'easeInOutQuad' },
      { offset: 0.75, properties: { scaleX: 1.05, scaleY: 0.95 }, easing: 'easeInOutQuad' },
      { offset: 1, properties: { scaleX: 1, scaleY: 1 }, easing: 'easeOutQuad' },
    ],
    duration: 0.8,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'none',
  },
};

// =============================================================================
// Exit Presets
// =============================================================================

const fadeOut: AnimationPreset = {
  id: 'preset-fade-out',
  name: 'Fade Out',
  category: 'exit',
  clip: {
    name: 'Fade Out',
    keyframes: [
      { offset: 0, properties: { opacity: 1 }, easing: 'linear' },
      { offset: 1, properties: { opacity: 0 }, easing: 'easeInCubic' },
    ],
    duration: 0.5,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

const slideOutLeft: AnimationPreset = {
  id: 'preset-slide-out-left',
  name: 'Slide Out Left',
  category: 'exit',
  clip: {
    name: 'Slide Out Left',
    keyframes: [
      { offset: 0, properties: { positionX: 0, opacity: 1 }, easing: 'linear' },
      { offset: 1, properties: { positionX: -200, opacity: 0 }, easing: 'easeInCubic' },
    ],
    duration: 0.6,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

const slideOutRight: AnimationPreset = {
  id: 'preset-slide-out-right',
  name: 'Slide Out Right',
  category: 'exit',
  clip: {
    name: 'Slide Out Right',
    keyframes: [
      { offset: 0, properties: { positionX: 0, opacity: 1 }, easing: 'linear' },
      { offset: 1, properties: { positionX: 200, opacity: 0 }, easing: 'easeInCubic' },
    ],
    duration: 0.6,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

const scaleOut: AnimationPreset = {
  id: 'preset-scale-out',
  name: 'Scale Out',
  category: 'exit',
  clip: {
    name: 'Scale Out',
    keyframes: [
      { offset: 0, properties: { scaleX: 1, scaleY: 1, opacity: 1 }, easing: 'linear' },
      { offset: 1, properties: { scaleX: 0, scaleY: 0, opacity: 0 }, easing: 'easeInCubic' },
    ],
    duration: 0.5,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

const bounceOut: AnimationPreset = {
  id: 'preset-bounce-out',
  name: 'Bounce Out',
  category: 'exit',
  clip: {
    name: 'Bounce Out',
    keyframes: [
      { offset: 0, properties: { scaleX: 1, scaleY: 1, opacity: 1 }, easing: 'linear' },
      { offset: 0.3, properties: { scaleX: 1.1, scaleY: 1.1 }, easing: 'easeInOutQuad' },
      { offset: 1, properties: { scaleX: 0, scaleY: 0, opacity: 0 }, easing: 'easeInCubic' },
    ],
    duration: 0.7,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'forwards',
  },
};

// =============================================================================
// Attention Presets
// =============================================================================

const spin: AnimationPreset = {
  id: 'preset-spin',
  name: 'Spin',
  category: 'attention',
  clip: {
    name: 'Spin',
    keyframes: [
      { offset: 0, properties: { rotation: 0 }, easing: 'linear' },
      { offset: 1, properties: { rotation: 360 }, easing: 'linear' },
    ],
    duration: 1.0,
    delay: 0,
    repeat: 0,
    yoyo: false,
    fillMode: 'none',
  },
};

const glow: AnimationPreset = {
  id: 'preset-glow',
  name: 'Glow',
  category: 'attention',
  clip: {
    name: 'Glow',
    keyframes: [
      { offset: 0, properties: { opacity: 1 }, easing: 'linear' },
      { offset: 0.5, properties: { opacity: 0.6 }, easing: 'easeInOutQuad' },
      { offset: 1, properties: { opacity: 1 }, easing: 'easeInOutQuad' },
    ],
    duration: 1.5,
    delay: 0,
    repeat: -1,
    yoyo: false,
    fillMode: 'none',
  },
};

// =============================================================================
// Preset Registry
// =============================================================================

export const ANIMATION_PRESETS: readonly AnimationPreset[] = [
  // Entrance
  fadeIn,
  slideInLeft,
  slideInRight,
  slideInUp,
  slideInDown,
  scaleIn,
  bounceIn,
  flipIn,
  // Emphasis
  pulse,
  shake,
  bounce,
  wobble,
  heartbeat,
  flash,
  rubberBand,
  // Exit
  fadeOut,
  slideOutLeft,
  slideOutRight,
  scaleOut,
  bounceOut,
  // Attention
  spin,
  glow,
] as const;

export function getPresetById(id: string): AnimationPreset | undefined {
  return ANIMATION_PRESETS.find((p) => p.id === id);
}

export function getPresetsByCategory(category: AnimationPresetCategory): AnimationPreset[] {
  return ANIMATION_PRESETS.filter((p) => p.category === category);
}
