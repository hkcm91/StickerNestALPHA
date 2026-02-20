/**
 * Conflict Resolution Strategy Router
 *
 * Routes to the correct conflict resolution strategy per data type:
 * - Canvas entities: LWW silent
 * - Doc DataSources: Yjs CRDT
 * - Table/Custom DataSources: Revision-based with 409
 * - Note DataSources: LWW silent
 *
 * @module social/conflict
 * @layer L1
 * @see .claude/rules/L1-social.md
 */

/**
 * Available conflict resolution strategies.
 */
export type ConflictStrategy =
  | 'lww-silent'
  | 'yjs-crdt'
  | 'revision-based'
  | 'lww-no-indicator';

/**
 * DataSource types that map to conflict strategies.
 */
export type DataSourceType = 'doc' | 'table' | 'note' | 'folder' | 'file' | 'custom';

/**
 * Returns the conflict resolution strategy for a given data type.
 *
 * @param type - The DataSource type
 * @returns The appropriate conflict strategy
 */
export function getStrategyForType(type: DataSourceType | 'entity'): ConflictStrategy {
  switch (type) {
    case 'entity':
      return 'lww-silent';
    case 'doc':
      return 'yjs-crdt';
    case 'table':
    case 'custom':
      return 'revision-based';
    case 'note':
      return 'lww-no-indicator';
    case 'folder':
    case 'file':
      return 'lww-silent';
  }
}
