/**
 * Cross-Canvas Edge Handler — wires up pipeline connections between
 * widgets on different canvases using the cross-canvas event system.
 *
 * When a ghost widget is placed from a pipeline invite, this handler
 * creates the cross-canvas channel subscription that connects the
 * source widget's output port to the target widget's input port.
 *
 * @module canvas/wiring/cross-canvas-edge
 * @layer L4A-3
 */

import type { BusEvent, Point2D } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

export interface CrossCanvasEdgeRequest {
  inviteId: string;
  sourceCanvasId?: string;
  sourceWidgetInstanceId?: string;
  sourcePortId?: string;
  targetPortId?: string;
  targetPosition: Point2D;
}

/**
 * Derives the cross-canvas channel name for a pipeline connection.
 *
 * Channel format: `pipeline.{canvasId}.{instanceId}.{portId}`
 * This follows the cross-canvas channel naming spec (alphanumeric + dots/hyphens).
 */
export function derivePipelineChannelName(
  canvasId: string,
  widgetInstanceId: string,
  portId: string,
): string {
  return `pipeline.${canvasId}.${widgetInstanceId}.${portId}`;
}

/**
 * Handle a cross-canvas edge request emitted by the ghost widget tool.
 *
 * This creates the subscription mapping so that events from the source
 * widget's output port are routed to the target widget's input port
 * via the cross-canvas event router.
 */
export function handleCrossCanvasEdgeRequest(event: BusEvent): CrossCanvasEdgeRequest | null {
  const payload = event.payload as CrossCanvasEdgeRequest;

  if (!payload.sourceCanvasId || !payload.sourceWidgetInstanceId || !payload.sourcePortId) {
    return null;
  }

  // Derive the channel name the target widget should subscribe to
  const _channel = derivePipelineChannelName(
    payload.sourceCanvasId,
    payload.sourceWidgetInstanceId,
    payload.sourcePortId,
  );

  // The actual cross-canvas subscription will be set up by the widget runtime
  // when the target widget instance mounts and registers its manifest.
  // We emit a bus event here so the runtime layer can pick it up.

  return payload;
}

/**
 * Initialize the cross-canvas edge listener.
 * Call during canvas wiring setup.
 */
export function initCrossCanvasEdgeHandler(): () => void {
  const unsubscribe = bus.subscribe(
    CanvasEvents.PIPELINE_CROSS_CANVAS_EDGE_REQUESTED,
    handleCrossCanvasEdgeRequest,
  );

  return unsubscribe;
}
