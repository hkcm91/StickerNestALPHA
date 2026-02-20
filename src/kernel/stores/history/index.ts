/**
 * History Store — Barrel Export
 * @module kernel/stores/history
 */

export {
  useHistoryStore,
  selectCanUndo,
  selectCanRedo,
  setupHistoryBusSubscriptions,
} from './history.store';

export type {
  HistoryEntry,
  HistoryState,
  HistoryActions,
  HistoryStore,
} from './history.store';
