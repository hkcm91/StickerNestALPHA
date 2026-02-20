/**
 * StickerNest V5 Schema Registry
 *
 * @packageDocumentation
 * @module @sn/types
 *
 * @remarks
 * This is the single source of truth for all shared types in StickerNest V5.
 * All schemas are defined with Zod and exported from this module.
 *
 * Import via the `@sn/types` package alias:
 * ```typescript
 * import { BusEvent, CanvasEntity, WidgetManifest } from '@sn/types';
 * ```
 *
 * JSON schemas for external validation (widget manifests, etc.) are also
 * exported with `JSONSchema` suffix.
 */

// =============================================================================
// Spatial Schemas
// =============================================================================
export {
  // Schemas
  Vector3Schema,
  QuaternionSchema,
  Point2DSchema,
  Size2DSchema,
  BoundingBox2DSchema,
  SpatialContextSchema,
  // Types
  type Vector3,
  type Quaternion,
  type Point2D,
  type Size2D,
  type BoundingBox2D,
  type SpatialContext,
  // JSON Schemas
  Vector3JSONSchema,
  QuaternionJSONSchema,
  SpatialContextJSONSchema,
} from './spatial';

// =============================================================================
// Event Bus Schemas
// =============================================================================
export {
  // Schemas
  BusEventSchema,
  // Types
  type BusEvent,
  // Factories
  createBusEvent,
  // Event Constants
  KernelEvents,
  SocialEvents,
  CanvasEvents,
  WidgetEvents,
  ShellEvents,
  SpatialEvents,
  // JSON Schemas
  BusEventJSONSchema,
} from './bus-event';

// =============================================================================
// DataSource Schemas
// =============================================================================
export {
  // Schemas
  DataSourceTypeSchema,
  DataSourceScopeSchema,
  DataSourceACLRoleSchema,
  DataSourceACLEntrySchema,
  DataSourceMetadataSchema,
  DataSourceSchema,
  CreateDataSourceInputSchema,
  UpdateDataSourceInputSchema,
  // Types
  type DataSourceType,
  type DataSourceScope,
  type DataSourceACLRole,
  type DataSourceACLEntry,
  type DataSourceMetadata,
  type DataSource,
  type CreateDataSourceInput,
  type UpdateDataSourceInput,
  // JSON Schemas
  DataSourceJSONSchema,
  DataSourceACLEntryJSONSchema,
} from './data-source';

// =============================================================================
// Canvas Entity Schemas
// =============================================================================
export {
  // Schemas
  CanvasEntityTypeSchema,
  Transform2DSchema,
  Transform3DSchema,
  CanvasEntityBaseSchema,
  StickerEntitySchema,
  TextEntitySchema,
  WidgetContainerEntitySchema,
  ShapeTypeSchema,
  ShapeEntitySchema,
  DrawingEntitySchema,
  GroupEntitySchema,
  DockerEntitySchema,
  CanvasEntitySchema,
  // Types
  type CanvasEntityType,
  type Transform2D,
  type Transform3D,
  type CanvasEntityBase,
  type StickerEntity,
  type TextEntity,
  type WidgetContainerEntity,
  type ShapeEntity,
  type DrawingEntity,
  type GroupEntity,
  type DockerEntity,
  type CanvasEntity,
  // JSON Schemas
  CanvasEntityBaseJSONSchema,
  CanvasEntityJSONSchema,
} from './canvas-entity';

// =============================================================================
// Widget Manifest Schemas
// =============================================================================
export {
  // Schemas
  SemVerSchema,
  WidgetPermissionSchema,
  EventPortSchema,
  WidgetEventContractSchema,
  WidgetConfigFieldSchema,
  WidgetConfigSchema,
  WidgetSizeConstraintsSchema,
  WidgetAuthorSchema,
  WidgetLicenseSchema,
  WidgetManifestSchema,
  WidgetInstanceStateSchema,
  UserWidgetStateSchema,
  // Types
  type WidgetPermission,
  type EventPort,
  type WidgetEventContract,
  type WidgetConfigField,
  type WidgetConfig,
  type WidgetSizeConstraints,
  type WidgetAuthor,
  type WidgetLicense,
  type WidgetManifest,
  type WidgetInstanceState,
  type UserWidgetState,
  // JSON Schemas
  WidgetManifestJSONSchema,
  WidgetInstanceStateJSONSchema,
  UserWidgetStateJSONSchema,
} from './widget-manifest';

// =============================================================================
// Pipeline Schemas
// =============================================================================
export {
  // Schemas
  PipelinePortDirectionSchema,
  PipelinePortSchema,
  PipelineNodeTypeSchema,
  PipelineNodeSchema,
  PipelineEdgeSchema,
  PipelineSchema,
  // Types
  type PipelinePortDirection,
  type PipelinePort,
  type PipelineNodeType,
  type PipelineNode,
  type PipelineEdge,
  type Pipeline,
  // JSON Schemas
  PipelinePortJSONSchema,
  PipelineNodeJSONSchema,
  PipelineEdgeJSONSchema,
  PipelineJSONSchema,
} from './pipeline';
