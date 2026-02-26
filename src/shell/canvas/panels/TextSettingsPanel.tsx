/**
 * Text Settings Panel - selection-aware placeholder for text controls.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useMemo } from 'react';

import type { CanvasEntity } from '@sn/types';

import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { useSelection } from '../hooks';

export interface TextSettingsPanelProps {
  /** All current entities (from scene graph). */
  entities: CanvasEntity[];
}

/**
 * Text Settings Panel.
 * Keeps the sidebar layout stable and can be expanded with full text-editing controls.
 */
export const TextSettingsPanel: React.FC<TextSettingsPanelProps> = ({ entities }) => {
  const mode = useUIStore((s) => s.canvasInteractionMode);
  const { selectedIds } = useSelection();

  const selectedTextCount = useMemo(
    () =>
      entities.filter(
        (entity) => selectedIds.has(entity.id) && (entity.type === 'text' || entity.type === 'sticker'),
      ).length,
    [entities, selectedIds],
  );

  if (mode !== 'edit') return null;

  return (
    <div
      data-testid="text-settings-panel"
      style={{
        padding: '12px',
        borderTop: '1px solid var(--sn-border, #e0e0e0)',
        color: 'var(--sn-text-muted, #6b7280)',
        fontFamily: 'var(--sn-font-family, system-ui)',
        fontSize: '12px',
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '6px',
        }}
      >
        Text
      </div>
      {selectedTextCount > 0
        ? `${selectedTextCount} text item${selectedTextCount === 1 ? '' : 's'} selected`
        : 'Select a text entity to edit typography settings'}
    </div>
  );
};

