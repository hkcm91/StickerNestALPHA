/**
 * Canvas persistence recovery utilities.
 *
 * Cleans corrupt localStorage canvas documents by filtering out entities
 * with invalid UUID fields that would cause deserialization to fail.
 *
 * @module shell/canvas/hooks
 * @layer L6
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Pre-clean a stored canvas document by removing entities with invalid UUIDs.
 * Returns true if the document was modified and re-saved.
 */
export function cleanCorruptEntities(storageKey: string): boolean {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return false;

  try {
    const doc = JSON.parse(raw) as { entities?: Array<{ id?: string }> };
    if (!Array.isArray(doc.entities) || doc.entities.length === 0) return false;

    const before = doc.entities.length;
    doc.entities = doc.entities.filter(
      (e) => typeof e.id === 'string' && UUID_RE.test(e.id),
    );

    if (doc.entities.length < before) {
      console.log(
        `[Persistence] Pre-cleaned ${before - doc.entities.length} invalid entities from ${storageKey}`,
      );
      localStorage.setItem(storageKey, JSON.stringify(doc));
      return true;
    }
  } catch {
    // Leave raw data as-is if parsing fails
  }

  return false;
}
