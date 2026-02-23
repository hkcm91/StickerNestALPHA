/**
 * Shared types for TestHarness panel components
 * Extracted from TestHarness.tsx
 *
 * @module shell/dev
 * @layer L6
 */

export interface CanvasTextEntity {
  id: string;
  text: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  x: number;
  y: number;
}

export interface CanvasShapeEntity {
  id: string;
  type: 'rectangle' | 'ellipse';
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasImageEntity {
  id: string;
  src: string;
  opacity: number;
  brightness: number;
  blur: number;
  fit: 'cover' | 'contain' | 'fill';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasCounterEntity {
  id: string;
  value: number;
  x: number;
  y: number;
}

export interface CanvasDrawingEntity {
  id: string;
  points: { x: number; y: number }[];
  stroke: string;
  strokeWidth: number;
  smoothing: number;
  x: number;
  y: number;
}

export interface TileData {
  id: string;
  color: string;
  name: string;
}

export interface CanvasStickerEntity {
  id: string;
  assetUrl: string;
  assetType: 'image' | 'gif' | 'video';
  aspectLocked: boolean;
  clickEventType?: string;
  clickEventPayload?: Record<string, unknown>;
  hoverEffect: 'none' | 'scale' | 'glow' | 'opacity';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasLottieEntity {
  id: string;
  assetUrl: string;
  loop: boolean;
  speed: number;
  direction: number;
  autoplay: boolean;
  aspectLocked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SelectedEntityRef =
  | { kind: 'text'; id: string }
  | { kind: 'shape'; id: string }
  | { kind: 'image'; id: string }
  | { kind: 'counter'; id: string }
  | { kind: 'drawing'; id: string }
  | { kind: 'sticker'; id: string }
  | { kind: 'lottie'; id: string }
  | null;

export interface GameMapState {
  cols: number;
  rows: number;
  cellSize: number;
  showGrid: boolean;
  gridType: 'flat' | 'iso-classic' | 'iso-top' | 'iso-steep' | 'iso-diamond';
  gridColor: string;
  gridLineWeight: number;
  gridOpacity: number;
  tiles: (TileData | null)[][];
}
