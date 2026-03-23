/**
 * Canvas Picker Dialog — lets user choose which canvas to place a widget on.
 *
 * Used when accepting a widget connection invite.
 *
 * @module shell/components
 * @layer L6
 */

import React, { useEffect, useState } from 'react';

import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { supabase } from '../../kernel/supabase';
import { palette, themeVar } from '../theme/theme-vars';

import { Modal } from './Modal';

interface CanvasListItem {
  id: string;
  name: string;
}

export interface CanvasPickerDialogProps {
  onSelect: (canvasId: string) => void;
  onClose: () => void;
}

export const CanvasPickerDialog: React.FC<CanvasPickerDialogProps> = ({
  onSelect,
  onClose,
}) => {
  const userId = useAuthStore((s) => s.user?.id);
  const [canvases, setCanvases] = useState<CanvasListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCanvases() {
      if (userId) {
        const { data } = await supabase
          .from('canvases')
          .select('id, name')
          .eq('owner_id', userId)
          .order('name', { ascending: true })
          .limit(100);

        if (data && data.length > 0) {
          setCanvases(data as CanvasListItem[]);
          setLoading(false);
          return;
        }
      }

      // Dev fallback — show placeholder canvases when no auth or no DB results
      if (import.meta.env.DEV) {
        setCanvases([
          { id: 'canvas-main', name: "Kimber's Workspace" },
          { id: 'canvas-projects', name: 'Projects Board' },
          { id: 'canvas-sandbox', name: 'Sandbox' },
        ]);
      }
      setLoading(false);
    }

    loadCanvases();
  }, [userId]);

  return (
    <Modal isOpen onClose={onClose} title="Choose a Canvas" maxWidth={400}>
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: palette.textMuted }}>
          Loading canvases...
        </div>
      ) : canvases.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: palette.textMuted }}>
          No canvases found. Create a canvas first.
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {canvases.map((canvas) => (
            <button
              key={canvas.id}
              data-testid={`canvas-option-${canvas.id}`}
              onClick={() => onSelect(canvas.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: themeVar('--sn-font-family'),
                fontSize: '14px',
                color: palette.text,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = palette.surfaceRaised;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {canvas.name || 'Untitled Canvas'}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
};
