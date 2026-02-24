/**
 * MR (Mixed Reality) Module -- barrel export
 *
 * Re-exports all MR components for spatial XR experiences:
 * - `RATKProvider` + `useRATK` -- core RATK bridge and context
 * - `PlaneDetection` -- visual rendering of detected XR planes
 * - `MeshDetection` -- wireframe rendering of detected XR meshes
 * - `Anchors` -- spatial anchor management
 * - `HitTest` -- viewer-space hit testing with reticle
 *
 * @module spatial/mr
 * @layer L4B
 */

export { RATKProvider, useRATK } from './RATKProvider';
export type { RATKProviderProps } from './RATKProvider';

export { PlaneDetection } from './PlaneDetection';
export type { PlaneDetectionProps } from './PlaneDetection';

export { MeshDetection } from './MeshDetection';
export type { MeshDetectionProps } from './MeshDetection';

export { Anchors } from './Anchors';
export type { AnchorsProps } from './Anchors';

export { HitTest } from './HitTest';
export type { HitTestProps } from './HitTest';
