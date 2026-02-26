/**
 * Pathfinder Widget - Barrel Export
 *
 * Re-exports all public API from this widget module.
 *
 * @module runtime/widgets/pathfinder
 */

// Widget component and manifest
export {
  PathfinderWidget,
  PathfinderWidget as default,
  pathfinderManifest,
  type PathfinderWidgetProps,
} from './pathfinder.widget';

// Configuration schema and types
export {
  pathfinderConfigSchema,
  pathfinderDefaultConfig,
  parsePathfinderConfig,
  safeParsePathfinderConfig,
  type PathfinderConfig,
} from './pathfinder.schema';

// Event definitions and types
export {
  PATHFINDER_EVENTS,
  type PathfinderEventPayloads,
  type PathfinderEmitPayloads,
  type PathfinderSubscribePayloads,
  type PathfinderEmitEventType,
  type PathfinderSubscribeEventType,
  type PathfinderEventType,
} from './pathfinder.events';
