/**
 * Widget Manifest schemas
 * @module @sn/types/widget-manifest
 */

import { z } from 'zod';

/**
 * Semantic version string
 */
export const SemVerSchema = z.string().regex(
  /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/,
  'Must be valid semver (e.g., 1.0.0, 1.0.0-beta.1)'
);

/**
 * Widget permission enum
 *
 * @remarks
 * Widgets must declare required permissions in their manifest.
 * Users see these permissions before installing.
 */
export const WidgetPermissionSchema = z.enum([
  /** Access to local storage APIs */
  'storage',
  /** Access to user state (cross-canvas) */
  'user-state',
  /** Access to integration APIs (external services) */
  'integrations',
  /** Access to clipboard APIs */
  'clipboard',
  /** Access to notifications */
  'notifications',
  /** Access to media (camera, microphone) */
  'media',
  /** Access to geolocation */
  'geolocation',
  /** Access to cross-canvas events */
  'cross-canvas',
  /** Access to AI generation APIs (image, video, etc.) */
  'ai',
  /** Access to checkout/payment APIs */
  'checkout',
  /** Access to auth APIs (signup/login) */
  'auth',
]);

export type WidgetPermission = z.infer<typeof WidgetPermissionSchema>;

/**
 * Event port schema (input or output)
 */
export const EventPortSchema = z.object({
  /** Port name (used in pipeline wiring) */
  name: z.string().min(1),
  /** Human-readable description */
  description: z.string().optional(),
  /** JSON Schema for the event payload */
  schema: z.record(z.string(), z.unknown()).optional(),
});

export type EventPort = z.infer<typeof EventPortSchema>;

/**
 * Widget event contract schema
 */
export const WidgetEventContractSchema = z.object({
  /** Events this widget emits */
  emits: z.array(EventPortSchema).default([]),
  /** Events this widget subscribes to */
  subscribes: z.array(EventPortSchema).default([]),
});

export type WidgetEventContract = z.infer<typeof WidgetEventContractSchema>;

/**
 * Widget config field schema
 */
export const WidgetConfigFieldSchema = z.object({
  /** Field name */
  name: z.string().min(1),
  /** Field type for UI rendering */
  type: z.enum([
    'string',
    'number',
    'boolean',
    'color',
    'select',
    'multiselect',
    'slider',
    'date',
    'datetime',
    'json',
  ]),
  /** Human-readable label */
  label: z.string(),
  /** Field description */
  description: z.string().optional(),
  /** Default value */
  default: z.unknown().optional(),
  /** Whether field is required */
  required: z.boolean().default(false),
  /** Options for select/multiselect fields */
  options: z.array(z.object({
    label: z.string(),
    value: z.unknown(),
  })).optional(),
  /** Min value for number/slider */
  min: z.number().optional(),
  /** Max value for number/slider */
  max: z.number().optional(),
  /** Step value for number/slider */
  step: z.number().optional(),
  /** Placeholder text for string fields */
  placeholder: z.string().optional(),
});

export type WidgetConfigField = z.infer<typeof WidgetConfigFieldSchema>;

/**
 * Widget config schema
 */
export const WidgetConfigSchema = z.object({
  /** Config fields */
  fields: z.array(WidgetConfigFieldSchema).default([]),
  /** JSON Schema for validation (generated from fields) */
  jsonSchema: z.record(z.string(), z.unknown()).optional(),
});

export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

/**
 * Widget size constraints
 */
export const WidgetSizeConstraintsSchema = z.object({
  /** Minimum width in canvas units */
  minWidth: z.number().positive().optional(),
  /** Maximum width in canvas units */
  maxWidth: z.number().positive().optional(),
  /** Minimum height in canvas units */
  minHeight: z.number().positive().optional(),
  /** Maximum height in canvas units */
  maxHeight: z.number().positive().optional(),
  /** Default width */
  defaultWidth: z.number().positive().default(200),
  /** Default height */
  defaultHeight: z.number().positive().default(150),
  /** Whether to maintain aspect ratio */
  aspectLocked: z.boolean().default(false),
  /** Aspect ratio (width/height) if locked */
  aspectRatio: z.number().positive().optional(),
});

export type WidgetSizeConstraints = z.infer<typeof WidgetSizeConstraintsSchema>;

/**
 * Widget author schema
 */
export const WidgetAuthorSchema = z.object({
  /** Author name */
  name: z.string().min(1),
  /** Author email */
  email: z.string().email().optional(),
  /** Author URL */
  url: z.string().url().optional(),
});

export type WidgetAuthor = z.infer<typeof WidgetAuthorSchema>;

/**
 * Widget license enum
 */
export const WidgetLicenseSchema = z.enum([
  'MIT',
  'Apache-2.0',
  'GPL-3.0',
  'BSD-3-Clause',
  'proprietary',
  'no-fork',
]);

export type WidgetLicense = z.infer<typeof WidgetLicenseSchema>;

/**
 * Widget Manifest schema
 *
 * @remarks
 * Every widget must declare a manifest that defines its identity,
 * version, permissions, event contract, and configuration schema.
 */
export const WidgetManifestSchema = z.object({
  /** Unique widget identifier (reverse domain notation recommended) */
  id: z.string().min(1).regex(
    /^[a-z0-9-_.]+$/i,
    'Must be alphanumeric with dashes, underscores, or dots'
  ),
  /** Widget display name */
  name: z.string().min(1).max(50),
  /**
   * Widget description.
   * @remarks SECURITY: Must be sanitized before rendering to prevent XSS.
   * Higher layers (Marketplace, Shell) are responsible for sanitization.
   */
  description: z.string().max(500).optional(),
  /** Semantic version */
  version: SemVerSchema,
  /** Widget author */
  author: WidgetAuthorSchema.optional(),
  /** License */
  license: WidgetLicenseSchema.default('MIT'),
  /** Homepage URL */
  homepage: z.string().url().optional(),
  /** Repository URL */
  repository: z.string().url().optional(),
  /** Icon URL (proxied) */
  icon: z.string().url().optional(),
  /** Thumbnail URL for marketplace */
  thumbnail: z.string().url().optional(),
  /** Tags for discovery */
  tags: z.array(z.string()).default([]),
  /** Category for marketplace */
  category: z.enum([
    'productivity',
    'data',
    'social',
    'utilities',
    'games',
    'media',
    'commerce',
    'other',
  ]).default('other'),
  /** Required permissions */
  permissions: z.array(WidgetPermissionSchema).default([]),
  /** Event contract (emits/subscribes) */
  events: WidgetEventContractSchema.default({ emits: [], subscribes: [] }),
  /** Configuration schema */
  config: WidgetConfigSchema.default({ fields: [] }),
  /** Size constraints */
  size: WidgetSizeConstraintsSchema.default({
    defaultWidth: 200,
    defaultHeight: 150,
    aspectLocked: false,
  }),
  /** Entry point path (relative to manifest) */
  entry: z.string().default('index.html'),
  /** Whether widget supports 3D/VR mode */
  spatialSupport: z.boolean().default(false),
  /** Minimum StickerNest version required */
  minPlatformVersion: SemVerSchema.optional(),
});

export type WidgetManifest = z.infer<typeof WidgetManifestSchema>;

/**
 * Widget instance state schema (stored in widget_instances table)
 */
export const WidgetInstanceStateSchema = z.object({
  /** Instance ID */
  instanceId: z.string().uuid(),
  /** Widget ID */
  widgetId: z.string(),
  /** Canvas ID where instance lives */
  canvasId: z.string().uuid(),
  /** User ID who owns this instance */
  userId: z.string().uuid(),
  /** Instance state (max 1MB) */
  state: z.record(z.string(), z.unknown()).default({}),
  /** Instance config overrides */
  config: z.record(z.string(), z.unknown()).default({}),
  /** Creation timestamp */
  createdAt: z.string().datetime(),
  /** Last update timestamp */
  updatedAt: z.string().datetime(),
});

export type WidgetInstanceState = z.infer<typeof WidgetInstanceStateSchema>;

/**
 * User widget state schema (cross-canvas, stored in user_widget_state table)
 */
export const UserWidgetStateSchema = z.object({
  /** User ID */
  userId: z.string().uuid(),
  /** Widget ID */
  widgetId: z.string(),
  /** User state for this widget (max 10MB total per user) */
  state: z.record(z.string(), z.unknown()).default({}),
  /** Last update timestamp */
  updatedAt: z.string().datetime(),
});

export type UserWidgetState = z.infer<typeof UserWidgetStateSchema>;

/**
 * JSON Schema exports for external validation
 */
export const WidgetManifestJSONSchema = WidgetManifestSchema.toJSONSchema();
export const WidgetInstanceStateJSONSchema = WidgetInstanceStateSchema.toJSONSchema();
export const UserWidgetStateJSONSchema = UserWidgetStateSchema.toJSONSchema();
