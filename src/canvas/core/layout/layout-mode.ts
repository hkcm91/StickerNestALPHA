/**
 * Layout Mode Interface
 *
 * Defines the strategy pattern for layout constraints.
 * Each layout mode applies different positioning and sizing rules.
 *
 * @module canvas/core/layout
 * @layer L4A-1
 */

import { z } from 'zod';

import type { Point2D, Size2D, BoundingBox2D } from '@sn/types';

/**
 * Context passed to constraint functions
 */
export interface ConstraintContext {
  /** The entity being constrained */
  entityId: string;
  /** Current entity bounds */
  currentBounds: BoundingBox2D;
  /** Viewport state (pan/zoom) */
  viewport: {
    pan: Point2D;
    zoom: number;
  };
  /** Grid configuration if applicable */
  gridConfig?: {
    cellWidth: number;
    cellHeight: number;
    snapToGrid: boolean;
  };
  /** Other entity bounds for collision/alignment checking */
  otherEntities?: BoundingBox2D[];
  /** Whether shift key is held (for aspect ratio lock, etc.) */
  shiftKey?: boolean;
  /** Whether alt key is held (for center resize, etc.) */
  altKey?: boolean;
}

/**
 * A snap point for alignment guides
 */
export interface SnapPoint {
  /** The coordinate value */
  value: number;
  /** Whether this is horizontal (x) or vertical (y) */
  axis: 'x' | 'y';
  /** Type of snap point */
  type: 'edge' | 'center' | 'grid';
  /** Source entity ID if from another entity */
  sourceEntityId?: string;
}

/**
 * Result of constraint application
 */
export interface ConstraintResult<T> {
  /** The constrained value */
  value: T;
  /** Whether any constraint was applied */
  wasConstrained: boolean;
  /** Active snap points that were used */
  activeSnaps?: SnapPoint[];
}

/**
 * Layout Mode interface
 *
 * Implements the Strategy pattern for canvas layout constraints.
 * Different modes apply different rules for positioning and sizing entities.
 */
export interface LayoutMode {
  /** Unique identifier for this layout mode */
  readonly name: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** Description of the layout mode */
  readonly description: string;

  /**
   * Apply constraints to a move operation
   *
   * @param newPosition - The desired new position
   * @param ctx - Constraint context
   * @returns The constrained position
   */
  applyMoveConstraints(
    newPosition: Point2D,
    ctx: ConstraintContext
  ): ConstraintResult<Point2D>;

  /**
   * Apply constraints to a resize operation
   *
   * @param newSize - The desired new size
   * @param ctx - Constraint context
   * @returns The constrained size
   */
  applyResizeConstraints(
    newSize: Size2D,
    ctx: ConstraintContext
  ): ConstraintResult<Size2D>;

  /**
   * Get snap points for the current state
   *
   * @param ctx - Constraint context
   * @returns Array of snap points for alignment guides
   */
  getSnapPoints?(ctx: ConstraintContext): SnapPoint[];

  /**
   * Validate an entity position within this layout
   *
   * @param position - Position to validate
   * @param ctx - Constraint context
   * @returns Whether the position is valid
   */
  isValidPosition?(position: Point2D, ctx: ConstraintContext): boolean;

  /**
   * Get the nearest valid position for an entity
   *
   * @param position - Current position
   * @param ctx - Constraint context
   * @returns The nearest valid position
   */
  getNearestValidPosition?(position: Point2D, ctx: ConstraintContext): Point2D;
}

/**
 * Zod schema for snap point (for serialization)
 */
export const SnapPointSchema = z.object({
  value: z.number(),
  axis: z.enum(['x', 'y']),
  type: z.enum(['edge', 'center', 'grid']),
  sourceEntityId: z.string().uuid().optional(),
});

export type SnapPointType = z.infer<typeof SnapPointSchema>;
