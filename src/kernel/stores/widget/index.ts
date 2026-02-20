/**
 * Widget Store — Barrel Export
 * @module kernel/stores/widget
 */

export {
  useWidgetStore,
  setupWidgetBusSubscriptions,
} from './widget.store';

export type {
  WidgetRegistryEntry,
  WidgetInstance,
  WidgetState,
  WidgetActions,
  WidgetStore,
} from './widget.store';
