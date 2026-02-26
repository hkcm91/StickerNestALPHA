/**
 * Seed demo entities for visual testing.
 *
 * Emits ENTITY_CREATED bus events for a set of sample entities so the canvas
 * is visually populated when navigating to `/canvas/demo`.
 *
 * @module shell/canvas
 * @layer L6
 */

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

const DEMO_CANVAS_ID = '00000000-0000-4000-8000-000000000001';
const DEMO_DOCKER_ID = 'demo-docker-001';
const DEMO_CHILD_ENTITY_IDS = [
  'demo-text-001',
  'demo-sticker-001',
  'demo-shape-001',
  'demo-drawing-001',
  'demo-svg-001',
];
const DEMO_USER_ID = 'demo-user-001';

/**
 * Creates and emits demo entities onto the canvas via the event bus.
 * Call once after Canvas Core has been initialized.
 */
export function seedDemoEntities(): void {
  const now = new Date().toISOString();
  const entities: CanvasEntity[] = [
    // --- Docker folder entity (parent for all demo entities) ---
    {
      id: DEMO_DOCKER_ID,
      type: 'docker',
      canvasId: DEMO_CANVAS_ID,
      transform: {
        position: { x: 88, y: 44 },
        size: { width: 72, height: 64 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 6,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 12,
      name: 'Canvas Folder',
      children: DEMO_CHILD_ENTITY_IDS,
      layout: 'free',
    } as CanvasEntity,

    // --- Text entity ---
    {
      id: 'demo-text-001',
      type: 'text',
      canvasId: DEMO_CANVAS_ID,
      transform: {
        position: { x: 120, y: 80 },
        size: { width: 320, height: 60 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 3,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 0,
      parentId: DEMO_DOCKER_ID,
      name: 'Welcome Text',
      content: 'Welcome to StickerNest Canvas',
      fontSize: 28,
      fontFamily: 'var(--sn-font-family, sans-serif)',
      fontWeight: 700,
      color: '#ffffff',
      textAlign: 'left',
    } as CanvasEntity,

    // --- Sticker entity ---
    {
      id: 'demo-sticker-001',
      type: 'sticker',
      canvasId: DEMO_CANVAS_ID,
      transform: {
        position: { x: 140, y: 200 },
        size: { width: 160, height: 160 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 2,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 8,
      parentId: DEMO_DOCKER_ID,
      name: 'Demo Star',
      assetUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 63,38 98,38 70,60 80,95 50,73 20,95 30,60 2,38 37,38" fill="%23f9ca24" stroke="%23f0932b" stroke-width="2"/></svg>'),
      assetType: 'image',
    } as CanvasEntity,

    // --- Shape entity (rectangle) ---
    {
      id: 'demo-shape-001',
      type: 'shape',
      canvasId: DEMO_CANVAS_ID,
      transform: {
        position: { x: 380, y: 200 },
        size: { width: 200, height: 140 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 1,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 0.85,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 12,
      parentId: DEMO_DOCKER_ID,
      name: 'Blue Card',
      shapeType: 'rectangle',
      fill: 'var(--sn-accent, #6c5ce7)',
      stroke: 'var(--sn-border, #ddd)',
      strokeWidth: 2,
    } as CanvasEntity,

    // --- Drawing entity (pen stroke) ---
    {
      id: 'demo-drawing-001',
      type: 'drawing',
      canvasId: DEMO_CANVAS_ID,
      transform: {
        position: { x: 140, y: 420 },
        size: { width: 300, height: 80 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 4,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 0,
      parentId: DEMO_DOCKER_ID,
      name: 'Squiggle',
      points: [
        { x: 0, y: 40 },
        { x: 30, y: 10 },
        { x: 60, y: 50 },
        { x: 100, y: 20 },
        { x: 140, y: 60 },
        { x: 180, y: 15 },
        { x: 220, y: 55 },
        { x: 260, y: 30 },
        { x: 300, y: 45 },
      ],
      stroke: '#e17055',
      strokeWidth: 3,
      smoothing: 0.5,
    } as CanvasEntity,

    // --- SVG entity ---
    {
      id: 'demo-svg-001',
      type: 'svg',
      canvasId: DEMO_CANVAS_ID,
      transform: {
        position: { x: 500, y: 400 },
        size: { width: 120, height: 120 },
        rotation: 0,
        scale: 1,
      },
      zIndex: 5,
      visible: true,
      canvasVisibility: 'both' as const,
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_ID,
      borderRadius: 0,
      parentId: DEMO_DOCKER_ID,
      name: 'Heart Icon',
      svgContent:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>',
      fill: '#e84393',
      stroke: '',
    } as CanvasEntity,
  ];

  // Emit each entity as a ENTITY_CREATED bus event
  for (const entity of entities) {
    bus.emit(CanvasEvents.ENTITY_CREATED, entity);
  }
}
