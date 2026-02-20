/**
 * Lab Editor
 *
 * Abstract editor controller for single-file HTML widgets.
 * Wraps the core editing concerns (content, dirty state, change callbacks)
 * without coupling to a specific editor implementation (Monaco, etc).
 *
 * @module lab/editor
 * @layer L2
 */

export type EditorChangeCallback = (content: string) => void;

export interface LabEditor {
  getContent(): string;
  setContent(html: string): void;
  onChange(cb: EditorChangeCallback): () => void;
  isDirty(): boolean;
  markSaved(): void;
  dispose(): void;
}

export interface LabEditorOptions {
  initialContent?: string;
}

/**
 * Creates a Lab editor controller.
 */
export function createLabEditor(options?: LabEditorOptions): LabEditor {
  let content = options?.initialContent ?? '';
  let savedContent = content;
  let disposed = false;
  const changeCallbacks = new Set<EditorChangeCallback>();

  function notifyChange(): void {
    for (const cb of changeCallbacks) {
      cb(content);
    }
  }

  return {
    getContent() {
      return content;
    },

    setContent(html: string) {
      if (disposed) return;
      content = html;
      notifyChange();
    },

    onChange(cb: EditorChangeCallback) {
      changeCallbacks.add(cb);
      return () => {
        changeCallbacks.delete(cb);
      };
    },

    isDirty() {
      return content !== savedContent;
    },

    markSaved() {
      savedContent = content;
    },

    dispose() {
      disposed = true;
      changeCallbacks.clear();
    },
  };
}
