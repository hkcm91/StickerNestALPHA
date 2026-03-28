/**
 * Toolbar — floating island + slide-out tool menu.
 * Wraps the headless ToolbarController from L4A-4.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { GridConfig, ViewportConfig } from '@sn/types';
import { CanvasEvents, GridEvents } from '@sn/types';

import { DEFAULT_GRID_CONFIG } from '../../../canvas/core';
import { bus } from '../../../kernel/bus';
import { useDockerStore } from '../../../kernel/stores/docker';
import { useHistoryStore, selectCanUndo, selectCanRedo } from '../../../kernel/stores/history/history.store';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { enterXR } from '../../../spatial';
import { PresenceAvatarBar } from '../components/PresenceAvatarBar';
import type { SaveStatus } from '../hooks/usePersistence';
import type { ViewportStore } from '../hooks/useViewport';

import { CanvasSettingsDropdown } from './CanvasSettingsDropdown';
import type { CanvasPositionConfig } from './CanvasSettingsDropdown';

export interface ToolbarProps {
  viewportStore: ViewportStore;
  saveStatus?: SaveStatus;
  onSave?: () => void;
  canvasName?: string;
  onRename?: (newName: string) => void;
  viewportConfig?: ViewportConfig;
  borderRadius?: number;
  canvasPosition?: CanvasPositionConfig;
  selectedIds?: Set<string>;
  onCaptureThumbnail?: () => void;
}

const DOCKER_LIBRARY_NAME = 'Docker Library';

// ── Icons ────────────────────────────────────────────────────────

const SelectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    <path d="M13 13l6 6" />
  </svg>
);

const PanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

const ArtboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);

const PenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l5 5" />
    <path d="M11 11l1 1" />
  </svg>
);

const TextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

const RectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
);

const PathfinderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M2 12h20" />
  </svg>
);

const UndoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const RedoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const AlignLeftIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="2" x2="4" y2="22" /><rect x="8" y="6" width="12" height="4" rx="1" /><rect x="8" y="14" width="8" height="4" rx="1" /></svg>);
const AlignCenterHIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22" /><rect x="5" y="6" width="14" height="4" rx="1" /><rect x="7" y="14" width="10" height="4" rx="1" /></svg>);
const AlignRightIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="20" y1="2" x2="20" y2="22" /><rect x="4" y="6" width="12" height="4" rx="1" /><rect x="8" y="14" width="8" height="4" rx="1" /></svg>);
const AlignTopIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="4" x2="22" y2="4" /><rect x="6" y="8" width="4" height="12" rx="1" /><rect x="14" y="8" width="4" height="8" rx="1" /></svg>);
const AlignCenterVIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="12" x2="22" y2="12" /><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="7" width="4" height="10" rx="1" /></svg>);
const AlignBottomIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="20" x2="22" y2="20" /><rect x="6" y="4" width="4" height="12" rx="1" /><rect x="14" y="8" width="4" height="8" rx="1" /></svg>);
const XRGogglesIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-3.5a2 2 0 0 1-1.7-1l-1.6-2.6a2 2 0 0 0-3.4 0L8.2 15a2 2 0 0 1-1.7 1H4a2 2 0 0 1-2-2v-4z" /></svg>);
const CutIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>);
const CopyIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>);
const PasteIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>);
const DistributeHIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="4" height="12" rx="1" /><rect x="10" y="4" width="4" height="16" rx="1" /><rect x="19" y="6" width="4" height="12" rx="1" /></svg>);
const DistributeVIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="1" width="12" height="4" rx="1" /><rect x="4" y="10" width="16" height="4" rx="1" /><rect x="6" y="19" width="12" height="4" rx="1" /></svg>);
const MatchSizeIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="8" height="16" rx="1" /><rect x="14" y="4" width="8" height="16" rx="1" /></svg>);
const FlipHIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M16 7h5l-5 10V7z" /><path d="M8 7H3l5 10V7z" /></svg>);
const FlipVIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20" /><path d="M7 8V3l10 5H7z" /><path d="M7 16v5l10-5H7z" /></svg>);
const GalleryIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>);
const StickerIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" /><polyline points="14 3 14 8 21 8" /></svg>);
const ClearIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>);
const DockIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="15" x2="21" y2="15" /></svg>);
const LayersIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>);
const GridIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>);
const SettingsIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>);
const CameraIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>);
const FullscreenIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>);
const MenuIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>);
const CloseIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}><polyline points="6 9 12 15 18 9" /></svg>);

export const XRIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="7" cy="12" r="2" />
    <circle cx="17" cy="12" r="2" />
    <path d="M12 15v3" />
  </svg>
);

interface ToolDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
}

const PRIMARY_TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select', icon: <SelectIcon />, shortcut: 'V' },
  { id: 'pan', label: 'Pan', icon: <PanIcon />, shortcut: 'H' },
  { id: 'pen', label: 'Pen', icon: <PenIcon />, shortcut: 'D' },
  { id: 'text', label: 'Text', icon: <TextIcon />, shortcut: 'T' },
  { id: 'rect', label: 'Shape', icon: <RectIcon />, shortcut: 'R' },
];

const EXTRA_TOOLS: ToolDef[] = [
  { id: 'artboard', label: 'Artboard', icon: <ArtboardIcon />, shortcut: 'A' },
  { id: 'pathfinder', label: 'Shape Builder', icon: <PathfinderIcon />, shortcut: 'Shift+M' },
];

export const TOOLS: ToolDef[] = [...PRIMARY_TOOLS, ...EXTRA_TOOLS];

// ── Spring easing ─────────────────────────────────────────────────
const SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const MENU_WIDTH = 320;
const MENU_Z = 70;

// ── Shared styles ─────────────────────────────────────────────────

const SAVE_STATUS_COLORS: Record<SaveStatus, string> = {
  saved: '#22c55e',
  saving: '#eab308',
  unsaved: '#ef4444',
};

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving...',
  unsaved: 'Unsaved',
};

/** Compact tool button used in both island and slide-out menu */
const ToolBtn: React.FC<{
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  testId: string;
  compact?: boolean;
}> = ({ icon, label, active, disabled, onClick, title, testId, compact }) => (
  <button
    data-testid={testId}
    className="sn-lift-on-hover"
    onClick={onClick}
    title={title}
    disabled={disabled}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: compact ? 'center' : 'flex-start',
      gap: '6px',
      padding: compact ? '6px' : '6px 10px',
      minWidth: compact ? '34px' : '100%',
      height: '34px',
      border: '1px solid transparent',
      borderRadius: 'var(--sn-radius, 8px)',
      background: active
        ? 'var(--sn-accent, #6366f1)'
        : 'transparent',
      color: active ? '#fff' : disabled ? 'var(--sn-text-muted, #666)' : 'var(--sn-text, #F2E8E4)',
      cursor: disabled ? 'default' : 'pointer',
      fontSize: '12px',
      fontFamily: 'inherit',
      fontWeight: 500,
      lineHeight: 1,
      opacity: disabled ? 0.4 : 1,
      boxShadow: active ? '0 0 12px var(--sn-accent-glow, rgba(184,160,216,0.15))' : 'none',
    }}
  >
    {icon}
    {label && <span style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{label}</span>}
  </button>
);

/** Divider for the island bar */
const Divider: React.FC = () => (
  <div style={{ width: '1px', height: '24px', background: 'var(--sn-border, rgba(255,255,255,0.08))', margin: '0 4px' }} />
);

/** Collapsible section in the slide-out menu */
const MenuSection: React.FC<{
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ label, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.06))' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px 8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--sn-text-muted, #888)',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontFamily: 'inherit',
        }}
      >
        <span className="sn-chrome-text">{label}</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px' }}>
          {children}
        </div>
      )}
    </div>
  );
};

/** Sub-label inside a section */
const SubLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sn-text-muted, #666)', margin: '6px 0 4px', display: 'block' }}>{children}</span>
);

/** Grid of buttons — 2 or 3 per row */
const BtnGrid: React.FC<{ cols?: number; children: React.ReactNode }> = ({ cols = 2, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '4px' }}>
    {children}
  </div>
);

/** Row of buttons in a line */
const BtnRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// TOOLBAR COMPONENT
// ═══════════════════════════════════════════════════════════════════

export const Toolbar: React.FC<ToolbarProps> = ({
  viewportStore,
  saveStatus,
  onSave,
  canvasName,
  onRename,
  viewportConfig,
  borderRadius,
  canvasPosition,
  selectedIds = new Set(),
  onCaptureThumbnail,
}) => {
  const activeTool = useUIStore((s) => (s.activeTool === 'move' ? 'select' : s.activeTool));
  const mode = useUIStore((s) => s.canvasInteractionMode);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const setCanvasInteractionMode = useUIStore((s) => s.setCanvasInteractionMode);
  const spatialMode = useUIStore((s) => s.spatialMode);
  const setSpatialMode = useUIStore((s) => s.setSpatialMode);
  const setFullscreenPreview = useUIStore((s) => s.setFullscreenPreview);

  const canUndo = useHistoryStore(selectCanUndo);
  const canRedo = useHistoryStore(selectCanRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  const dockers = useDockerStore((state) => state.dockers);
  const addDocker = useDockerStore((state) => state.addDocker);
  const setDockerVisible = useDockerStore((state) => state.setVisible);
  const bringDockerToFront = useDockerStore((state) => state.bringToFront);

  const [gridConfig, setGridConfig] = useState<GridConfig>({ ...DEFAULT_GRID_CONFIG });
  const [menuOpen, setMenuOpen] = useState(false);

  // Canvas settings dropdown
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const panels: Record<string, boolean> = {}; // TODO: wire up panel visibility from store
  const artboardPreview = false; // TODO: wire up from store

  // Subscribe to grid config changes
  useEffect(() => {
    const unsub = bus.subscribe(GridEvents.CONFIG_CHANGED, (event: { payload: { config: Partial<GridConfig> } }) => {
      setGridConfig((prev) => ({ ...prev, ...event.payload.config }));
    });
    const unsubToggle = bus.subscribe(GridEvents.TOGGLED, (event: { payload: { enabled: boolean } }) => {
      setGridConfig((prev) => ({ ...prev, enabled: event.payload.enabled }));
    });
    return () => { unsub(); unsubToggle(); };
  }, []);

  const zoom = viewportStore.getState().zoom;
  const zoomPercent = useMemo(() => Math.round(zoom * 100), [zoom]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleToolClick = useCallback((toolId: string) => {
    setActiveTool(toolId);
    bus.emit(CanvasEvents.TOOL_CHANGED, { tool: toolId });
  }, [setActiveTool]);
  const handleUndo = useCallback(() => undo(), [undo]);
  const handleRedo = useCallback(() => redo(), [redo]);

  const handleZoomIn = useCallback(() => {
    const vp = viewportStore.getState();
    viewportStore.zoom(Math.min(vp.zoom * 1.25, 10), { x: vp.viewportWidth / 2, y: vp.viewportHeight / 2 });
  }, [viewportStore]);

  const handleZoomOut = useCallback(() => {
    const vp = viewportStore.getState();
    viewportStore.zoom(Math.max(vp.zoom / 1.25, 0.1), { x: vp.viewportWidth / 2, y: vp.viewportHeight / 2 });
  }, [viewportStore]);

  const handleZoomReset = useCallback(() => viewportStore.reset(), [viewportStore]);

  const handleModeToggle = useCallback(() => {
    setCanvasInteractionMode(mode === 'edit' ? 'preview' : 'edit');
  }, [mode, setCanvasInteractionMode]);

  const handleDockerClick = useCallback(() => {
    const existing = Object.values(dockers).find((d) => d.name === DOCKER_LIBRARY_NAME);
    if (existing) {
      setDockerVisible(existing.id, true);
      bringDockerToFront(existing.id);
    } else {
      const id = addDocker({
        name: DOCKER_LIBRARY_NAME,
        dockMode: 'floating',
        visible: true,
        pinned: false,
        position: { x: 96, y: 96 },
        size: { width: 360, height: 460 },
        tabs: [{ id: crypto.randomUUID(), name: 'Library', widgets: [] }],
      });
      bringDockerToFront(id);
    }
  }, [dockers, addDocker, setDockerVisible, bringDockerToFront]);

  const handleFullscreenPreview = useCallback(() => setFullscreenPreview(true), [setFullscreenPreview]);
  const handleCaptureThumbnail = useCallback(() => onCaptureThumbnail?.(), [onCaptureThumbnail]);

  // Grid toggle — must set both enabled AND showGridLines for the renderer to draw
  const handleGridToggle = useCallback(() => {
    const newEnabled = !gridConfig.enabled;
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { enabled: newEnabled, showGridLines: newEnabled } });
    bus.emit(GridEvents.TOGGLED, { canvasId: '', enabled: newEnabled });
  }, [gridConfig.enabled]);

  // Alignment / Grouping
  const handleAlign = useCallback((type: string) => {
    if (selectedIds.size < 2) return;
    bus.emit(`canvas.align.${type}`, { entityIds: Array.from(selectedIds) });
  }, [selectedIds]);

  const handleGroup = useCallback(() => {
    if (selectedIds.size < 2) return;
    bus.emit('canvas.entity.group', { entityIds: Array.from(selectedIds) });
  }, [selectedIds]);

  const handleUngroup = useCallback(() => {
    if (selectedIds.size === 0) return;
    bus.emit('canvas.entity.ungroup', { entityIds: Array.from(selectedIds) });
  }, [selectedIds]);

  // Clipboard
  const handleCut = useCallback(() => { if (selectedIds.size === 0) return; bus.emit('canvas.clipboard.cut', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);
  const handleCopy = useCallback(() => { if (selectedIds.size === 0) return; bus.emit('canvas.clipboard.copy', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);
  const handlePaste = useCallback(() => bus.emit('canvas.clipboard.paste', {}), []);

  // Arrange extras
  const handleDistributeH = useCallback(() => { if (selectedIds.size < 3) return; bus.emit('canvas.arrange.distributeH', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);
  const handleDistributeV = useCallback(() => { if (selectedIds.size < 3) return; bus.emit('canvas.arrange.distributeV', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);
  const handleMatchSize = useCallback(() => { if (selectedIds.size < 2) return; bus.emit('canvas.arrange.matchSize', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);
  const handleFlipH = useCallback(() => { if (selectedIds.size === 0) return; bus.emit('canvas.arrange.flipH', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);
  const handleFlipV = useCallback(() => { if (selectedIds.size === 0) return; bus.emit('canvas.arrange.flipV', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);

  // TODO: wire up from store
  const handleEnterXR = useCallback(() => enterXR(), []);
  const handleClearCanvas = useCallback(() => bus.emit('canvas.clear', {}), []);
  const handlePanelToggle = useCallback((panel: string) => bus.emit('canvas.panel.toggle', { panel }), []);
  const handleArtboardPreviewToggle = useCallback(() => bus.emit('canvas.artboard.toggle', {}), []);

  const isEditMode = mode === 'edit';

  // ── Island button style ─────────────────────────────────────────
  const islandBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    minWidth: '30px',
    height: '30px',
    border: 'none',
    borderRadius: '8px',
    background: 'transparent',
    color: 'var(--sn-text, #F2E8E4)',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'inherit',
    lineHeight: 1,
    transition: `all 0.15s ${SPRING}`,
  };

  return (
    <>
      {/* ═══ FLOATING ISLAND ═══ */}
      <div data-testid="canvas-toolbar" style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0 0',
        pointerEvents: 'none',
      }}>
        <div
          data-testid="toolbar-island"
          className="sn-liquid-glass sn-neo sn-holo-border"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            height: '44px',
            fontFamily: 'var(--sn-font-family, Outfit, system-ui, sans-serif)',
            color: 'var(--sn-text, #F2E8E4)',
            pointerEvents: 'auto',
            transition: `all 0.3s ${SPRING}`,
          }}
        >
          {/* Menu toggle (edit mode only) */}
          {isEditMode && (
            <>
              <button
                data-testid="menu-toggle"
                onClick={() => setMenuOpen(!menuOpen)}
                title={menuOpen ? 'Close tool menu' : 'Open tool menu'}
                style={{
                  ...islandBtn,
                  background: menuOpen ? 'var(--sn-accent, #6366f1)' : 'transparent',
                  color: menuOpen ? '#fff' : 'var(--sn-text-muted, rgba(242,232,228,0.55))',
                  boxShadow: menuOpen ? '0 0 12px var(--sn-accent-glow, rgba(184,160,216,0.15))' : 'none',
                }}
              >
                {menuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
              <Divider />
            </>
          )}

          {/* Canvas name + save */}
          {typeof canvasName === 'string' && canvasName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                data-testid="canvas-name"
                className="sn-chrome-text"
                title={canvasName}
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: 'var(--sn-font-serif, Newsreader, Georgia, serif)',
                  maxWidth: '140px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {canvasName}
              </div>
              {saveStatus && (
                <div
                  data-testid="save-status"
                  title={SAVE_STATUS_LABELS[saveStatus]}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--sn-text-muted)' }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: SAVE_STATUS_COLORS[saveStatus], display: 'inline-block' }} />
                </div>
              )}
              <Divider />
            </div>
          )}

          {/* Undo / Redo */}
          {isEditMode && (
            <>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button data-testid="undo-btn" onClick={handleUndo} title="Undo (Ctrl+Z)" style={islandBtn} disabled={!canUndo}><UndoIcon /></button>
                <button data-testid="redo-btn" onClick={handleRedo} title="Redo (Ctrl+Shift+Z)" style={islandBtn} disabled={!canRedo}><RedoIcon /></button>
              </div>
              <Divider />
            </>
          )}

          {/* Zoom controls */}
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            <button data-testid="zoom-out" onClick={handleZoomOut} title="Zoom out" style={islandBtn}>−</button>
            <button
              data-testid="zoom-reset"
              onClick={handleZoomReset}
              title="Reset zoom"
              style={{ ...islandBtn, minWidth: '40px', color: 'var(--sn-text-muted)', fontSize: '11px' }}
            >
              {zoomPercent}%
            </button>
            <button data-testid="zoom-in" onClick={handleZoomIn} title="Zoom in" style={islandBtn}>+</button>
          </div>

          <Divider />

          {/* Presence avatars */}
          <PresenceAvatarBar />

          <Divider />

          {/* Mode toggle */}
          <button
            data-testid="mode-toggle"
            onClick={handleModeToggle}
            title={isEditMode ? 'Switch to Preview (P)' : 'Switch to Edit (P)'}
            style={{
              height: '30px',
              padding: '0 16px',
              border: 'none',
              borderRadius: '999px',
              background: isEditMode ? 'transparent' : 'var(--sn-accent, #6366f1)',
              color: isEditMode ? 'var(--sn-text)' : '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'inherit',
              fontWeight: 600,
              transition: `all 0.25s ${SPRING}`,
              boxShadow: !isEditMode ? '0 0 16px var(--sn-accent-glow, rgba(184,160,216,0.2))' : 'none',
            }}
          >
            {isEditMode ? 'Preview' : 'Edit'}
          </button>

          <button
            data-testid="fullscreen-preview-btn"
            onClick={handleFullscreenPreview}
            title="Fullscreen Preview (Shift+F)"
            style={{ ...islandBtn, width: '30px', padding: 0 }}
          >
            <FullscreenIcon />
          </button>
        </div>
      </div>

      {/* ═══ SLIDE-OUT TOOL MENU ═══ */}
      {isEditMode && (
        <>
          {/* Backdrop */}
          {menuOpen && (
            <div
              data-testid="menu-backdrop"
              onClick={() => setMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: MENU_Z - 1,
                background: 'rgba(0,0,0,0.25)',
                transition: `opacity 0.3s ${SPRING}`,
                pointerEvents: 'auto',
              }}
            />
          )}

          {/* Slide-out panel */}
          <div
            data-testid="toolbar-menu"
            className="sn-glass-heavy sn-neo sn-holo-border"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: MENU_WIDTH,
              zIndex: MENU_Z,
              borderRight: '1px solid var(--sn-border, rgba(255,255,255,0.08))',
              transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: `transform 0.35s ${SPRING}`,
              overflowY: 'auto',
              overflowX: 'hidden',
              fontFamily: 'var(--sn-font-family, Outfit, system-ui, sans-serif)',
              color: 'var(--sn-text, #F2E8E4)',
              borderRadius: 0,
              pointerEvents: 'auto',
            }}
          >
            {/* Menu header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
            }}>
              <span className="sn-chrome-text" style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.02em' }}>Tool Menu</span>
              <button
                data-testid="menu-close"
                onClick={() => setMenuOpen(false)}
                title="Close"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'var(--sn-text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <CloseIcon />
              </button>
            </div>

            {/* ── Tools ── */}
            <MenuSection label="Tools">
              <BtnGrid cols={2}>
                {TOOLS.map((t) => (
                  <ToolBtn
                    key={t.id}
                    testId={`tool-${t.id}`}
                    icon={t.icon}
                    label={t.label}
                    active={activeTool === t.id}
                    onClick={() => handleToolClick(t.id)}
                    title={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ''}`}
                  />
                ))}
              </BtnGrid>
            </MenuSection>

            {/* ── Edit ── */}
            <MenuSection label="Edit">
              <BtnGrid cols={2}>
                <ToolBtn testId="menu-undo" icon={<UndoIcon />} label="Undo" disabled={!canUndo} onClick={handleUndo} title="Undo (Ctrl+Z)" />
                <ToolBtn testId="menu-redo" icon={<RedoIcon />} label="Redo" disabled={!canRedo} onClick={handleRedo} title="Redo (Ctrl+Shift+Z)" />
                <ToolBtn testId="menu-cut" icon={<CutIcon />} label="Cut" onClick={handleCut} title="Cut (Ctrl+X)" />
                <ToolBtn testId="menu-copy" icon={<CopyIcon />} label="Copy" onClick={handleCopy} title="Copy (Ctrl+C)" />
                <ToolBtn testId="menu-paste" icon={<PasteIcon />} label="Paste" onClick={handlePaste} title="Paste (Ctrl+V)" />
              </BtnGrid>
            </MenuSection>

            {/* ── Arrange ── */}
            <MenuSection label="Arrange" defaultOpen={false}>
              <SubLabel>Align</SubLabel>
              <BtnGrid cols={3}>
                <ToolBtn testId="align-left" icon={<AlignLeftIcon />} label="Left" onClick={() => handleAlign('left')} title="Align Left" compact />
                <ToolBtn testId="align-center-h" icon={<AlignCenterHIcon />} label="Center" onClick={() => handleAlign('centerH')} title="Align Center (H)" compact />
                <ToolBtn testId="align-right" icon={<AlignRightIcon />} label="Right" onClick={() => handleAlign('right')} title="Align Right" compact />
                <ToolBtn testId="align-top" icon={<AlignTopIcon />} label="Top" onClick={() => handleAlign('top')} title="Align Top" compact />
                <ToolBtn testId="align-center-v" icon={<AlignCenterVIcon />} label="Middle" onClick={() => handleAlign('centerV')} title="Align Center (V)" compact />
                <ToolBtn testId="align-bottom" icon={<AlignBottomIcon />} label="Bottom" onClick={() => handleAlign('bottom')} title="Align Bottom" compact />
              </BtnGrid>
              <SubLabel>Distribute</SubLabel>
              <BtnGrid cols={2}>
                <ToolBtn testId="dist-h-btn" icon={<DistributeHIcon />} label="Horizontal" onClick={handleDistributeH} title="Distribute Horizontal" />
                <ToolBtn testId="dist-v-btn" icon={<DistributeVIcon />} label="Vertical" onClick={handleDistributeV} title="Distribute Vertical" />
                <ToolBtn testId="match-size-btn" icon={<MatchSizeIcon />} label="Match Size" onClick={handleMatchSize} title="Match Size" />
              </BtnGrid>
              <SubLabel>Transform</SubLabel>
              <BtnGrid cols={2}>
                <ToolBtn testId="flip-h-btn" icon={<FlipHIcon />} label="Flip H" onClick={handleFlipH} title="Flip Horizontal" />
                <ToolBtn testId="flip-v-btn" icon={<FlipVIcon />} label="Flip V" onClick={handleFlipV} title="Flip Vertical" />
                <ToolBtn testId="group-btn" icon={<LayersIcon />} label="Group" onClick={handleGroup} title="Group" />
                <ToolBtn testId="ungroup-btn" icon={<LayersIcon />} label="Ungroup" onClick={handleUngroup} title="Ungroup" />
              </BtnGrid>
            </MenuSection>

            {/* ── View ── */}
            <MenuSection label="View">
              <SubLabel>Spatial Mode</SubLabel>
              <BtnGrid cols={3}>
                <ToolBtn testId="spatial-2d" icon={<RectIcon />} label="2D" active={spatialMode === '2d'} onClick={() => setSpatialMode('2d')} title="2D Canvas" compact />
                <ToolBtn testId="spatial-3d" icon={<ArtboardIcon />} label="3D" active={spatialMode === '3d'} onClick={() => setSpatialMode('3d')} title="3D Scene" compact />
                <ToolBtn testId="spatial-vr" icon={<XRIcon />} label="VR" active={spatialMode === 'vr'} onClick={() => setSpatialMode('vr')} title="VR (WebXR)" compact />
              </BtnGrid>
              {spatialMode === 'vr' && (
                <div style={{ marginTop: '6px' }}>
                  <ToolBtn testId="enter-xr-btn" icon={<XRGogglesIcon />} label="Enter VR" onClick={handleEnterXR} title="Enter VR" />
                </div>
              )}

              <SubLabel>Grid</SubLabel>
              <BtnGrid cols={2}>
                <ToolBtn testId="grid-toggle" icon={<GridIcon />} label={gridConfig.enabled ? 'Grid On' : 'Grid Off'} active={gridConfig.enabled} onClick={handleGridToggle} title="Toggle Grid (G)" />
                <ToolBtn testId="canvas-settings-btn" icon={<SettingsIcon />} label="Settings" onClick={() => setSettingsOpen(!settingsOpen)} title="Canvas Settings" />
              </BtnGrid>
              <div style={{ position: 'relative' }}>
                <CanvasSettingsDropdown isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} anchorRef={settingsButtonRef} viewportConfig={viewportConfig} borderRadius={borderRadius} canvasPosition={canvasPosition} gridConfig={gridConfig} />
              </div>

              <SubLabel>Canvas</SubLabel>
              <BtnGrid cols={2}>
                <ToolBtn testId="artboard-preview-toggle" icon={<ArtboardIcon />} label="Artboard" active={artboardPreview} onClick={handleArtboardPreviewToggle} title="Toggle Artboard Preview" />
                <ToolBtn testId="capture-thumbnail" icon={<CameraIcon />} label="Capture" onClick={handleCaptureThumbnail} title="Capture Thumbnail" />
              </BtnGrid>
            </MenuSection>

            {/* ── Panels ── */}
            <MenuSection label="Panels">
              <BtnGrid cols={2}>
                <ToolBtn testId="panel-gallery" icon={<GalleryIcon />} label="Gallery" active={!!panels['gallery']} onClick={() => handlePanelToggle('gallery')} title="Gallery" />
                <ToolBtn testId="panel-stickers" icon={<StickerIcon />} label="Stickers" active={!!panels['stickers']} onClick={() => handlePanelToggle('stickers')} title="Stickers" />
                <ToolBtn testId="panel-layers" icon={<LayersIcon />} label="Layers" active={!!panels['layers']} onClick={() => handlePanelToggle('layers')} title="Layers" />
                <ToolBtn testId="panel-dock" icon={<DockIcon />} label="Docker" onClick={handleDockerClick} title="Docker Library" />
                <ToolBtn testId="panel-fullscreen" icon={<FullscreenIcon />} label="Fullscreen" onClick={handleFullscreenPreview} title="Fullscreen Preview" />
                <ToolBtn testId="panel-clear" icon={<ClearIcon />} label="Clear" onClick={handleClearCanvas} title="Clear Canvas" />
              </BtnGrid>
            </MenuSection>
          </div>
        </>
      )}
    </>
  );
};
