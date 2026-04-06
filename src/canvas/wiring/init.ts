/**
 * Canvas Wiring — initialization
 *
 * @module canvas/wiring
 * @layer L4A-3
 */

import type { BusEvent, MarketplacePipelineTemplate } from '@sn/types';
import { MarketplaceEvents } from '@sn/types';

import { bus } from '../../kernel/bus';

import { createAnimationTriggers } from './animation-triggers';
import type { AnimationTriggersContext } from './animation-triggers';
import { createExecutionEngine } from './engine';
import type { ExecutionEngine } from './engine';
import { createPipelineGraph } from './graph';
import type { PipelineGraph } from './graph';
import { createPipelinePersistence } from './persistence';
import type { PipelinePersistence } from './persistence';
import { exportPipelineAsTemplate } from './template';
import type { WidgetResolutionEntry } from './template';
import { hydratePipelineTemplate } from './template';

export interface CanvasWiringContext {
  graph: PipelineGraph;
  engine: ExecutionEngine;
  persistence: PipelinePersistence;
  animationTriggers: AnimationTriggersContext | null;
}

let context: CanvasWiringContext | null = null;
const busUnsubscribes: Array<() => void> = [];

// ─── Bus Event Payload Types ─────────────────────────────────────────

interface TemplateExportRequestPayload {
  pipelineId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  widgetResolution: Record<string, WidgetResolutionEntry>;
  configSchema?: Record<string, unknown>;
  configMapping?: Record<string, string>;
  estimatedCostPerRun?: string;
}

interface TemplateInstallRequestPayload {
  template: MarketplacePipelineTemplate;
  canvasId: string;
  widgetInstanceMapping: Record<string, string>;
  configValues?: Record<string, unknown>;
  positionOffset?: { x: number; y: number };
}

// ─── Template Bus Subscriptions ──────────────────────────────────────

function setupTemplateBusSubscriptions(ctx: CanvasWiringContext): void {
  // Handle export requests from Shell/L6
  const unsubExport = bus.subscribe(
    MarketplaceEvents.TEMPLATE_EXPORT_REQUEST,
    async (event: BusEvent) => {
      const payload = event.payload as TemplateExportRequestPayload;

      try {
        const pipeline = await ctx.persistence.load(payload.pipelineId);
        if (!pipeline) {
          bus.emit(MarketplaceEvents.TEMPLATE_EXPORT_RESPONSE, {
            success: false,
            error: `Pipeline "${payload.pipelineId}" not found`,
          });
          return;
        }

        const template = exportPipelineAsTemplate(pipeline, {
          widgetResolution: new Map(Object.entries(payload.widgetResolution)),
          configSchema: payload.configSchema as any,
          configMapping: payload.configMapping,
          estimatedCostPerRun: payload.estimatedCostPerRun,
        });

        bus.emit(MarketplaceEvents.TEMPLATE_EXPORT_RESPONSE, {
          success: true,
          template,
        });
      } catch (err) {
        bus.emit(MarketplaceEvents.TEMPLATE_EXPORT_RESPONSE, {
          success: false,
          error: err instanceof Error ? err.message : 'Export failed',
        });
      }
    },
  );
  busUnsubscribes.push(unsubExport);

  // Handle install requests from Marketplace/L5
  const unsubInstall = bus.subscribe(
    MarketplaceEvents.TEMPLATE_INSTALL_REQUEST,
    async (event: BusEvent) => {
      const payload = event.payload as TemplateInstallRequestPayload;

      try {
        const pipeline = hydratePipelineTemplate(payload.template, {
          canvasId: payload.canvasId,
          widgetInstanceMapping: new Map(Object.entries(payload.widgetInstanceMapping)),
          configValues: payload.configValues,
          positionOffset: payload.positionOffset,
        });

        await ctx.persistence.save(pipeline);

        // Load the hydrated pipeline into the graph
        for (const node of pipeline.nodes) {
          ctx.graph.addNode(node);
        }
        for (const edge of pipeline.edges) {
          ctx.graph.addEdge(edge);
        }

        bus.emit(MarketplaceEvents.TEMPLATE_INSTALL_RESPONSE, {
          success: true,
          pipelineId: pipeline.id,
        });

        bus.emit(MarketplaceEvents.TEMPLATE_INSTALLED, {
          pipelineId: pipeline.id,
          canvasId: payload.canvasId,
        });
      } catch (err) {
        bus.emit(MarketplaceEvents.TEMPLATE_INSTALL_RESPONSE, {
          success: false,
          error: err instanceof Error ? err.message : 'Template installation failed',
        });
      }
    },
  );
  busUnsubscribes.push(unsubInstall);
}

// ─── Init / Teardown ─────────────────────────────────────────────────

export function initCanvasWiring(): CanvasWiringContext {
  if (context) return context;

  const graph = createPipelineGraph();
  const engine = createExecutionEngine(graph);
  const persistence = createPipelinePersistence();

  engine.start();

  // Animation triggers are initialized lazily when an orchestrator is available.
  // The orchestrator is created by the world system and injected via
  // initAnimationTriggers() after world setup.
  context = { graph, engine, persistence, animationTriggers: null };

  setupTemplateBusSubscriptions(context);

  return context;
}

export function initAnimationTriggers(
  orchestrator: Parameters<typeof createAnimationTriggers>[0],
): AnimationTriggersContext | null {
  if (!context) return null;
  if (context.animationTriggers) return context.animationTriggers;
  context.animationTriggers = createAnimationTriggers(orchestrator);
  return context.animationTriggers;
}

export function teardownCanvasWiring(): void {
  for (const unsub of busUnsubscribes) {
    unsub();
  }
  busUnsubscribes.length = 0;

  if (context) {
    context.engine.stop();
    context.animationTriggers?.destroy();
  }
  context = null;
}

export function isCanvasWiringInitialized(): boolean {
  return context !== null;
}
