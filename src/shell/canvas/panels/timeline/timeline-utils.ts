/**
 * Timeline utilities — coordinate conversion, formatting, hit-testing
 *
 * @module shell/canvas/panels/timeline/timeline-utils
 * @layer L6
 */

/**
 * Convert a time value (seconds) to pixel position in the timeline.
 */
export function timeToPixels(
  time: number,
  pixelsPerSecond: number,
  scrollOffset: number,
): number {
  return (time - scrollOffset) * pixelsPerSecond;
}

/**
 * Convert a pixel position in the timeline to time (seconds).
 */
export function pixelsToTime(
  px: number,
  pixelsPerSecond: number,
  scrollOffset: number,
): number {
  return px / pixelsPerSecond + scrollOffset;
}

/**
 * Format time as timecode string: MM:SS:FF
 */
export function formatTimecode(seconds: number, fps: number): string {
  const totalFrames = Math.floor(seconds * fps);
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const f = totalFrames % fps;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
}

/**
 * Format time as simple MM:SS display.
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Determine tick mark intervals for the ruler based on zoom level.
 * Returns the interval between major and minor tick marks in seconds.
 */
export function getTickIntervals(pixelsPerSecond: number): {
  major: number;
  minor: number;
} {
  if (pixelsPerSecond >= 500) {
    // Very zoomed in: major every 1s, minor every frame
    return { major: 1, minor: 0.1 };
  } else if (pixelsPerSecond >= 200) {
    return { major: 1, minor: 0.5 };
  } else if (pixelsPerSecond >= 100) {
    return { major: 5, minor: 1 };
  } else if (pixelsPerSecond >= 50) {
    return { major: 10, minor: 2 };
  } else if (pixelsPerSecond >= 20) {
    return { major: 30, minor: 5 };
  } else {
    return { major: 60, minor: 10 };
  }
}

/**
 * Snap a time value to the nearest grid position.
 */
export function snapTime(
  time: number,
  snapGrid: number,
  snapEnabled: boolean,
): number {
  if (!snapEnabled || snapGrid <= 0) return time;
  return Math.round(time / snapGrid) * snapGrid;
}

/**
 * Get the cumulative Y position for a track by index.
 */
export function getTrackY(
  trackIndex: number,
  trackHeights: number[],
): number {
  let y = 0;
  for (let i = 0; i < trackIndex && i < trackHeights.length; i++) {
    y += trackHeights[i];
  }
  return y;
}

/**
 * Color palette for clip bars based on entity type.
 */
export const CLIP_COLORS: Record<string, string> = {
  video: '#4f46e5',     // indigo
  audio: '#059669',     // emerald
  sticker: '#d97706',   // amber
  text: '#dc2626',      // red
  shape: '#7c3aed',     // violet
  widget: '#0284c7',    // sky
  group: '#64748b',     // slate
  lottie: '#e11d48',    // rose
  default: '#6b7280',   // gray
};

export function getClipColor(entityType: string): string {
  return CLIP_COLORS[entityType] ?? CLIP_COLORS.default;
}
