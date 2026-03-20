/**
 * Prototype Mode — Interactive prototyping in the preview pane.
 *
 * When active, clicks in the preview widget generate the next logical
 * screen/state via the AI generator. Maintains a frame tree
 * (branching history, not just linear) for back/forward navigation.
 *
 * @module lab/preview
 * @layer L2
 */

import type { WidgetDesignSpec } from '@sn/types';

import type { AIGenerator } from '../ai/ai-generator';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface PrototypeFrame {
  id: string;
  html: string;
  clickTarget: string;
  prompt: string;
  parentFrameId: string | null;
  createdAt: number;
}

export interface PrototypeSession {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  getHistory(): PrototypeFrame[];
  getCurrentFrame(): PrototypeFrame | null;
  goBack(): PrototypeFrame | null;
  goForward(): PrototypeFrame | null;
  handleClick(clickTarget: string, textContent: string): Promise<PrototypeFrame | null>;
  onFrameChange(cb: (frame: PrototypeFrame | null) => void): () => void;
  isGenerating(): boolean;
  destroy(): void;
}

// ═══════════════════════════════════════════════════════════════════
// Click Interception Script
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns a script to inject into the iframe srcdoc that intercepts clicks
 * and emits prototype.click events via the standard bridge EMIT path.
 */
export function getPrototypeClickScript(): string {
  return `
<script data-sn-prototype>
(function() {
  document.addEventListener('click', function(e) {
    var target = e.target;
    if (!target || !target.tagName) return;
    var selector = target.tagName.toLowerCase();
    if (target.id) selector += '#' + target.id;
    else if (target.className && typeof target.className === 'string') {
      selector += '.' + target.className.trim().split(/\\s+/).join('.');
    }
    var text = (target.textContent || '').trim().slice(0, 100);
    var rect = target.getBoundingClientRect();
    if (window.StickerNest && window.StickerNest.emit) {
      window.StickerNest.emit('prototype.click', {
        selector: selector,
        textContent: text,
        boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      });
    }
    e.preventDefault();
    e.stopPropagation();
  }, true);
})();
</script>`;
}

// ═══════════════════════════════════════════════════════════════════
// Session
// ═══════════════════════════════════════════════════════════════════

/**
 * Creates a prototype session.
 *
 * @param generator - AI generator for producing next screens
 * @param baseHtml - Initial widget HTML
 * @param designSpec - Optional design spec carried through frames
 */
export function createPrototypeSession(
  generator: AIGenerator,
  baseHtml: string,
  designSpec?: WidgetDesignSpec,
): PrototypeSession {
  let enabled = false;
  let generating = false;
  const frames: PrototypeFrame[] = [];
  let currentIndex = -1;
  const subscribers = new Set<(frame: PrototypeFrame | null) => void>();

  // Create root frame
  const rootFrame: PrototypeFrame = {
    id: `frame-${Date.now()}`,
    html: baseHtml,
    clickTarget: '',
    prompt: '',
    parentFrameId: null,
    createdAt: Date.now(),
  };
  frames.push(rootFrame);
  currentIndex = 0;

  function notify(): void {
    const current = currentIndex >= 0 ? frames[currentIndex] : null;
    for (const cb of subscribers) {
      cb(current);
    }
  }

  return {
    enable() {
      enabled = true;
    },

    disable() {
      enabled = false;
    },

    isEnabled() {
      return enabled;
    },

    getHistory() {
      return [...frames];
    },

    getCurrentFrame() {
      return currentIndex >= 0 ? frames[currentIndex] : null;
    },

    goBack() {
      if (currentIndex <= 0) return null;
      const current = frames[currentIndex];
      if (!current.parentFrameId) return null;

      const parentIdx = frames.findIndex((f) => f.id === current.parentFrameId);
      if (parentIdx === -1) return null;

      currentIndex = parentIdx;
      notify();
      return frames[currentIndex];
    },

    goForward() {
      // Find the first child of the current frame
      const current = frames[currentIndex];
      if (!current) return null;

      const childIdx = frames.findIndex((f) => f.parentFrameId === current.id);
      if (childIdx === -1) return null;

      currentIndex = childIdx;
      notify();
      return frames[currentIndex];
    },

    async handleClick(clickTarget: string, textContent: string): Promise<PrototypeFrame | null> {
      if (!enabled || generating) return null;

      const current = frames[currentIndex];
      if (!current) return null;

      generating = true;

      const designContext = designSpec
        ? `\nDesign system: ${JSON.stringify(designSpec.colors ?? {})}`
        : '';

      const prompt = `The user clicked on [${clickTarget}] ("${textContent}") in this widget. Generate the next logical screen/state. Output valid single-file HTML widget.${designContext}\n\nCurrent widget:\n\`\`\`html\n${current.html}\n\`\`\``;

      try {
        const result = await generator.generate(prompt);
        if (!result.isValid || !result.html) {
          generating = false;
          return null;
        }

        const newFrame: PrototypeFrame = {
          id: `frame-${Date.now()}`,
          html: result.html,
          clickTarget,
          prompt,
          parentFrameId: current.id,
          createdAt: Date.now(),
        };

        frames.push(newFrame);
        currentIndex = frames.length - 1;
        generating = false;
        notify();
        return newFrame;
      } catch {
        generating = false;
        return null;
      }
    },

    onFrameChange(cb: (frame: PrototypeFrame | null) => void): () => void {
      subscribers.add(cb);
      return () => { subscribers.delete(cb); };
    },

    isGenerating() {
      return generating;
    },

    destroy() {
      enabled = false;
      generating = false;
      frames.length = 0;
      currentIndex = -1;
      subscribers.clear();
    },
  };
}
