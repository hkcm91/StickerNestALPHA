/**
 * Pathfinder Tool — Adobe Illustrator-like vector path operations and interactive Shapebuilder.
 *
 * @module canvas/tools/pathfinder
 * @layer L4A-2
 */

import type { PathEntity, AnchorPoint } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { PATHFINDER_EVENTS } from '../../../runtime/widgets/pathfinder/pathfinder.events';
import type { SceneGraph } from '../../core';
import { anchorsToSvgPath, dividePaths } from '../../core/geometry';
import type { Tool, CanvasPointerEvent } from '../registry';

export function createPathfinderTool(
  sceneGraph: SceneGraph,
  getMode: () => 'edit' | 'preview'
): Tool {
  let isShapeBuilderActive = false;
  let selectedEntities: string[] = [];
  let lastHoveredRegionId: string | null = null;

  // ---------------------------------------------------------------------------
  // Pathfinder Operations
  // ---------------------------------------------------------------------------

  const performUnite = (altKey: boolean = false) => {
    if (altKey) {
      console.warn('[Pathfinder] Compound Shapes (non-destructive) not yet implemented');
    }
    const targets = getSelectedPathEntities();
    if (targets.length < 2) return;
    
    // Simple placeholder Unite: merge all anchors into a single path
    const resultAnchors = targets.flatMap(t => t.anchors);
    const top = targets[targets.length - 1];
    
    targets.forEach(t => bus.emit(CanvasEvents.ENTITY_DELETED, { id: t.id }));
    
    bus.emit(CanvasEvents.ENTITY_CREATED, {
      ...top,
      id: `path-unite-${Date.now()}`,
      name: 'United Path',
      anchors: resultAnchors,
    });
  };

  const performDivide = () => {
    const targets = getSelectedPathEntities();
    if (targets.length < 2) return;

    console.log('[Pathfinder] Slicing', targets.length, 'paths into atomic segments');
    
    // 1. Calculate split segments using the Geometry Engine
    const segments = dividePaths(targets.map(t => ({
      anchors: t.anchors,
      closed: t.closed
    })));

    // 2. Delete originals
    targets.forEach(t => bus.emit(CanvasEvents.ENTITY_DELETED, { id: t.id }));

    // 3. Create new entities for each segment
    segments.forEach((seg, i) => {
      const anchors: AnchorPoint[] = [
        { position: seg.p1, pointType: 'corner' },
        { position: seg.p2, pointType: 'corner' }
      ];
      
      bus.emit(CanvasEvents.ENTITY_CREATED, {
        type: 'path',
        id: `path-div-${Date.now()}-${i}`,
        name: `Segment ${i}`,
        anchors,
        closed: false,
        stroke: targets[0].stroke || '#000',
        strokeWidth: targets[0].strokeWidth || 1,
        transform: {
          position: { x: 0, y: 0 },
          size: { width: 0, height: 0 },
          rotation: 0,
          scale: 1
        }
      });
    });
  };

  const getSelectedPathEntities = (): PathEntity[] => {
    return selectedEntities
      .map(id => sceneGraph.getEntity(id))
      .filter((e): e is PathEntity => e?.type === 'path');
  };

  // ---------------------------------------------------------------------------
  // Event Subscriptions
  // ---------------------------------------------------------------------------

  const unsubs: (() => void)[] = [];

  const setupSubscriptions = () => {
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.UNION, (e: any) => performUnite(e.payload?.altKey)));
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.SUBTRACT, () => {}));
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.INTERSECT, () => {}));
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.EXCLUDE, () => {}));
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.DIVIDE, performDivide));
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.SHAPE_BUILDER_TOGGLE, (event: any) => {
      isShapeBuilderActive = event.payload.active;
      if (!isShapeBuilderActive) {
        bus.emit(PATHFINDER_EVENTS.emits.HOVER_REGION, { instanceId: 'tool', pathData: undefined });
      }
    }));
    unsubs.push(bus.subscribe(CanvasEvents.SELECTION_CLEARED, (event: any) => {
      selectedEntities = event.payload.selectedIds || [];
    }));
  };

  // ---------------------------------------------------------------------------
  // Tool Interface
  // ---------------------------------------------------------------------------

  return {
    name: 'pathfinder',

    onActivate() {
      setupSubscriptions();
    },

    onDeactivate() {
      unsubs.forEach(unsub => unsub());
      unsubs.length = 0;
      bus.emit(PATHFINDER_EVENTS.emits.HOVER_REGION, { instanceId: 'tool', pathData: undefined });
    },

    onPointerDown(event: CanvasPointerEvent) {
      if (!isShapeBuilderActive || getMode() !== 'edit') return;
      if (event.altKey && lastHoveredRegionId) {
        bus.emit(CanvasEvents.ENTITY_DELETED, { id: lastHoveredRegionId });
      }
    },

    onPointerMove(event: CanvasPointerEvent) {
      if (!isShapeBuilderActive || getMode() !== 'edit') return;

      const targets = getSelectedPathEntities();
      const topHit = sceneGraph.queryPoint(event.canvasPosition).find(e => 
        targets.some(t => t.id === e.id)
      ) as PathEntity | undefined;

      if (topHit) {
        if (topHit.id !== lastHoveredRegionId) {
          lastHoveredRegionId = topHit.id;
          const pathData = anchorsToSvgPath(topHit.anchors, topHit.closed);
          bus.emit(PATHFINDER_EVENTS.emits.HOVER_REGION, { instanceId: 'tool', pathData });
        }
      } else if (lastHoveredRegionId) {
        lastHoveredRegionId = null;
        bus.emit(PATHFINDER_EVENTS.emits.HOVER_REGION, { instanceId: 'tool', pathData: undefined });
      }
    },

    onPointerUp() {},
    cancel() {
      bus.emit(PATHFINDER_EVENTS.emits.HOVER_REGION, { instanceId: 'tool', pathData: undefined });
    },
  };
}
