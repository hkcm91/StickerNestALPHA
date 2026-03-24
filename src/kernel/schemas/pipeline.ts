/**
 * Pipeline schemas for Canvas Wiring (L4A-3)
 *
 * Defines the DAG data model: nodes, edges, ports, and the full pipeline.
 * Used by the visual pipeline graph editor and execution engine.
 *
 * @module @sn/types/pipeline
 */

import { z } from 'zod';

import { Point2DSchema } from './spatial';

/**
 * Pipeline port direction
 */
export const PipelinePortDirectionSchema = z.enum(['input', 'output']);
export type PipelinePortDirection = z.infer<typeof PipelinePortDirectionSchema>;

/**
 * Pipeline port — typed input or output on a node
 */
export const PipelinePortSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  direction: PipelinePortDirectionSchema,
  /** Optional JSON Schema for type compatibility checking */
  schema: z.record(z.string(), z.unknown()).optional(),
});

export type PipelinePort = z.infer<typeof PipelinePortSchema>;

/**
 * Pipeline node type enum
 */
export const PipelineNodeTypeSchema = z.enum([
  'widget',
  'filter',
  'map',
  'merge',
  'delay',
  'throttle',
  'debounce',
  'tap',
  'switch',
  'accumulate',
  'ai-transform',
]);

export type PipelineNodeType = z.infer<typeof PipelineNodeTypeSchema>;

/**
 * Pipeline node — represents a widget instance or built-in transform
 */
export const PipelineNodeSchema = z.object({
  id: z.string().min(1),
  type: PipelineNodeTypeSchema,
  /** Widget instance ID (when type === 'widget') */
  widgetInstanceId: z.string().optional(),
  /** Position in canvas space for visual editor */
  position: Point2DSchema,
  /** Transform-specific configuration */
  config: z.record(z.string(), z.unknown()).optional(),
  /** Input ports */
  inputPorts: z.array(PipelinePortSchema),
  /** Output ports */
  outputPorts: z.array(PipelinePortSchema),
});

export type PipelineNode = z.infer<typeof PipelineNodeSchema>;

/**
 * Pipeline edge — connects an output port to an input port
 */
export const PipelineEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  sourcePortId: z.string().min(1),
  targetNodeId: z.string().min(1),
  targetPortId: z.string().min(1),
});

export type PipelineEdge = z.infer<typeof PipelineEdgeSchema>;

/**
 * Full pipeline schema — a directed acyclic graph
 */
export const PipelineSchema = z.object({
  id: z.string().min(1),
  canvasId: z.string().uuid(),
  name: z.string().optional(),
  nodes: z.array(PipelineNodeSchema),
  edges: z.array(PipelineEdgeSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Pipeline = z.infer<typeof PipelineSchema>;

/**
 * JSON Schema exports for external validation
 */
export const PipelinePortJSONSchema = PipelinePortSchema.toJSONSchema();
export const PipelineNodeJSONSchema = PipelineNodeSchema.toJSONSchema();
export const PipelineEdgeJSONSchema = PipelineEdgeSchema.toJSONSchema();
export const PipelineJSONSchema = PipelineSchema.toJSONSchema();
