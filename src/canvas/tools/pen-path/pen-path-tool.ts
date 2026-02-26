/**
 * Pen Tool — Adobe Illustrator standard Bezier path creation
 *
 * State machine:
 *   IDLE → click empty → add corner anchor → PATH_BUILDING
 *   IDLE → drag empty → add smooth anchor → DRAGGING_HANDLE → PATH_BUILDING
 *   PATH_BUILDING → click first anchor → close path → IDLE
 *   PATH_BUILDING → click on segment → add anchor → PATH_BUILDING
 *   PATH_BUILDING → click on existing anchor → set active / modify
 *   PATH_BUILDING → alt+click anchor → convert point type (corner/smooth)
 *   PATH_BUILDING → Escape/Enter → commit open path → IDLE
 *   DRAGGING_HANDLE → mouseup → commit anchor → PATH_BUILDING
 *
 * @module canvas/tools/pen
 * @layer L4A-2
 */

import type { Point2D, AnchorPoint } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { pathBounds, mirrorHandle, enforceSmooth, enforceSymmetric, anchorsToSvgPath, distanceToCubicBezier } from '../../core';
import type { Tool, CanvasPointerEvent, CanvasKeyEvent } from '../registry';

/** Distance threshold (px in canvas space) before a click becomes a drag */
const DRAG_THRESHOLD = 4;

/** Distance threshold (px) for detecting a click on an anchor */
const ANCHOR_HIT_THRESHOLD = 8;

type PenState = 'idle' | 'pointer_down' | 'dragging_handle' | 'dragging_segment';

interface BuildAnchor {
  position: Point2D;
  handleIn: Point2D | undefined;
  handleOut: Point2D | undefined;
  pointType: 'corner' | 'smooth' | 'symmetric';
}

export interface PenToolState {
  readonly state: PenState;
  readonly anchors: ReadonlyArray<Readonly<BuildAnchor>>;
  readonly activeAnchorIndex: number;
  readonly mousePosition: Point2D | null;
  readonly closed: boolean;
}

export function createPenPathTool(
  getMode: () => 'edit' | 'preview',
): Tool & { getToolState(): PenToolState } {
  let state: PenState = 'idle';
  let anchors: BuildAnchor[] = [];
  let activeAnchorIndex = -1;
  let mousePosition: Point2D | null = null;
  let downPosition: Point2D | null = null;
  let isClosing = false;
  let isNewAnchorFromSegment = false;

  function dist(a: Point2D, b: Point2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function findAnchorAt(pos: Point2D): number {
    return anchors.findIndex((a) => dist(pos, a.position) < ANCHOR_HIT_THRESHOLD);
  }

  function constrainTo45(pos: Point2D, origin: Point2D): Point2D {
    const dx = pos.x - origin.x;
    const dy = pos.y - origin.y;
    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return {
      x: origin.x + Math.cos(snappedAngle) * distance,
      y: origin.y + Math.sin(snappedAngle) * distance,
    };
  }

  function commitPath(closed: boolean): void {
    if (anchors.length < 2) {
      resetState();
      return;
    }

    const schemaAnchors: AnchorPoint[] = anchors.map((a) => ({
      position: { x: a.position.x, y: a.position.y },
      handleIn: a.handleIn ? { x: a.handleIn.x, y: a.handleIn.y } : undefined,
      handleOut: a.handleOut ? { x: a.handleOut.x, y: a.handleOut.y } : undefined,
      pointType: a.pointType,
    }));

    const bounds = pathBounds(schemaAnchors, closed);

    const localAnchors: AnchorPoint[] = schemaAnchors.map((a) => ({
      position: { x: a.position.x - bounds.min.x, y: a.position.y - bounds.min.y },
      handleIn: a.handleIn ? { x: a.handleIn.x, y: a.handleIn.y } : undefined,
      handleOut: a.handleOut ? { x: a.handleOut.x, y: a.handleOut.y } : undefined,
      pointType: a.pointType,
    }));

    const now = new Date().toISOString();

    bus.emit(CanvasEvents.ENTITY_CREATED, {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10),
      canvasId: '00000000-0000-0000-0000-000000000000', // Placeholder or get from store
      type: 'path',
      name: 'New Path',
      transform: {
        position: { x: bounds.min.x, y: bounds.min.y },
        size: { width: Math.max(1, bounds.max.x - bounds.min.x), height: Math.max(1, bounds.max.y - bounds.min.y) },
        rotation: 0,
        scale: 1,
      },
      zIndex: 0,
      visible: true,
      locked: false,
      opacity: 1,
      anchors: localAnchors,
      closed,
      fill: closed ? 'rgba(99, 102, 241, 0.2)' : null,
      stroke: '#6366f1',
      strokeWidth: 2,
      createdAt: now,
      updatedAt: now,
      createdBy: '00000000-0000-0000-0000-000000000000', // Placeholder
    });

    resetState();
  }

  function resetState(): void {
    state = 'idle';
    anchors = [];
    activeAnchorIndex = -1;
    mousePosition = null;
    downPosition = null;
    isClosing = false;
  }

  // Handle commands from the widget
  const unsubCmd = bus.subscribe(CanvasEvents.TOOL_COMMAND, (event: { payload: any }) => {
    if (event.payload.tool !== 'pen') return;

    switch (event.payload.action) {
      case 'set_point_type':
        if (activeAnchorIndex !== -1) {
          anchors[activeAnchorIndex].pointType = event.payload.type;
          if (event.payload.type === 'corner') {
            anchors[activeAnchorIndex].handleIn = undefined;
            anchors[activeAnchorIndex].handleOut = undefined;
          } else if (!anchors[activeAnchorIndex].handleOut) {
            anchors[activeAnchorIndex].handleIn = { x: -20, y: 0 };
            anchors[activeAnchorIndex].handleOut = { x: 20, y: 0 };
          }
        }
        break;
      case 'toggle_closed':
        // This is a bit tricky since commitPath resets state.
        // For now just toggle a local flag or commit.
        if (anchors.length >= 2) commitPath(true);
        break;
      case 'delete_anchor':
        if (activeAnchorIndex !== -1) {
          anchors.splice(activeAnchorIndex, 1);
          activeAnchorIndex = anchors.length > 0 ? anchors.length - 1 : -1;
          if (anchors.length === 0) resetState();
        }
        break;
      case 'commit_path':
        if (anchors.length >= 2) commitPath(false);
        break;
    }
  });

  const tool: Tool & { getToolState(): PenToolState } = {
    name: 'pen',

    onActivate() {
      resetState();
    },

    onDeactivate() {
      unsubCmd();
      if (anchors.length >= 2) commitPath(false);
      else resetState();
    },

    onPointerDown(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;
      const pos = event.canvasPosition;
      downPosition = pos;
      isNewAnchorFromSegment = false;

      const hitIndex = findAnchorAt(pos);

      // Handle closing path
      if (hitIndex === 0 && anchors.length >= 2) {
        isClosing = true;
        state = 'pointer_down';
        activeAnchorIndex = 0;
        return;
      }

      // Handle existing anchor modification
      if (hitIndex !== -1) {
        if (event.altKey) {
          // Toggle point type
          const a = anchors[hitIndex];
          a.pointType = a.pointType === 'corner' ? 'smooth' : 'corner';
          if (a.pointType === 'corner') {
            a.handleIn = undefined;
            a.handleOut = undefined;
          } else {
            // Default handles if converting to smooth
            a.handleIn = { x: -20, y: 0 };
            a.handleOut = { x: 20, y: 0 };
          }
        }
        activeAnchorIndex = hitIndex;
        state = 'pointer_down';
        return;
      }

      // Check for segment hit
      if (anchors.length >= 2) {
        for (let i = 0; i < (anchors.length - 1); i++) {
          const from = anchors[i];
          const to = anchors[i + 1];
          const d = distanceToCubicBezier(
            pos,
            from.position,
            from.handleOut ? { x: from.position.x + from.handleOut.x, y: from.position.y + from.handleOut.y } : from.position,
            to.handleIn ? { x: to.position.x + to.handleIn.x, y: to.position.y + to.handleIn.y } : to.position,
            to.position
          );

          if (d < 5) {
            // Add anchor at segment
            const newAnchor: BuildAnchor = {
              position: { x: pos.x, y: pos.y },
              handleIn: undefined,
              handleOut: undefined,
              pointType: 'smooth',
            };
            anchors.splice(i + 1, 0, newAnchor);
            activeAnchorIndex = i + 1;
            state = 'pointer_down';
            isNewAnchorFromSegment = true;
            return;
          }
        }
      }

      // Add new anchor
      const newAnchor: BuildAnchor = {
        position: { x: pos.x, y: pos.y },
        handleIn: undefined,
        handleOut: undefined,
        pointType: 'corner',
      };

      anchors.push(newAnchor);
      activeAnchorIndex = anchors.length - 1;
      state = 'pointer_down';
    },

    onPointerMove(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;
      const pos = event.canvasPosition;
      mousePosition = pos;

      if (state === 'pointer_down' && downPosition) {
        if (dist(pos, downPosition) >= DRAG_THRESHOLD) {
          state = isNewAnchorFromSegment ? 'dragging_segment' : 'dragging_handle';
        }
      }

      if (state === 'dragging_segment' && activeAnchorIndex !== -1) {
        // Move the anchor itself
        anchors[activeAnchorIndex].position = pos;
        return;
      }

      if (state === 'dragging_handle' && activeAnchorIndex !== -1) {
        const anchor = anchors[activeAnchorIndex];
        let currentPos = pos;
        if (event.shiftKey) {
          currentPos = constrainTo45(pos, anchor.position);
        }

        const handleOut = {
          x: currentPos.x - anchor.position.x,
          y: currentPos.y - anchor.position.y,
        };

        anchor.handleOut = handleOut;
        
        if (event.altKey) {
          anchor.pointType = 'corner';
          // Leave handleIn alone (break symmetry)
        } else {
          anchor.pointType = anchor.pointType === 'corner' ? 'smooth' : anchor.pointType;
          anchor.handleIn = mirrorHandle(handleOut);
        }
      }
    },

    onPointerUp(event: CanvasPointerEvent) {
      if (getMode() !== 'edit') return;

      if (isClosing) {
        commitPath(true);
        return;
      }

      if (state === 'pointer_down' && event.altKey) {
        // Point conversion already handled in pointerDown
      }

      state = 'idle';
      downPosition = null;
    },

    onKeyDown(event: CanvasKeyEvent) {
      if (event.key === 'Escape' || event.key === 'Enter') {
        if (anchors.length >= 2) commitPath(false);
        else resetState();
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        if (activeAnchorIndex !== -1) {
          anchors.splice(activeAnchorIndex, 1);
          activeAnchorIndex = anchors.length > 0 ? anchors.length - 1 : -1;
          if (anchors.length === 0) resetState();
        }
      }
    },

    cancel() {
      resetState();
    },

    getToolState(): PenToolState {
      return {
        state,
        anchors: [...anchors],
        activeAnchorIndex,
        mousePosition,
        closed: false,
      };
    },
  };

  return tool;
}
