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
  XRSessionModeSchema,
  DetectedPlaneSchema,
  DetectedMeshSchema,
  SpatialAnchorSchema,
  HandJointSchema,
  // Types
  type Vector3,
  type Quaternion,
  type Point2D,
  type Size2D,
  type BoundingBox2D,
  type SpatialContext,
  type XRSessionMode,
  type DetectedPlane,
  type DetectedMesh,
  type SpatialAnchor,
  type HandJoint,
  type SpatialMode,
  // JSON Schemas
  Vector3JSONSchema,
  QuaternionJSONSchema,
  SpatialContextJSONSchema,
  DetectedPlaneJSONSchema,
  DetectedMeshJSONSchema,
  SpatialAnchorJSONSchema,
  HandJointJSONSchema,
  XRSessionModeJSONSchema,
  SpatialModeJSONSchema,
} from "./spatial";

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
  MarketplaceEvents,
  SocialGraphEvents,
  DataManagerEvents,
  GridEvents,
  CanvasDocumentEvents,
  GalleryEvents,
  InteractionModeEvents,
  InputEvents,
  LayoutModeEvents,
  BackgroundEvents,
  DockerEvents,
  CrossCanvasEvents,
  TimelineEvents,
  // JSON Schemas
  BusEventJSONSchema,
} from "./bus-event";

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
} from "./data-source";

// =============================================================================
// Canvas Entity Schemas
// =============================================================================
export {
  // Schemas
  CanvasEntityTypeSchema,
  Transform2DSchema,
  Transform3DSchema,
  CropRectSchema,
  CanvasEntityBaseSchema,
  StickerClickActionTypeSchema,
  StickerClickActionSchema,
  StickerEntitySchema,
  LottieEntitySchema,
  TextEntitySchema,
  WidgetContainerEntitySchema,
  WidgetIntrinsicSizeSchema,
  WidgetScalingModeSchema,
  WidgetCropConfigSchema,
  ShapeTypeSchema,
  ShapeEntitySchema,
  DrawingEntitySchema,
  GroupEntitySchema,
  DockerEntitySchema,
  AudioEntitySchema,
  SvgEntitySchema,
  Object3DEntitySchema,
  ArtboardEntitySchema,
  FolderEntitySchema,
  CanvasEntitySchema,
  // Types
  type CanvasEntityType,
  type Transform2D,
  type Transform3D,
  type CropRect,
  type CanvasEntityBase,
  type StickerClickActionType,
  type StickerClickAction,
  type StickerEntity,
  type LottieEntity,
  type TextEntity,
  type WidgetContainerEntity,
  type WidgetIntrinsicSize,
  type WidgetScalingMode,
  type WidgetCropConfig,
  type ShapeEntity,
  type DrawingEntity,
  type GroupEntity,
  type DockerEntity,
  type AudioEntity,
  type SvgEntity,
  type Object3DEntity,
  type ArtboardEntity,
  type FolderEntity,
  type CanvasEntity,
  // JSON Schemas
  CropRectJSONSchema,
  CanvasEntityBaseJSONSchema,
  LottieEntityJSONSchema,
  AudioEntityJSONSchema,
  SvgEntityJSONSchema,
  PathEntitySchema,
  type PathEntity,
  PathEntityJSONSchema,
  ArtboardEntityJSONSchema,
  FolderEntityJSONSchema,
  CanvasEntityJSONSchema,
  WidgetIntrinsicSizeJSONSchema,
  WidgetScalingModeJSONSchema,
  WidgetCropConfigJSONSchema,
  WidgetContainerEntityJSONSchema,
} from "./canvas-entity";

// =============================================================================
// Path Sub-Schemas (anchor points, fill rules)
// =============================================================================
export {
  // Schemas
  AnchorPointTypeSchema,
  AnchorPointSchema,
  PathFillRuleSchema,
  // Types
  type AnchorPointType,
  type AnchorPoint,
  type PathFillRule,
  // JSON Schemas
  AnchorPointJSONSchema,
} from "./path";

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
} from "./widget-manifest";

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
} from "./pipeline";

// =============================================================================
// Pipeline Intelligence (Port Matching & Templates)
// =============================================================================
export {
  // Port Matcher
  matchPorts,
  findCompatiblePorts,
  findAllConnections,
  tokenize,
  type PortLike,
  type PortMatchResult,
  type MatchType,
  type RankedMatch,
  type NodeWithPorts,
  type SuggestedConnection,
} from "../pipeline/port-matcher";

export {
  // Synonym Table
  SYNONYM_GROUPS,
  getSynonymIndex,
  areSynonyms,
} from "../pipeline/synonym-table";

export {
  // Pipeline Templates
  PIPELINE_TEMPLATES,
  getTemplate,
  getTemplatesByCategory,
  searchTemplates,
  type PipelineTemplate,
  type TemplateSlot,
  type PipelineTemplateCategory,
} from "../pipeline/templates";

// =============================================================================
// Social Graph Schemas
// =============================================================================
export {
  // Profile Schemas
  ProfileVisibilitySchema,
  UserProfileSchema,
  UpdateProfileInputSchema,
  // Follow Schemas
  FollowStatusSchema,
  FollowRelationshipSchema,
  // Post Schemas
  PostVisibilitySchema,
  PostContentTypeSchema,
  PostAttachmentSchema,
  PostSchema,
  CreatePostInputSchema,
  // Reaction Schemas
  ReactionTypeSchema,
  ReactionTargetTypeSchema,
  ReactionSchema,
  // Comment Schemas
  CommentTargetTypeSchema,
  CommentSchema,
  CreateCommentInputSchema,
  // Notification Schemas
  NotificationTypeSchema,
  NotificationSchema,
  // Widget Invite Schemas
  WidgetInviteModeSchema,
  WidgetInviteStatusSchema,
  WidgetInviteSchema,
  // Feed Schemas
  FeedTypeSchema,
  FeedCursorSchema,
  FeedResponseSchema,
  // Integration Query Types
  SocialQueryTypeSchema,
  SocialMutationTypeSchema,
  // Integration Request Schemas (discriminated unions)
  SocialGraphQuerySchema,
  SocialGraphMutationSchema,
  // Types
  type ProfileVisibility,
  type UserProfile,
  type UpdateProfileInput,
  type FollowStatus,
  type FollowRelationship,
  type PostVisibility,
  type PostContentType,
  type PostAttachment,
  type Post,
  type CreatePostInput,
  type ReactionType,
  type ReactionTargetType,
  type Reaction,
  type CommentTargetType,
  type Comment,
  type CreateCommentInput,
  type NotificationType,
  type Notification,
  type WidgetInviteMode,
  type WidgetInviteStatus,
  type WidgetInvite,
  type FeedType,
  type FeedCursor,
  type FeedResponse,
  type SocialQueryType,
  type SocialMutationType,
  type SocialGraphQuery,
  type SocialGraphMutation,
  // JSON Schemas
  UserProfileJSONSchema,
  PostJSONSchema,
  CommentJSONSchema,
  ReactionJSONSchema,
  NotificationJSONSchema,
  FeedResponseJSONSchema,
  WidgetInviteJSONSchema,
} from "./social-graph";

// =============================================================================
// Notion Integration Schemas
// =============================================================================
export {
  // Common Types
  NotionColorSchema,
  NotionRichTextSchema,
  NotionParentSchema,
  // Property Types
  NotionPropertyValueSchema,
  NotionFilterConditionSchema,
  NotionFilterSchema,
  NotionSortSchema,
  // Response Schemas
  NotionPageSchema,
  NotionDatabaseSchema,
  NotionDatabasePropertySchema,
  NotionQueryResponseSchema,
  NotionSearchResultSchema,
  NotionSearchResponseSchema,
  // Query/Mutation Schemas (for integration handler)
  NotionQuerySchema,
  NotionMutationSchema,
  NotionPropertiesInputSchema,
  // Types
  type NotionColor,
  type NotionRichText,
  type NotionParent,
  type NotionPropertyValue,
  type NotionFilterCondition,
  type NotionFilter,
  type NotionSort,
  type NotionPage,
  type NotionDatabase,
  type NotionDatabaseProperty,
  type NotionQueryResponse,
  type NotionSearchResult,
  type NotionSearchResponse,
  type NotionQuery,
  type NotionMutation,
  type NotionPropertiesInput,
  // JSON Schemas
  NotionPageJSONSchema,
  NotionDatabaseJSONSchema,
  NotionQueryResponseJSONSchema,
} from "./notion-integration";

// =============================================================================
// World Instance Schemas
// =============================================================================
export {
  // Schemas
  WorldModeSchema,
  WorldStatusSchema,
  WorldOptionsSchema,
  PresenceSnapshotSchema,
  WidgetInstanceSnapshotSchema,
  HistorySnapshotSchema,
  WorldSnapshotSchema,
  // Types
  type WorldMode,
  type WorldStatus,
  type WorldOptions,
  type PresenceSnapshot,
  type WidgetInstanceSnapshot,
  type HistorySnapshot,
  type WorldSnapshot,
  // Event Constants
  WorldEvents,
  // JSON Schemas
  WorldModeJSONSchema,
  WorldStatusJSONSchema,
  WorldOptionsJSONSchema,
  WorldSnapshotJSONSchema,
} from "./world";

// =============================================================================
// Grid Layer Schemas
// =============================================================================
export {
  // Cell Schemas
  GridCellFillTypeSchema,
  GridCellSchema,
  // Config Schemas
  GridSnapModeSchema,
  GridProjectionModeSchema,
  GridLineStyleSchema,
  GridConfigSchema,
  // State Schema
  GridStateSchema,
  // Event Payload Schemas
  GridCellPaintedPayloadSchema,
  GridCellClearedPayloadSchema,
  GridCellsBatchPaintedPayloadSchema,
  GridConfigChangedPayloadSchema,
  GridClearedPayloadSchema,
  // Types
  type GridCellFillType,
  type GridCell,
  type GridSnapMode,
  type GridProjectionMode,
  type GridLineStyle,
  type GridConfig,
  type GridState,
  type GridCellPaintedPayload,
  type GridCellClearedPayload,
  type GridCellsBatchPaintedPayload,
  type GridConfigChangedPayload,
  type GridClearedPayload,
  // JSON Schema getters (lazy-evaluated)
  getGridCellJSONSchema,
  getGridConfigJSONSchema,
  getGridStateJSONSchema,
} from "./grid";

// =============================================================================
// Canvas Document Schemas
// =============================================================================
export {
  // Background Schemas
  SolidBackgroundSchema,
  GradientStopSchema,
  GradientTypeSchema,
  GradientBackgroundSchema,
  ImageBackgroundModeSchema,
  ImageBackgroundSchema,
  BackgroundSpecSchema,
  DEFAULT_BACKGROUND,
  // Viewport Config Schema
  ViewportConfigSchema,
  // Platform Schema
  CanvasPlatformSchema,
  // Layout Mode Schema
  LayoutModeSchema,
  // Document Schemas
  CanvasDocumentMetaSchema,
  CanvasDocumentSchema,
  CANVAS_DOCUMENT_VERSION,
  // Input Schemas
  CreateCanvasDocumentInputSchema,
  UpdateCanvasDocumentInputSchema,
  // Types
  type SolidBackground,
  type GradientStop,
  type GradientType,
  type GradientBackground,
  type ImageBackgroundMode,
  type ImageBackground,
  type BackgroundSpec,
  type ViewportConfig,
  type CanvasPlatform,
  type LayoutMode,
  type CanvasDocumentMeta,
  type CanvasDocument,
  type CanvasPositionConfig,
  CanvasPositionConfigSchema,
  type CreateCanvasDocumentInput,
  type UpdateCanvasDocumentInput,
  // JSON Schemas
  BackgroundSpecJSONSchema,
  ViewportConfigJSONSchema,
  CanvasPlatformJSONSchema,
  LayoutModeJSONSchema,
  CanvasDocumentMetaJSONSchema,
  CanvasDocumentJSONSchema,
} from './canvas-document';

// =============================================================================
// Database Management Schemas
// =============================================================================
export {
  // Column Schemas
  ColumnTypeSchema,
  SelectOptionSchema,
  NumberFormatSchema,
  ColumnConfigSchema,
  TableColumnSchema,
  // Cell & Row Schemas
  CellValueSchema,
  TableRowSchema,
  // Filter & Sort Schemas
  FilterOperatorSchema,
  FilterRuleSchema,
  FilterGroupSchema,
  SortDirectionSchema,
  SortRuleSchema,
  // View Schemas
  ViewTypeSchema,
  DatabaseViewSchema,
  // Table Schema (stored in DataSource.schema)
  TableSchemaSchema,
  TableContentSchema,
  // AI Operation Schemas
  AIOperationTypeSchema,
  AISchemaGenerateRequestSchema,
  AISchemaGenerateResponseSchema,
  AIAutofillRequestSchema,
  AIAutofillResponseSchema,
  AISuggestColumnRequestSchema,
  AISuggestColumnResponseSchema,
  AINaturalLanguageQueryRequestSchema,
  AINaturalLanguageQueryResponseSchema,
  AIExtractDataRequestSchema,
  AIExtractDataResponseSchema,
  AIDataRequestSchema,
  // Template Schemas
  TemplateCategorySchema,
  DatabaseTemplateSchema,
  // Notion Sync Schemas
  NotionSyncStatusSchema,
  NotionSyncConfigSchema,
  // Types
  type ColumnType,
  type SelectOption,
  type NumberFormat,
  type ColumnConfig,
  type TableColumn,
  type CellValue,
  type TableRow,
  type FilterOperator,
  type FilterRule,
  type FilterGroup,
  type SortDirection,
  type SortRule,
  type ViewType,
  type DatabaseView,
  type TableSchema,
  type TableContent,
  type AIOperationType,
  type AISchemaGenerateRequest,
  type AISchemaGenerateResponse,
  type AIAutofillRequest,
  type AIAutofillResponse,
  type AISuggestColumnRequest,
  type AISuggestColumnResponse,
  type AINaturalLanguageQueryRequest,
  type AINaturalLanguageQueryResponse,
  type AIExtractDataRequest,
  type AIExtractDataResponse,
  type AIDataRequest,
  type TemplateCategory,
  type DatabaseTemplate,
  type NotionSyncStatus,
  type NotionSyncConfig,
  // JSON Schemas
  TableColumnJSONSchema,
  TableRowJSONSchema,
  DatabaseViewJSONSchema,
  TableSchemaJSONSchema,
  DatabaseTemplateJSONSchema,
} from './database-management';

// =============================================================================
// Docker Schemas (Shell-level dockable containers)
// =============================================================================
export {
  // Schemas
  DockerWidgetSlotSchema,
  DockerTabSchema,
  DockerDockModeSchema,
  DockerSchema,
  UserDockerConfigSchema,
  CreateDockerInputSchema,
  UpdateDockerInputSchema,
  // Types
  type DockerWidgetSlot,
  type DockerTab,
  type DockerDockMode,
  type Docker,
  type UserDockerConfig,
  type CreateDockerInput,
  type UpdateDockerInput,
  // JSON Schemas
  DockerWidgetSlotJSONSchema,
  DockerTabJSONSchema,
  DockerDockModeJSONSchema,
  DockerJSONSchema,
  UserDockerConfigJSONSchema,
} from "./docker";

// =============================================================================
// Gallery Asset Schemas
// =============================================================================
export {
  // Schemas
  GalleryAssetSchema,
  CreateGalleryAssetInputSchema,
  UpdateGalleryAssetInputSchema,
  // Types
  type GalleryAsset,
  type CreateGalleryAssetInput,
  type UpdateGalleryAssetInput,
  // JSON Schemas
  GalleryAssetJSONSchema,
} from "./gallery";

// =============================================================================
// User API Key Schemas (BYOK)
// =============================================================================
export {
  // Schemas
  ApiKeyProviderSchema,
  ApiKeyStatusSchema,
  UserApiKeySchema,
  CreateApiKeyInputSchema,
  UpdateApiKeyInputSchema,
  SaveApiKeyResponseSchema,
  ApiKeyValidationResultSchema,
  // Types
  type ApiKeyProvider,
  type ApiKeyStatus,
  type UserApiKey,
  type CreateApiKeyInput,
  type UpdateApiKeyInput,
  type SaveApiKeyResponse,
  type ApiKeyValidationResult,
  // Constants
  API_KEY_PROVIDER_INFO,
  // JSON Schemas
  UserApiKeyJSONSchema,
  CreateApiKeyInputJSONSchema,
  ApiKeyProviderJSONSchema,
  ApiKeyStatusJSONSchema,
} from "./api-key";

// =============================================================================
// Widget Design Spec Schemas
// =============================================================================
export {
  // Schemas
  DesignSpecColorsSchema,
  DesignSpecTypographySchema,
  DesignSpecSpacingSchema,
  DesignSpecBordersSchema,
  DesignSpecShadowsSchema,
  DesignSpecComponentSchema,
  WidgetDesignSpecSchema,
  // Types
  type DesignSpecColors,
  type DesignSpecTypography,
  type DesignSpecSpacing,
  type DesignSpecBorders,
  type DesignSpecShadows,
  type DesignSpecComponent,
  type WidgetDesignSpec,
  // JSON Schemas
  WidgetDesignSpecJSONSchema,
} from "./widget-design-spec";

// =============================================================================
// MCP (Model Context Protocol) Schemas
// =============================================================================
export {
  // Schemas
  McpAuthTypeSchema,
  McpServerConfigSchema,
  McpToolDefinitionSchema,
  McpToolCallSchema,
  McpToolResultSchema,
  McpResourceSchema,
  McpResourceReadResultSchema,
  // Types
  type McpAuthType,
  type McpServerConfig,
  type McpToolDefinition,
  type McpToolCall,
  type McpToolResult,
  type McpResource,
  type McpResourceReadResult,
  // JSON Schemas
  McpServerConfigJSONSchema,
  McpToolDefinitionJSONSchema,
  McpToolCallJSONSchema,
  McpToolResultJSONSchema,
  McpResourceJSONSchema,
  McpResourceReadResultJSONSchema,
} from "./mcp";

// =============================================================================
// Theme Schemas
// =============================================================================
export {
  // Schemas
  CoreThemeTokensSchema,
  ExtendedThemeTokensSchema,
  FullThemeTokensSchema,
  ThemeNameSchema,
  // Constants
  CORE_TOKEN_KEYS,
  // Types
  type CoreThemeTokens,
  type ExtendedThemeTokens,
  type FullThemeTokens,
  type ThemeName,
  // JSON Schemas
  CoreThemeTokensJSONSchema,
  ExtendedThemeTokensJSONSchema,
  FullThemeTokensJSONSchema,
  ThemeNameJSONSchema,
} from "./theme";

// =============================================================================
// Timeline / Video Production Schemas
// =============================================================================
export {
  // Schemas
  CompositionSettingsSchema,
  TrackTypeSchema,
  TimelineTrackSchema,
  BlendModeSchema,
  TimelineClipSchema,
  TimelineKeyframeSchema,
  TimelinePropertySchema,
  PropertyTrackSchema,
  TimelineMarkerSchema,
  LoopRegionSchema,
  TimelineDataSchema,
  // Types
  type CompositionSettings,
  type TrackType,
  type TimelineTrack,
  type BlendMode,
  type TimelineClip,
  type TimelineKeyframe,
  type TimelineProperty,
  type PropertyTrack,
  type TimelineMarker,
  type LoopRegion,
  type TimelineData,
  // JSON Schemas
  CompositionSettingsJSONSchema,
  TimelineTrackJSONSchema,
  TimelineClipJSONSchema,
  TimelineKeyframeJSONSchema,
  PropertyTrackJSONSchema,
  TimelineMarkerJSONSchema,
  TimelineDataJSONSchema,
} from './timeline';

export {
  // Re-exported from canvas-entity (defined there to avoid circular imports)
  VideoEntitySchema,
  type VideoEntity,
} from './canvas-entity';

export {
  VideoEntityJSONSchema,
} from './video-entity';

export {
  // Schemas
  VideoProjectStatusSchema,
  VideoProjectSchema,
  RenderJobStatusSchema,
  RenderJobSchema,
  // Types
  type VideoProjectStatus,
  type VideoProject,
  type RenderJobStatus,
  type RenderJob,
  // JSON Schemas
  VideoProjectJSONSchema,
  RenderJobJSONSchema,
} from './video-project';

// =============================================================================
// Entity Animation Schemas
// =============================================================================
export {
  // Schemas
  AnimatablePropertiesSchema,
  EasingNameSchema,
  AnimationKeyframeSchema,
  AnimationFillModeSchema,
  AnimationClipSchema,
  AnimationTriggerTypeSchema,
  AnimationTriggerSchema,
  AnimationBindingSchema,
  AnimationStateSchema,
  EntityAnimationConfigSchema,
  AnimationOverlaySchema,
  // Types
  type AnimatableProperties,
  type EasingName,
  type AnimationKeyframe,
  type AnimationFillMode,
  type AnimationClip,
  type AnimationTriggerType,
  type AnimationTrigger,
  type AnimationBinding,
  type AnimationState,
  type EntityAnimationConfig,
  type AnimationOverlay,
  // JSON Schemas
  AnimationKeyframeJSONSchema,
  AnimationClipJSONSchema,
  AnimationTriggerJSONSchema,
  AnimationBindingJSONSchema,
  AnimationStateJSONSchema,
  EntityAnimationConfigJSONSchema,
  AnimationOverlayJSONSchema,
} from './entity-animation';

export {
  // Preset types and registry
  ANIMATION_PRESETS,
  getPresetById,
  getPresetsByCategory,
  type AnimationPreset,
  type AnimationPresetCategory,
} from './animation-presets';

// =============================================================================
// AI Action Schemas
// =============================================================================
export {
  // Generic Action Schemas
  AICreateEntityActionSchema,
  AIUpdateEntityActionSchema,
  AIDeleteEntityActionSchema,
  AIMoveEntityActionSchema,
  AIEmitEventActionSchema,
  AICanvasActionSchema,
  AICanvasActionBatchSchema,
  // Specific Action Schemas
  AICreateStickerActionSchema,
  AICreateWidgetActionSchema,
  AICreateTextActionSchema,
  AICreateShapeActionSchema,
  AITriggerGenerationActionSchema,
  // Discriminated Union (specific)
  AIActionSchema,
  AIActionBatchSchema,
  // Context Schemas
  AIEntitySnapshotSchema,
  AISpatialRelationSchema,
  AIViewportSnapshotSchema,
  AICanvasContextSchema,
  // Generic Types
  type AICanvasAction,
  type AICreateEntityAction,
  type AIUpdateEntityAction,
  type AIDeleteEntityAction,
  type AIMoveEntityAction,
  type AIEmitEventAction,
  type AICanvasActionBatch,
  type AIActionExecutionResult,
  // Specific Types
  type AIAction,
  type AIActionBatch,
  type AIEntitySnapshot,
  type AISpatialRelation,
  type AIViewportSnapshot,
  type AICanvasContext,
  // JSON Schemas
  AICanvasActionJSONSchema,
  AICanvasActionBatchJSONSchema,
  AIActionJSONSchema,
  AIActionBatchJSONSchema,
  AICanvasContextJSONSchema,
} from "./ai-action";
