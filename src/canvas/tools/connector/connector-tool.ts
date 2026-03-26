/**
 * Connector Tool — creates arrow/line entities between canvas entities or free points.
 *
 * Click on entity → set source → drag → release on entity → create connector.
 * Click on empty canvas → freeform source point.
 *
 * @module canvas/tools/connector
 * @layer L4A-2
 */

import type { Point2D } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type { Tool, CanvasPointerEvent } from '../registry/tool-registry';

export type ConnectorLineStyle = 'straight' | 'curved' | 'orthogonal';
export type ConnectorArrowHead = 'none' | 'arrow' | 'circle' | 'diamond';

export interface ConnectorToolOptions {
  lineStyle?: ConnectorLineStyle;
  arrowHead?: ConnectorArrowHead;
  arrowTail?: ConnectorArrowHead;
  strokeColor?: string;
  strokeWidth?: number;
}

export function createConnectorTool(
  getMode: () => 'edit' | 'preview',
  options: ConnectorToolOptions = {},
): Tool {
  let sourceEntityId: string | null = null;
  let sourcePoint: Point2D | null = null;

  return {
    name: 'connector',

    onActivate() {},

    onDeactivate() {
      sourceEntityId = null;
      sourcePoint = null;
    },

    onPointerDown(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;

      sourceEntityId = event.entityId;
      sourcePoint = event.canvasPosition;
    },

    onPointerMove() {
      // Could show a preview line here in the future
    },

    onPointerUp(event: CanvasPointerEvent) {
      if (getMode() !== 'edit' || !sourcePoint) return;

      const targetEntityId = event.entityId;
      const targetPoint = event.canvasPosition;

      // Don't create a zero-length connector
      const dx = targetPoint.x - sourcePoint.x;
      const dy = targetPoint.y - sourcePoint.y;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
        sourceEntityId = null;
        sourcePoint = null;
        return;
      }

      // Calculate bounding box for the connector entity transform
      const minX = Math.min(sourcePoint.x, targetPoint.x);
      const minY = Math.min(sourcePoint.y, targetPoint.y);
      const width = Math.max(1, Math.abs(dx));
      const height = Math.max(1, Math.abs(dy));

      bus.emit(CanvasEvents.ENTITY_CREATED, {
        type: 'connector',
        sourceEntityId: sourceEntityId ?? null,
        targetEntityId: targetEntityId ?? null,
        sourcePoint,
        targetPoint,
        lineStyle: options.lineStyle ?? 'curved',
        arrowHead: options.arrowHead ?? 'arrow',
        arrowTail: options.arrowTail ?? 'none',
        strokeColor: options.strokeColor ?? '#6b7280',
        strokeWidth: options.strokeWidth ?? 2,
        transform: {
          position: { x: minX, y: minY },
          size: { width, height },
          rotation: 0,
          scale: 1,
        },
        zIndex: 0,
        visible: true,
        locked: false,
      });

      sourceEntityId = null;
      sourcePoint = null;
    },

    cancel() {
      sourceEntityId = null;
      sourcePoint = null;
    },
  };
}
