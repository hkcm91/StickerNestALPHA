/**
 * AICompanion — Main AI wrapper: floating orb + expandable thread panel.
 *
 * Bottom-right positioned. Orb visible when collapsed,
 * expands to AIThread panel on click or Cmd+K.
 *
 * @module lab/components/LabAI
 * @layer L2
 */

import React, { useCallback, useEffect, useState } from 'react';

import type { AIGenerator } from '../../ai/ai-generator';
import { SPRING } from '../shared/palette';

import { AIOrb } from './AIOrb';
import { AIThread } from './AIThread';

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface AICompanionProps {
  generator?: AIGenerator;
  onApplyCode?: (code: string) => void;
  currentEditorContent?: string;
  graphContext?: string;
  /** Auto-submitted prompt (opens companion and sends immediately) */
  pendingPrompt?: string | null;
  /** Called after pending prompt is consumed */
  onPendingPromptConsumed?: () => void;
}

export const AICompanion: React.FC<AICompanionProps> = ({
  generator,
  onApplyCode,
  currentEditorContent,
  graphContext,
  pendingPrompt,
  onPendingPromptConsumed,
}) => {
  const [expanded, setExpanded] = useState(false);
  const generating = generator?.isGenerating() ?? false;

  // Auto-expand and forward pending prompt
  useEffect(() => {
    if (pendingPrompt) {
      setExpanded(true);
    }
  }, [pendingPrompt]);

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setExpanded((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = useCallback(() => {
    setExpanded(false);
  }, []);

  return (
    <div style={{
      position: 'absolute',
      bottom: 16, right: 16,
      zIndex: 50,
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-end', gap: 8,
    }}>
      {/* Thread panel */}
      {expanded && (
        <div style={{
          animation: `sn-drift-up 350ms ${SPRING} both`,
        }}>
          <AIThread
            generator={generator}
            onApplyCode={onApplyCode}
            onClose={handleClose}
            currentEditorContent={currentEditorContent}
            graphContext={graphContext}
            pendingPrompt={pendingPrompt}
            onPendingPromptConsumed={onPendingPromptConsumed}
          />
        </div>
      )}

      {/* Orb (always visible) */}
      <AIOrb
        generating={generating}
        onClick={() => setExpanded(!expanded)}
      />
    </div>
  );
};
