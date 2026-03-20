/**
 * AISlidePanel — Slide-out panel from the right edge wrapping AIThread.
 *
 * Replaces the floating bottom-right positioning with a full-height
 * slide-out panel. Uses spring animation for open/close transitions.
 * Glassmorphism styling consistent with GlassPanel.
 *
 * @module lab/components/LabAI
 * @layer L2
 */

import React, { useCallback, useEffect, useRef } from 'react';

import type { AIGenerator } from '../../ai/ai-generator';
import { labPalette, SPRING } from '../shared/palette';

import { AIThread } from './AIThread';

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const PANEL_WIDTH = 380;

// Spring animation CSS — approximates a spring with stiffness: 200, damping: 25
// using cubic-bezier. The SPRING constant from palette is close enough.
const SLIDE_DURATION_MS = 350;

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface AISlidePanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Called when the panel should close */
  onClose: () => void;
  /** AI generator instance */
  generator?: AIGenerator;
  /** Called when generated code should be applied to the editor */
  onApplyCode?: (code: string) => void;
  /** Current editor content for edit mode */
  currentEditorContent?: string;
  /** Graph context for pipeline-aware prompts */
  graphContext?: string;
  /** Auto-submitted prompt (opens panel and sends immediately) */
  pendingPrompt?: string | null;
  /** Called after pending prompt is consumed */
  onPendingPromptConsumed?: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export const AISlidePanel: React.FC<AISlidePanelProps> = ({
  open,
  onClose,
  generator,
  onApplyCode,
  currentEditorContent,
  graphContext,
  pendingPrompt,
  onPendingPromptConsumed,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus trap: focus the panel when it opens
  useEffect(() => {
    if (open && panelRef.current) {
      // Focus the first focusable element inside the panel
      const focusable = panelRef.current.querySelector<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }
  }, [open]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if clicking the backdrop itself, not the panel content
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Always render for animation — use visibility and transform
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: open ? PANEL_WIDTH : 0,
        zIndex: 60,
        pointerEvents: open ? 'auto' : 'none',
        overflow: 'hidden',
      }}
      onClick={handleBackdropClick}
      data-testid="ai-slide-panel-container"
    >
      {/* Panel body */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="AI Companion thread"
        aria-hidden={!open}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: PANEL_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          background: `
            linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 50%),
            var(--sn-surface-glass, rgba(20,17,24,0.85))
          `,
          backdropFilter: 'blur(24px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          boxShadow: open
            ? '-8px 0 32px rgba(0,0,0,0.3), -2px 0 8px rgba(0,0,0,0.15), inset 1px 0 0 rgba(255,255,255,0.03)'
            : 'none',
          transform: open ? 'translateX(0)' : `translateX(${PANEL_WIDTH}px)`,
          transition: `transform ${SLIDE_DURATION_MS}ms ${SPRING}, box-shadow ${SLIDE_DURATION_MS}ms ${SPRING}`,
          overflow: 'hidden',
        }}
      >
        {/* Panel header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            background: 'rgba(0,0,0,0.1)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Status indicator */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: generator?.isGenerating()
                  ? labPalette.ember
                  : 'rgba(78,123,142,0.5)',
                boxShadow: generator?.isGenerating()
                  ? '0 0 8px rgba(232,128,108,0.4)'
                  : '0 0 4px rgba(78,123,142,0.2)',
              }}
              aria-hidden="true"
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: labPalette.text,
                fontFamily: 'var(--sn-font-family)',
              }}
            >
              AI Companion
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close AI panel"
            style={{
              padding: '2px 8px',
              fontSize: 14,
              color: labPalette.textMuted,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 4,
              transition: `color 200ms ${SPRING}`,
            }}
          >
            {'\u00D7'}
          </button>
        </div>

        {/* Thread content — only render when open for performance */}
        {open && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <AIThread
              generator={generator}
              onApplyCode={onApplyCode}
              onClose={onClose}
              currentEditorContent={currentEditorContent}
              graphContext={graphContext}
              pendingPrompt={pendingPrompt}
              onPendingPromptConsumed={onPendingPromptConsumed}
            />
          </div>
        )}
      </div>
    </div>
  );
};
