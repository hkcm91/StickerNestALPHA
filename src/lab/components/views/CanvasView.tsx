/**
 * CanvasView — Full-bleed pipeline canvas with floating prompt bar.
 *
 * The graph editor fills the entire area. Only the AI prompt bar
 * floats on top. Debug mode toggle lives in the icon rail.
 *
 * Preview lives in the Inspector sidebar panel (LabContextSidebar).
 *
 * @module lab/components/views
 * @layer L2
 */

import React from 'react';

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════

export interface CanvasViewProps {
  debugMode: boolean;

  /** The graph editor content — always displayed */
  graphSlot?: React.ReactNode;
  /** The prompt bar (AI input) */
  promptBar?: React.ReactNode;
  /** Live streaming preview — overlays the graph area during AI generation */
  streamingPreview?: React.ReactNode;
  /** Prompt refinement overlay — rendered over the canvas */
  refinementOverlay?: React.ReactNode;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  debugMode,
  graphSlot,
  promptBar,
  streamingPreview,
  refinementOverlay,
}) => {
  return (
    <div style={{
      height: '100%',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div data-debug-mode={debugMode} style={{ position: 'absolute', inset: 0 }}>
        {graphSlot}
      </div>

      {/* Streaming preview — overlays graph during AI generation */}
      {streamingPreview}

      {/* Prompt refinement overlay */}
      {refinementOverlay}

      {/* Floating prompt bar — positioned at bottom center */}
      {promptBar && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          width: '100%',
          maxWidth: 520,
          padding: '0 16px',
          boxSizing: 'border-box',
        }}>
          {promptBar}
        </div>
      )}
    </div>
  );
};
