/**
 * LabEditor — Monaco editor wrapper for single-file HTML widgets.
 *
 * Features:
 * - StickerNest dark theme with design token colors
 * - StickerNest.* SDK autocompletions
 * - Autosave (debounced 2s) with save status indicator
 * - Ctrl/Cmd+S manual save
 * - Unsaved indicator (ember pulse dot)
 * - Error markers from validation results
 *
 * @module lab/components
 * @layer L2
 */

import Editor from '@monaco-editor/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { LabEditor as LabEditorController } from '../editor/editor';
import { useMonaco } from '../hooks/useMonaco';

import { labPalette } from './shared/palette';

// ═══════════════════════════════════════════════════════════════════
// Save Status
// ═══════════════════════════════════════════════════════════════════

type SaveStatus = 'saved' | 'unsaved' | 'saving';

const STATUS_CONFIG: Record<SaveStatus, { label: string; color: string; pulse: boolean }> = {
  saved: { label: 'Saved', color: labPalette.moss, pulse: false },
  unsaved: { label: 'Unsaved', color: labPalette.ember, pulse: true },
  saving: { label: 'Saving...', color: labPalette.storm, pulse: true },
};

const SaveIndicator: React.FC<{ status: SaveStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <div
      role="status"
      aria-label={cfg.label}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: labPalette.textMuted,
        fontFamily: 'var(--sn-font-family)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 6, height: 6, borderRadius: '50%',
          background: cfg.color,
          boxShadow: cfg.pulse ? `0 0 6px ${cfg.color}` : 'none',
          animation: cfg.pulse ? 'sn-breathe 3s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }}
      />
      <span style={{ opacity: status === 'saved' ? 0.5 : 0.8 }}>{cfg.label}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface LabEditorProps {
  /** The Lab editor controller instance */
  editor: LabEditorController;
}

const AUTOSAVE_DELAY = 2000;

export const LabEditorComponent: React.FC<LabEditorProps> = ({ editor: editorController }) => {
  const { handleEditorMount, handleBeforeMount, getEditor } = useMonaco();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from controller to Monaco on external content changes
  useEffect(() => {
    const unsub = editorController.onChange((content) => {
      const monacoEditor = getEditor();
      if (!monacoEditor) return;
      const currentValue = monacoEditor.getValue();
      if (currentValue !== content) {
        monacoEditor.setValue(content);
      }
    });
    return unsub;
  }, [editorController, getEditor]);

  // Autosave logic
  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    editorController.markSaved();
    // Simulate brief save delay for UX feedback
    setTimeout(() => setSaveStatus('saved'), 300);
  }, [editorController]);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(handleSave, AUTOSAVE_DELAY);
  }, [handleSave]);

  // Handle editor content changes
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;
      editorController.setContent(value);
      setSaveStatus('unsaved');
      scheduleAutosave();
    },
    [editorController, scheduleAutosave],
  );

  // Ctrl/Cmd+S manual save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Cleanup autosave timer
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Editor toolbar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        <span style={{
          fontSize: 11, color: labPalette.textMuted,
          fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
          letterSpacing: '0.02em',
        }}>
          widget.html
        </span>
        <SaveIndicator status={saveStatus} />
      </div>

      {/* Monaco editor */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          defaultLanguage="html"
          defaultValue={editorController.getContent()}
          theme="sn-dark"
          beforeMount={handleBeforeMount}
          onMount={handleEditorMount}
          onChange={handleEditorChange}
          loading={
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: labPalette.textMuted, fontSize: 13,
              fontFamily: 'var(--sn-font-family)',
            }}>
              Loading editor...
            </div>
          }
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: '"DM Mono", "Fira Code", "JetBrains Mono", monospace',
            lineHeight: 22,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'gutter',
            bracketPairColorization: { enabled: true },
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
};
