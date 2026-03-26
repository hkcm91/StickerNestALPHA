/**
 * Spatial Entities — barrel export
 *
 * Re-exports all spatial entity rendering components:
 * - `SpatialEntity` — renders a single canvas entity as a 3D panel
 * - `WidgetInSpace` — renders a widget inside 3D space via drei Html
 * - `EntityManager` — manages the set of entities in the spatial scene
 *
 * @module spatial/entities
 * @layer L4B
 */

export { SpatialEntity } from './SpatialEntity';
export type { SpatialEntityProps } from './SpatialEntity';

export { WidgetInSpace } from './WidgetInSpace';
export type { WidgetInSpaceProps } from './WidgetInSpace';

export { Entity2DInSpace } from './Entity2DInSpace';
export type { Entity2DInSpaceProps } from './Entity2DInSpace';

export { SpatialCanvas2DPanel } from './SpatialCanvas2DPanel';
export type { SpatialCanvas2DPanelProps } from './SpatialCanvas2DPanel';

export { EntityManager } from './EntityManager';
export type { ManagedEntity } from './EntityManager';
