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

/**
 * Last-Write-Wins resolver: compares two timestamped values and returns the winner.
 * Ties go to the remote value (standard LWW convention for concurrent writes).
 *
 * Used by entity-sync (canvas entities) and note DataSource conflict resolution.
 */
export function resolveLWW<T>(
  local: { value: T; timestamp: number },
  remote: { value: T; timestamp: number },
): T {
  return remote.timestamp >= local.timestamp ? remote.value : local.value;
}

/**
 * Revision-based conflict check: returns true if the write should proceed.
 * Returns false if the server revision has advanced beyond lastSeenRevision (conflict).
 *
 * Used by Table and Custom DataSource conflict resolution.
 */
export function checkRevision(
  lastSeenRevision: number,
  serverRevision: number,
): boolean {
  return serverRevision === lastSeenRevision;
}
