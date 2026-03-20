/**
 * LabVersions — Version history panel for the Widget Lab.
 *
 * Timeline list of snapshots with:
 * - Save snapshot button (label input dialog)
 * - Timeline display with glow-on-hover rows
 * - Restore confirmation modal
 * - Delete action
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useEffect, useState } from 'react';

import type { VersionManager, VersionSnapshot } from '../versions/version-manager';

import { labPalette, SPRING } from './shared/palette';

// ═══════════════════════════════════════════════════════════════════
// Save Dialog
// ═══════════════════════════════════════════════════════════════════

const SaveDialog: React.FC<{
  onSave: (label: string) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [label, setLabel] = useState('');

  return (
    <div style={{
      padding: 12, background: 'rgba(0,0,0,0.3)',
      borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', gap: 8, alignItems: 'center',
      animation: `sn-drift-up 300ms ${SPRING} both`,
    }}>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Snapshot label..."
        aria-label="Snapshot label"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && label.trim()) onSave(label.trim());
          if (e.key === 'Escape') onCancel();
        }}
        style={{
          flex: 1, padding: '6px 10px', fontSize: 12,
          fontFamily: 'var(--sn-font-family)', color: labPalette.text,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 6, outline: 'none',
        }}
      />
      <button
        onClick={() => label.trim() && onSave(label.trim())}
        disabled={!label.trim()}
        style={{
          padding: '6px 12px', fontSize: 11, fontWeight: 500,
          fontFamily: 'var(--sn-font-family)', color: '#fff',
          background: labPalette.storm, border: 'none', borderRadius: 6,
          cursor: label.trim() ? 'pointer' : 'not-allowed',
          opacity: label.trim() ? 1 : 0.4,
        }}
      >
        Save
      </button>
      <button
        onClick={onCancel}
        style={{
          padding: '6px 8px', fontSize: 11, color: labPalette.textMuted,
          background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Confirm Modal
// ═══════════════════════════════════════════════════════════════════

const ConfirmModal: React.FC<{
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ label, onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
  }}>
    <div style={{
      padding: 24, maxWidth: 360, borderRadius: 14,
      background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      animation: `sn-unfold 300ms ${SPRING} both`,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 14, fontWeight: 600, color: labPalette.text,
        fontFamily: 'var(--sn-font-family)', marginBottom: 8,
      }}>
        Restore snapshot?
      </div>
      <div style={{
        fontSize: 12, color: labPalette.textMuted,
        fontFamily: 'var(--sn-font-family)', marginBottom: 16, lineHeight: 1.6,
      }}>
        This will overwrite your current state with <strong style={{ color: labPalette.textSoft }}>"{label}"</strong>.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 20px', fontSize: 12, fontWeight: 500,
            fontFamily: 'var(--sn-font-family)', color: labPalette.textMuted,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: '8px 20px', fontSize: 12, fontWeight: 500,
            fontFamily: 'var(--sn-font-family)', color: '#fff',
            background: labPalette.storm, border: 'none',
            borderRadius: 8, cursor: 'pointer',
          }}
        >
          Restore
        </button>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// Timeline Row
// ═══════════════════════════════════════════════════════════════════

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const TimelineRow: React.FC<{
  snapshot: VersionSnapshot;
  onRestore: () => void;
  onDelete: () => void;
}> = ({ snapshot, onRestore, onDelete }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 8,
        background: hovered ? 'rgba(255,255,255,0.02)' : 'transparent',
        transition: `background 150ms`,
        position: 'relative',
      }}
    >
      {/* Timeline dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: labPalette.storm,
        boxShadow: hovered ? '0 0 8px rgba(78,123,142,0.4)' : '0 0 3px rgba(78,123,142,0.15)',
        transition: `box-shadow 300ms ${SPRING}`,
        flexShrink: 0,
      }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 500, color: labPalette.text,
          fontFamily: 'var(--sn-font-family)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {snapshot.label}
        </div>
        <div style={{
          fontSize: 10, color: labPalette.textMuted,
          fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
        }}>
          {formatDate(snapshot.createdAt)}
        </div>
      </div>

      {/* Actions (visible on hover) */}
      {hovered && (
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={onRestore}
            aria-label={`Restore ${snapshot.label}`}
            style={{
              padding: '3px 8px', fontSize: 10, fontWeight: 500,
              fontFamily: 'var(--sn-font-family)', color: labPalette.storm,
              background: 'rgba(78,123,142,0.08)',
              border: '1px solid rgba(78,123,142,0.15)',
              borderRadius: 4, cursor: 'pointer',
            }}
          >
            Restore
          </button>
          <button
            onClick={onDelete}
            aria-label={`Delete ${snapshot.label}`}
            style={{
              padding: '3px 6px', fontSize: 10,
              color: labPalette.textMuted, background: 'none',
              border: 'none', cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface LabVersionsProps {
  versions: VersionManager;
  /** Called when user restores a snapshot */
  onRestore?: (snapshot: VersionSnapshot) => void;
  /** Current HTML for saving */
  currentHtml?: string;
  /** Current manifest for saving */
  currentManifest?: any;
}

export const LabVersionsComponent: React.FC<LabVersionsProps> = ({
  versions,
  onRestore,
  currentHtml,
  currentManifest,
}) => {
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSave, setShowSave] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<VersionSnapshot | null>(null);

  const loadSnapshots = useCallback(async () => {
    try {
      const list = await versions.list();
      setSnapshots(list);
    } catch {
      // Silently handle — may not have DB connection in dev
    } finally {
      setLoading(false);
    }
  }, [versions]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const handleSave = useCallback(async (label: string) => {
    if (!currentHtml || !currentManifest) return;
    try {
      await versions.save(label, currentHtml, currentManifest);
      setShowSave(false);
      loadSnapshots();
    } catch {
      // Handle error silently for now
    }
  }, [versions, currentHtml, currentManifest, loadSnapshots]);

  const handleRestore = useCallback(async (snapshot: VersionSnapshot) => {
    setConfirmRestore(null);
    onRestore?.(snapshot);
  }, [onRestore]);

  const handleDelete = useCallback(async (id: string) => {
    await versions.delete(id);
    loadSnapshots();
  }, [versions, loadSnapshots]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(0,0,0,0.15)',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: labPalette.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.14em',
        }}>
          Versions
        </span>
        <button
          onClick={() => setShowSave(true)}
          style={{
            padding: '4px 12px', fontSize: 10, fontWeight: 500,
            fontFamily: 'var(--sn-font-family)', color: '#fff',
            background: labPalette.storm, border: 'none',
            borderRadius: 6, cursor: 'pointer',
          }}
        >
          Save Snapshot
        </button>
      </div>

      {/* Save dialog */}
      {showSave && (
        <div style={{ padding: '8px 12px' }}>
          <SaveDialog
            onSave={handleSave}
            onCancel={() => setShowSave(false)}
          />
        </div>
      )}

      {/* Timeline */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {loading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: labPalette.textFaint, fontSize: 11,
          }}>
            Loading...
          </div>
        ) : snapshots.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 8,
          }}>
            <div style={{
              fontSize: 28, opacity: 0.2,
              fontFamily: 'var(--sn-font-serif, Newsreader, Georgia, serif)',
            }}>
              ◇
            </div>
            <div style={{
              fontSize: 12, color: labPalette.textFaint,
              fontFamily: 'var(--sn-font-family)',
            }}>
              No snapshots yet
            </div>
          </div>
        ) : (
          // Timeline with left border
          <div style={{
            marginLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.04)',
            paddingLeft: 4,
          }}>
            {snapshots.map((s) => (
              <TimelineRow
                key={s.id}
                snapshot={s}
                onRestore={() => setConfirmRestore(s)}
                onDelete={() => handleDelete(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Restore confirmation modal */}
      {confirmRestore && (
        <ConfirmModal
          label={confirmRestore.label}
          onConfirm={() => handleRestore(confirmRestore)}
          onCancel={() => setConfirmRestore(null)}
        />
      )}
    </div>
  );
};
