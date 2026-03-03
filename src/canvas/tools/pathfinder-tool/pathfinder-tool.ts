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
import {
  anchorsToSvgPath,
  dividePaths,
  unitePaths,
  subtractPaths,
  intersectPaths,
  excludePaths,
} from '../../core/geometry';
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

  /** Helper: convert selected PathEntities to PathInput array for boolean ops */
  const toPathInputs = (targets: PathEntity[]) =>
    targets.map(t => ({ anchors: t.anchors, closed: t.closed }));

  /** Helper: create result entities from boolean operation output */
  const createResultEntities = (
    resultAnchors: import('@sn/types').AnchorPoint[][],
    template: PathEntity,
    opName: string,
  ) => {
    resultAnchors.forEach((anchors, i) => {
      bus.emit(CanvasEvents.ENTITY_CREATED, {
        type: 'path' as const,
        id: `path-${opName}-${Date.now()}-${i}`,
        name: `${opName} Path${resultAnchors.length > 1 ? ` ${i}` : ''}`,
        anchors,
        closed: true,
        fill: template.fill,
        stroke: template.stroke || '#000',
        strokeWidth: template.strokeWidth || 1,
        transform: template.transform,
      });
    });
  };

  const performUnite = (altKey: boolean = false) => {
    if (altKey) {
      console.warn('[Pathfinder] Compound Shapes (non-destructive) not yet implemented');
    }
    const targets = getSelectedPathEntities();
    if (targets.length < 2) return;

    const result = unitePaths(toPathInputs(targets));
    const template = targets[targets.length - 1];
    targets.forEach(t => bus.emit(CanvasEvents.ENTITY_DELETED, { id: t.id }));
    createResultEntities(result, template, 'unite');
  };

  const performSubtract = () => {
    const targets = getSelectedPathEntities();
    if (targets.length < 2) return;

    const base = { anchors: targets[0].anchors, closed: targets[0].closed };
    const subtract = targets.slice(1).map(t => ({ anchors: t.anchors, closed: t.closed }));
    const result = subtractPaths(base, subtract);
    targets.forEach(t => bus.emit(CanvasEvents.ENTITY_DELETED, { id: t.id }));
    createResultEntities(result, targets[0], 'subtract');
  };

  const performIntersect = () => {
    const targets = getSelectedPathEntities();
    if (targets.length < 2) return;

    const result = intersectPaths(toPathInputs(targets));
    const template = targets[targets.length - 1];
    targets.forEach(t => bus.emit(CanvasEvents.ENTITY_DELETED, { id: t.id }));
    createResultEntities(result, template, 'intersect');
  };

  const performExclude = () => {
    const targets = getSelectedPathEntities();
    if (targets.length < 2) return;

    const result = excludePaths(toPathInputs(targets));
    const template = targets[targets.length - 1];
    targets.forEach(t => bus.emit(CanvasEvents.ENTITY_DELETED, { id: t.id }));
    createResultEntities(result, template, 'exclude');
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
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.SUBTRACT, performSubtract));
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.INTERSECT, performIntersect));
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.EXCLUDE, performExclude));
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.DIVIDE, performDivide));
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.TRIM, () => {
      console.warn('[Pathfinder] Trim not yet implemented');
    }));
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.MERGE, () => {
      console.warn('[Pathfinder] Merge not yet implemented');
    }));
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.CROP, () => {
      console.warn('[Pathfinder] Crop not yet implemented');
    }));
    unsubs.push(bus.subscribe(PATHFINDER_EVENTS.emits.SHAPE_BUILDER_TOGGLE, (event: any) => {
      isShapeBuilderActive = event.payload.active;
      if (!isShapeBuilderActive) {
        bus.emit(PATHFINDER_EVENTS.emits.HOVER_REGION, { instanceId: 'tool', pathData: undefined });
      }
    }));
    unsubs.push(bus.subscribe(CanvasEvents.ENTITY_SELECTED, (event: any) => {
      const entities = event.payload?.entities;
      if (Array.isArray(entities)) {
        selectedEntities = entities.map((e: any) => e.id);
      }
    }));
    unsubs.push(bus.subscribe(CanvasEvents.ENTITY_DESELECTED, (event: any) => {
      const id = event.payload?.id;
      if (id) {
        selectedEntities = selectedEntities.filter(eid => eid !== id);
      }
    }));
    unsubs.push(bus.subscribe(CanvasEvents.SELECTION_CLEARED, () => {
      selectedEntities = [];
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
