/**
 * Toolbar — tool selector, zoom controls, grid controls, mode toggle.
 * Wraps the headless ToolbarController from L4A-4.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { GridConfig, GridLineStyle, GridProjectionMode, ViewportConfig } from '@sn/types';
import { GridEvents } from '@sn/types';

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
  /** Save status indicator (from usePersistence) */
  saveStatus?: SaveStatus;
  /** Callback for manual save */
  onSave?: () => void;
  /** Current canvas name */
  canvasName?: string;
  /** Callback for renaming the canvas */
  onRename?: (newName: string) => void;
  /** Current viewport configuration */
  viewportConfig?: ViewportConfig;
  /** Current canvas border radius */
  borderRadius?: number;
  /** Current canvas position in workspace */
  canvasPosition?: CanvasPositionConfig;
  /** Currently selected entity IDs */
  selectedIds?: Set<string>;
  /** Callback for capturing a thumbnail of the canvas */
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

const AlignLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="2" x2="4" y2="22" />
    <rect x="8" y="6" width="12" height="4" rx="1" />
    <rect x="8" y="14" width="8" height="4" rx="1" />
  </svg>
);

const AlignCenterHIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22" />
    <rect x="5" y="6" width="14" height="4" rx="1" />
    <rect x="7" y="14" width="10" height="4" rx="1" />
  </svg>
);

const AlignRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="20" y1="2" x2="20" y2="22" />
    <rect x="4" y="6" width="12" height="4" rx="1" />
    <rect x="8" y="14" width="8" height="4" rx="1" />
  </svg>
);

const AlignTopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="4" x2="22" y2="4" />
    <rect x="6" y="8" width="4" height="12" rx="1" />
    <rect x="14" y="8" width="4" height="8" rx="1" />
  </svg>
);

const AlignCenterVIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="12" x2="22" y2="12" />
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="7" width="4" height="10" rx="1" />
  </svg>
);

const AlignBottomIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="20" x2="22" y2="20" />
    <rect x="6" y="4" width="4" height="12" rx="1" />
    <rect x="14" y="8" width="4" height="8" rx="1" />
  </svg>
);

const XRGogglesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-3.5a2 2 0 0 1-1.7-1l-1.6-2.6a2 2 0 0 0-3.4 0L8.2 15a2 2 0 0 1-1.7 1H4a2 2 0 0 1-2-2v-4z" />
  </svg>
);

// ── New Icons for Tray Sections ──────────────────────────────────
const StarIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>);
const ButtonIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="8" rx="4" /><line x1="9" y1="12" x2="15" y2="12" /></svg>);
const ImageIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>);
const ThreeDCubeIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>);
const CutIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>);
const CopyIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>);
const PasteIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>);
const DistributeHIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="4" height="12" rx="1" /><rect x="10" y="4" width="4" height="16" rx="1" /><rect x="19" y="6" width="4" height="12" rx="1" /></svg>);
const DistributeVIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="1" width="12" height="4" rx="1" /><rect x="4" y="10" width="16" height="4" rx="1" /><rect x="6" y="19" width="12" height="4" rx="1" /></svg>);
const MatchSizeIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="8" height="16" rx="1" /><rect x="14" y="4" width="8" height="16" rx="1" /></svg>);
const FlipHIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M16 7h5l-5 10V7z" /><path d="M8 7H3l5 10V7z" /></svg>);
const FlipVIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20" /><path d="M7 8V3l10 5H7z" /><path d="M7 16v5l10-5H7z" /></svg>);
const RotateCCWIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>);
const RotateCWIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>);
const GalleryIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>);
const StickerIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" /><polyline points="14 3 14 8 21 8" /></svg>);
const ClearIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>);
const DockIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="15" x2="21" y2="15" /></svg>);
const LayersIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>);
const HierarchyIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3" /><circle cx="6" cy="19" r="3" /><circle cx="18" cy="19" r="3" /><line x1="12" y1="8" x2="6" y2="16" /><line x1="12" y1="8" x2="18" y2="16" /></svg>);
const DataIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>);
const PropertiesIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>);
const WidgetLabIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4" /></svg>);
const SizeIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>);
const SettingsIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>);
const SnapIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>);
const GuidesIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /></svg>);
const GridIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>);
/** Vertical tray section */
const TraySection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (<div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}><TrayLabel>{label}</TrayLabel><div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>{children}</div></div>);
/** Sub-label inside a tray section */
const TraySubLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (<span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sn-text-muted, #666)', marginTop: '2px' }}>{children}</span>);
/** Vertical divider for tray sections */
const TrayDivider: React.FC = () => (<div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--sn-border, #e0e0e0)', margin: '0 4px' }} />);

const CameraIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const FullscreenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

/** XR icon — reserved for future spatial toolbar button */
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

/** Primary tools — always visible in the main toolbar */
const PRIMARY_TOOLS: ToolDef[] = [
  { id: 'select', label: 'Select', icon: <SelectIcon />, shortcut: 'V' },
  { id: 'pan', label: 'Pan', icon: <PanIcon />, shortcut: 'H' },
  { id: 'pen', label: 'Pen', icon: <PenIcon />, shortcut: 'D' },
  { id: 'text', label: 'Text', icon: <TextIcon />, shortcut: 'T' },
  { id: 'rect', label: 'Shape', icon: <RectIcon />, shortcut: 'R' },
];

/** Extra tools — shown in the pull-down tray */
const TRAY_TOOLS: ToolDef[] = [
  { id: 'artboard', label: 'Artboard', icon: <ArtboardIcon />, shortcut: 'A' },
  { id: 'pathfinder', label: 'Shape Builder', icon: <PathfinderIcon />, shortcut: 'Shift+M' },
];

/** All tools combined — exported for keyboard shortcut handling in canvas shortcuts */
export const TOOLS: ToolDef[] = [...PRIMARY_TOOLS, ...TRAY_TOOLS];

/** Spring easing — Principle 4 */
const TOOLBAR_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** Shared button style for small toggle/icon buttons */
const smallBtnBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px',
  minWidth: '32px',
  height: '32px',
  border: '1px solid var(--sn-border, #e0e0e0)',
  borderRadius: 'var(--sn-radius, 6px)',
  background: 'transparent',
  color: 'var(--sn-text, #1a1a2e)',
  cursor: 'pointer',
  fontSize: '12px',
  fontFamily: 'inherit',
  lineHeight: 1,
  transition: `all 0.15s ${TOOLBAR_SPRING}`,
};

const smallBtnActive: React.CSSProperties = {
  ...smallBtnBase,
  borderColor: 'var(--sn-accent, #6366f1)',
  background: 'var(--sn-accent, #6366f1)',
  color: '#fff',
};

/** Labeled tool button — icon + text label side by side */
const LabeledToolBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  title: string;
  testId: string;
}> = ({ icon, label, active, onClick, title, testId }) => (
  <button
    data-testid={testId}
    onClick={onClick}
    title={title}
    style={{
      ...smallBtnBase,
      gap: '4px',
      padding: '0 8px',
      minWidth: 'auto',
      borderColor: active ? 'var(--sn-accent, #6366f1)' : 'var(--sn-border, #e0e0e0)',
      background: active ? 'var(--sn-accent, #6366f1)' : 'transparent',
      color: active ? '#fff' : 'var(--sn-text, #1a1a2e)',
    }}
  >
    {icon}
    <span style={{ fontSize: '11px', fontWeight: 500 }}>{label}</span>
  </button>
);

/** Tray section label */
const TrayLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--sn-text-muted, #888)',
    marginRight: '6px',
    whiteSpace: 'nowrap',
  }}>
    {children}
  </span>
);

/** Vertical divider line */
const Divider: React.FC = () => (
  <div style={{ width: '1px', height: '24px', background: 'var(--sn-border, #e0e0e0)', margin: '0 6px' }} />
);

/** Chevron icon for More Tools toggle */
const ChevronDownIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: `transform 0.25s ${TOOLBAR_SPRING}`, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/**
 * Toolbar component — renders tool buttons, zoom controls, grid controls, and edit/preview toggle.
 * Always visible in both edit and preview modes.
 */
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

  // Grid config state — kept in sync via bus events
  const [gridConfig, setGridConfig] = useState<GridConfig>({ ...DEFAULT_GRID_CONFIG });

  // Canvas rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Canvas settings dropdown state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // Subscribe to grid config changes from other sources (e.g., grid-layer)
  useEffect(() => {
    const unsub = bus.subscribe(GridEvents.CONFIG_CHANGED, (event: { payload: { config: Partial<GridConfig> } }) => {
      setGridConfig((prev) => ({ ...prev, ...event.payload.config }));
    });

    const unsubToggle = bus.subscribe(GridEvents.TOGGLED, (event: { payload: { enabled: boolean } }) => {
      setGridConfig((prev) => ({ ...prev, enabled: event.payload.enabled }));
    });

    return () => {
      unsub();
      unsubToggle();
    };
  }, []);

  const zoom = viewportStore.getState().zoom;
  const zoomPercent = useMemo(() => Math.round(zoom * 100), [zoom]);

  const handleToolClick = useCallback(
    (toolId: string) => {
      setActiveTool(toolId);
    },
    [setActiveTool],
  );

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  const handleZoomIn = useCallback(() => {
    const vp = viewportStore.getState();
    const newZoom = Math.min(vp.zoom * 1.25, 10);
    viewportStore.zoom(newZoom, {
      x: vp.viewportWidth / 2,
      y: vp.viewportHeight / 2,
    });
  }, [viewportStore]);

  const handleZoomOut = useCallback(() => {
    const vp = viewportStore.getState();
    const newZoom = Math.max(vp.zoom / 1.25, 0.1);
    viewportStore.zoom(newZoom, {
      x: vp.viewportWidth / 2,
      y: vp.viewportHeight / 2,
    });
  }, [viewportStore]);

  const handleZoomReset = useCallback(() => {
    viewportStore.reset();
  }, [viewportStore]);

  const handleModeToggle = useCallback(() => {
    const next = mode === 'edit' ? 'preview' : 'edit';
    setCanvasInteractionMode(next);
  }, [mode, setCanvasInteractionMode]);

  const handleDockerClick = useCallback(() => {
    const existing = Object.values(dockers).find((docker) => docker.name === DOCKER_LIBRARY_NAME);
    if (existing) {
      setDockerVisible(existing.id, true);
      bringDockerToFront(existing.id);
    } else {
      const dockerId = addDocker({
        name: DOCKER_LIBRARY_NAME,
        dockMode: 'floating',
        visible: true,
        pinned: false,
        position: { x: 96, y: 96 },
        size: { width: 360, height: 460 },
        tabs: [{ id: crypto.randomUUID(), name: 'Library', widgets: [] }],
      });
      bringDockerToFront(dockerId);
    }
  }, [dockers, addDocker, setDockerVisible, bringDockerToFront]);

  const handleFullscreenPreview = useCallback(() => {
    setFullscreenPreview(true);
  }, [setFullscreenPreview]);

  const handleCaptureThumbnail = useCallback(() => {
    onCaptureThumbnail?.();
  }, [onCaptureThumbnail]);

  // ── Alignment / Grouping ───────────────────────────────────────

  const handleAlign = useCallback(
    (type: string) => {
      if (selectedIds.size < 2) return;
      bus.emit(`canvas.align.${type}`, { entityIds: Array.from(selectedIds) });
    },
    [selectedIds],
  );

  const handleGroup = useCallback(() => {
    if (selectedIds.size < 2) return;
    bus.emit('canvas.entity.group', { entityIds: Array.from(selectedIds) });
  }, [selectedIds]);

  const handleUngroup = useCallback(() => {
    if (selectedIds.size === 0) return;
    bus.emit('canvas.entity.ungroup', { entityIds: Array.from(selectedIds) });
  }, [selectedIds]);

  // ── Clipboard ──────────────────────────────────────────────────
  const handleCut = useCallback(() => { if (selectedIds.size === 0) return; bus.emit('canvas.clipboard.cut', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);
  const handleCopy = useCallback(() => { if (selectedIds.size === 0) return; bus.emit('canvas.clipboard.copy', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);
  const handlePaste = useCallback(() => { bus.emit('canvas.clipboard.paste', {}); }, []);

  // ── Arrange extras ─────────────────────────────────────────────
  const handleDistributeH = useCallback(() => { if (selectedIds.size < 3) return; bus.emit('canvas.arrange.distributeH', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);
  const handleDistributeV = useCallback(() => { if (selectedIds.size < 3) return; bus.emit('canvas.arrange.distributeV', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);
  const handleMatchSize = useCallback(() => { if (selectedIds.size < 2) return; bus.emit('canvas.arrange.matchSize', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);
  const handleFlipH = useCallback(() => { if (selectedIds.size === 0) return; bus.emit('canvas.arrange.flipH', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);
  const handleFlipV = useCallback(() => { if (selectedIds.size === 0) return; bus.emit('canvas.arrange.flipV', { entityIds: Array.from(selectedIds) }); }, [selectedIds]);

  // ── Dropdown menu states ────────────────────────────────────────
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const arrangeRef = useRef<HTMLDivElement>(null);
  const [gridDropdownOpen, setGridDropdownOpen] = useState(false);
  const gridDropdownRef = useRef<HTMLDivElement>(null);
  const [canvasDropdownOpen, setCanvasDropdownOpen] = useState(false);
  const canvasDropdownRef = useRef<HTMLDivElement>(null);
  const [panelsOpen, setPanelsOpen] = useState(false);
  const panelsRef = useRef<HTMLDivElement>(null);

  // Dismiss any dropdown on outside click
  useEffect(() => {
    const anyOpen = arrangeOpen || gridDropdownOpen || canvasDropdownOpen || panelsOpen;
    if (!anyOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (arrangeOpen && arrangeRef.current && !arrangeRef.current.contains(e.target as Node)) setArrangeOpen(false);
      if (gridDropdownOpen && gridDropdownRef.current && !gridDropdownRef.current.contains(e.target as Node)) setGridDropdownOpen(false);
      if (canvasDropdownOpen && canvasDropdownRef.current && !canvasDropdownRef.current.contains(e.target as Node)) setCanvasDropdownOpen(false);
      if (panelsOpen && panelsRef.current && !panelsRef.current.contains(e.target as Node)) setPanelsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [arrangeOpen, gridDropdownOpen, canvasDropdownOpen, panelsOpen]);

  // ── Grid customizer popover ─────────────────────────────────────
  const [gridCustomizerOpen, setGridCustomizerOpen] = useState(false);
  const gridCustomizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridCustomizerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (gridCustomizerRef.current && !gridCustomizerRef.current.contains(e.target as Node)) {
        setGridCustomizerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [gridCustomizerOpen]);

  const handleGridStyleChange = useCallback((style: GridLineStyle) => {
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { gridLineStyle: style } });
  }, []);

  const handleGridColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { gridLineColor: e.target.value } });
  }, []);

  const handleGridOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { gridLineOpacity: Number(e.target.value) } });
  }, []);

  const handleGridWeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { gridLineWidth: Number(e.target.value) } });
  }, []);

  const handleGridDotSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    bus.emit(GridEvents.CONFIG_CHANGED, { canvasId: '', config: { dotSize: Number(e.target.value) } });
  }, []);

  const isEditMode = mode === 'edit';

  // Dropdown select style
  const dropdownSelectStyle: React.CSSProperties = {
    height: '32px',
    padding: '0 6px',
    border: '1px solid var(--sn-border, #e0e0e0)',
    borderRadius: 'var(--sn-radius, 6px)',
    background: 'var(--sn-surface, #fff)',
    color: 'var(--sn-text, #1a1a2e)',
    cursor: 'pointer',
    fontSize: '11px',
    fontFamily: 'inherit',
  };

  // Popover style for dropdown menus
  const popoverStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '8px',
    background: 'var(--sn-surface-glass, rgba(30, 30, 36, 0.85))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--sn-border, rgba(255,255,255,0.08))',
    borderRadius: 'var(--sn-radius, 6px)',
    padding: '8px',
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    minWidth: '180px',
    zIndex: 100,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  };

  // Dropdown button style
  const dropdownBtnStyle = (open: boolean): React.CSSProperties => ({
    ...smallBtnBase,
    gap: '4px',
    padding: '0 10px',
    minWidth: 'auto',
    background: open ? 'var(--sn-surface-raised, #1E1E24)' : 'transparent',
    fontSize: '11px',
    fontWeight: 500,
  });

  return (
    <div data-testid="canvas-toolbar" style={{ position: 'relative' }}>
      {/* ═══ UNIFIED TOOLBAR ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 12px',
          background: 'var(--sn-surface-glass, rgba(30, 30, 36, 0.85))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.08))',
          minHeight: '44px',
          fontFamily: 'var(--sn-font-family, Inter, system-ui, sans-serif)',
          color: 'var(--sn-text, #e0e0e0)',
          position: 'relative',
          zIndex: 50,
        }}
      >
        {/* Canvas name + save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
          {typeof canvasName === 'string' ? (
            <div
              data-testid="canvas-name"
              title={canvasName}
              style={{ fontSize: '13px', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {canvasName}
            </div>
          ) : (
            canvasName && (
              <div data-testid="canvas-name" style={{ fontSize: '13px', fontWeight: 600, maxWidth: '120px' }}>
                {canvasName}
              </div>
            )
          )}

          {saveStatus && (
            <>
              <button
                data-testid="save-btn"
                onClick={onSave}
                title="Save (Ctrl+S)"
                style={{ ...smallBtnBase, padding: '0 10px', width: 'auto', fontSize: '12px', fontWeight: 600 }}
              >
                Save
              </button>
              <div
                data-testid="save-status"
                title={SAVE_STATUS_LABELS[saveStatus]}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--sn-text-muted, #6b7280)' }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: SAVE_STATUS_COLORS[saveStatus], display: 'inline-block' }} />
                {SAVE_STATUS_LABELS[saveStatus]}
              </div>
            </>
          )}
          <Divider />
        </div>

        {/* ── All tool buttons (edit mode only) ── */}
        {isEditMode && (
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {TOOLS.map((t) => (
              <LabeledToolBtn
                key={t.id}
                testId={`tool-${t.id}`}
                icon={t.icon}
                label={t.label}
                active={activeTool === t.id}
                onClick={() => handleToolClick(t.id)}
                title={`${t.label} (${t.shortcut})`}
              />
            ))}
          </div>
        )}

        {isEditMode && <Divider />}

        {/* Undo / Redo */}
        {isEditMode && (
          <div style={{ display: 'flex', gap: '2px' }}>
            <button data-testid="undo-btn" onClick={handleUndo} title="Undo (Ctrl+Z)" style={smallBtnBase} disabled={!canUndo}><UndoIcon /></button>
            <button data-testid="redo-btn" onClick={handleRedo} title="Redo (Ctrl+Shift+Z)" style={smallBtnBase} disabled={!canRedo}><RedoIcon /></button>
          </div>
        )}

        {isEditMode && <Divider />}

        {/* ── Arrange dropdown ── */}
        {isEditMode && (
          <div ref={arrangeRef} style={{ position: 'relative' }}>
            <button
              data-testid="arrange-dropdown-btn"
              onClick={() => setArrangeOpen((p) => !p)}
              title="Arrange tools"
              style={dropdownBtnStyle(arrangeOpen)}
            >
              Arrange <ChevronDownIcon open={arrangeOpen} />
            </button>
            {arrangeOpen && (
              <div style={popoverStyle}>
                <LabeledToolBtn testId="align-left" icon={<AlignLeftIcon />} label="Left" active={false} onClick={() => handleAlign('left')} title="Align Left" />
                <LabeledToolBtn testId="align-center-h" icon={<AlignCenterHIcon />} label="Center H" active={false} onClick={() => handleAlign('centerH')} title="Align Center (H)" />
                <LabeledToolBtn testId="align-right" icon={<AlignRightIcon />} label="Right" active={false} onClick={() => handleAlign('right')} title="Align Right" />
                <LabeledToolBtn testId="align-top" icon={<AlignTopIcon />} label="Top" active={false} onClick={() => handleAlign('top')} title="Align Top" />
                <LabeledToolBtn testId="align-center-v" icon={<AlignCenterVIcon />} label="Center V" active={false} onClick={() => handleAlign('centerV')} title="Align Center (V)" />
                <LabeledToolBtn testId="align-bottom" icon={<AlignBottomIcon />} label="Bottom" active={false} onClick={() => handleAlign('bottom')} title="Align Bottom" />
                <Divider />
                <button data-testid="group-btn" onClick={handleGroup} title="Group" style={{ ...smallBtnBase, padding: '0 10px', width: 'auto', fontSize: '11px' }}>Group</button>
                <button data-testid="ungroup-btn" onClick={handleUngroup} title="Ungroup" style={{ ...smallBtnBase, padding: '0 10px', width: 'auto', fontSize: '11px' }}>Ungroup</button>
              </div>
            )}
          </div>
        )}

        {/* ── Grid dropdown ── */}
        {isEditMode && (
          <div ref={gridDropdownRef} style={{ position: 'relative' }}>
            <button
              data-testid="grid-dropdown-btn"
              onClick={() => setGridDropdownOpen((p) => !p)}
              title="Grid settings"
              style={dropdownBtnStyle(gridDropdownOpen)}
            >
              Grid <ChevronDownIcon open={gridDropdownOpen} />
            </button>
            {gridDropdownOpen && (
              <div style={{ ...popoverStyle, flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                {/* Grid toggle + snap */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <LabeledToolBtn testId="grid-toggle" icon={<span style={{ fontSize: '14px' }}>#</span>} label="Grid" active={gridVisible} onClick={handleGridToggle} title="Toggle Grid (G)" />
                  <select data-testid="snap-mode" value={snapMode} onChange={(e) => handleSnapModeChange(e as any)} style={dropdownSelectStyle}>
                    <option value="none">No Snap</option>
                    <option value="grid">Snap Grid</option>
                    <option value="entity">Snap Entity</option>
                  </select>
                  <select data-testid="projection-mode" value={projection} onChange={(e) => handleProjectionChange(e as any)} style={dropdownSelectStyle}>
                    <option value="flat">Flat</option>
                    <option value="isometric">Isometric</option>
                  </select>
                </div>
                {/* Grid appearance */}
                <div ref={gridCustomizerRef} style={{ position: 'relative' }}>
                  <button data-testid="grid-customizer-toggle" onClick={() => setGridCustomizerOpen(!gridCustomizerOpen)} title="Grid style" style={{ ...(gridCustomizerOpen ? smallBtnActive : smallBtnBase), padding: '0 8px', width: 'auto', fontSize: '11px', gap: '4px' }}>Style <ChevronDownIcon open={gridCustomizerOpen} /></button>
                  {gridCustomizerOpen && (
                    <div style={{ ...popoverStyle, flexDirection: 'column', gap: '6px', minWidth: '200px', left: 0, transform: 'none' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(['solid', 'dashed', 'dotted'] as GridLineStyle[]).map((s) => (
                          <button key={s} data-testid={`grid-style-${s}`} onClick={() => handleGridStyleChange(s)} style={{ ...(gridLineStyle === s ? smallBtnActive : smallBtnBase), fontSize: '10px', padding: '0 6px', width: 'auto' }}>{s}</button>
                        ))}
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--sn-text-muted, #6b7280)' }}>
                        Color <input data-testid="grid-color" type="color" value={gridLineColor} onChange={handleGridColorChange} style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--sn-text-muted, #6b7280)' }}>
                        Opacity <input data-testid="grid-opacity" type="range" min="0" max="1" step="0.05" value={gridLineOpacity} onChange={handleGridOpacityChange} style={{ width: '80px' }} /> {Math.round(gridLineOpacity * 100)}%
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--sn-text-muted, #6b7280)' }}>
                        Weight <input data-testid="grid-weight" type="range" min="0.5" max="4" step="0.5" value={gridLineWidth} onChange={handleGridWeightChange} style={{ width: '80px' }} /> {gridLineWidth}px
                      </label>
                      {gridLineStyle === 'dotted' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--sn-text-muted, #6b7280)' }}>
                          Dot Size <input data-testid="grid-dot-size" type="range" min="1" max="6" step="0.5" value={dotSize} onChange={handleGridDotSizeChange} style={{ width: '80px' }} /> {dotSize}px
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Canvas dropdown ── */}
        {isEditMode && (
          <div ref={canvasDropdownRef} style={{ position: 'relative' }}>
            <button
              data-testid="canvas-dropdown-btn"
              onClick={() => setCanvasDropdownOpen((p) => !p)}
              title="Canvas settings"
              style={dropdownBtnStyle(canvasDropdownOpen)}
            >
              Canvas <ChevronDownIcon open={canvasDropdownOpen} />
            </button>
            {canvasDropdownOpen && (
              <div style={{ ...popoverStyle, flexDirection: 'column', gap: '8px', minWidth: '260px' }}>
                {/* Platform / size */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select data-testid="platform-select" value={spatialMode === '3d' ? '3d' : platform} onChange={(e) => handlePlatformChange(e as any)} style={dropdownSelectStyle}>
                    <option value="desktop">Desktop</option>
                    <option value="tablet">Tablet</option>
                    <option value="mobile">Mobile</option>
                    <option value="custom">Custom</option>
                    <option value="3d">3D / VR</option>
                  </select>
                  <select data-testid="preset-select" value={activePreset} onChange={(e) => handlePresetChange(e as any)} style={dropdownSelectStyle}>
                    {Object.keys(PLATFORM_PRESETS[platform] || {}).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                {/* Spatial mode */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <select data-testid="spatial-mode" value={spatialMode} onChange={(e) => handleSpatialModeChange(e as any)} style={dropdownSelectStyle}>
                    <option value="2d">2D Canvas</option>
                    <option value="3d">3D Scene</option>
                    <option value="vr">VR (WebXR)</option>
                  </select>
                  {spatialMode === 'vr' && (
                    <button data-testid="enter-xr-btn" onClick={handleEnterXR} title="Enter VR" style={{ ...smallBtnBase, padding: '0 10px', width: 'auto', fontSize: '11px' }}>
                      <XRIcon /> Enter VR
                    </button>
                  )}
                </div>
                {/* Artboard preview */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <LabeledToolBtn testId="artboard-preview-toggle" icon={<ArtboardIcon />} label="Artboard" active={artboardPreview} onClick={handleArtboardPreviewToggle} title="Toggle Artboard Preview" />
                </div>
                {/* Canvas settings */}
                <div style={{ position: 'relative' }}>
                  <LabeledToolBtn testId="canvas-settings-btn" icon={<SettingsIcon />} label="Settings" active={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)} title="Canvas Settings" />
                  <CanvasSettingsDropdown isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} anchorRef={settingsButtonRef} viewportConfig={viewportConfig} borderRadius={borderRadius} canvasPosition={canvasPosition} />
                </div>
              </div>
            )}
          </div>
        )}

        <Divider />

        {/* Zoom controls */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <button data-testid="zoom-out" onClick={handleZoomOut} title="Zoom out" style={smallBtnBase}>−</button>
          <button
            data-testid="zoom-reset"
            onClick={handleZoomReset}
            title="Reset zoom"
            style={{ ...smallBtnBase, border: 'none', minWidth: '44px', color: 'var(--sn-text-muted, #6b7280)' }}
          >
            {zoomPercent}%
          </button>
          <button data-testid="zoom-in" onClick={handleZoomIn} title="Zoom in" style={smallBtnBase}>+</button>
        </div>

        <Divider />

        {/* Thumbnail capture */}
        {isEditMode && (
          <button
            data-testid="capture-thumbnail"
            onClick={handleCaptureThumbnail}
            title="Capture Thumbnail"
            style={smallBtnBase}
          >
            <CameraIcon />
          </button>
        )}

        {isEditMode && <Divider />}

        {/* ── Panels dropdown ── */}
        {isEditMode && (
          <div ref={panelsRef} style={{ position: 'relative' }}>
            <button
              data-testid="panels-dropdown-btn"
              onClick={() => setPanelsOpen((p) => !p)}
              title="Toggle panels"
              style={dropdownBtnStyle(panelsOpen)}
            >
              Panels <ChevronDownIcon open={panelsOpen} />
            </button>
            {panelsOpen && (
              <div style={popoverStyle}>
                <LabeledToolBtn testId="panel-gallery" icon={<GalleryIcon />} label="Gallery" active={!!panels['gallery']} onClick={() => handlePanelToggle('gallery')} title="Gallery" />
                <LabeledToolBtn testId="panel-stickers" icon={<StickerIcon />} label="Stickers" active={!!panels['stickers']} onClick={() => handlePanelToggle('stickers')} title="Stickers" />
                <LabeledToolBtn testId="panel-clear" icon={<ClearIcon />} label="Clear" active={false} onClick={handleClearCanvas} title="Clear Canvas" />
                <LabeledToolBtn testId="panel-dock" icon={<DockIcon />} label="Dock" active={false} onClick={handleDockerClick} title="Docker Library" />
                <LabeledToolBtn testId="panel-layers" icon={<LayersIcon />} label="Layers" active={!!panels['layers']} onClick={() => handlePanelToggle('layers')} title="Layers" />
              </div>
            )}
          </div>
        )}

        <Divider />

        {/* Mode toggle + Fullscreen */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            data-testid="mode-toggle"
            onClick={handleModeToggle}
            title={isEditMode ? 'Switch to Preview (P)' : 'Switch to Edit (P)'}
            style={{
              height: '32px',
              padding: '0 16px',
              border: '1px solid var(--sn-border, #e0e0e0)',
              borderRadius: 'var(--sn-radius, 6px)',
              background: isEditMode ? 'transparent' : 'var(--sn-accent, #6366f1)',
              color: isEditMode ? 'var(--sn-text, #1a1a2e)' : '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'inherit',
              fontWeight: 600,
              transition: `all 0.15s ${TOOLBAR_SPRING}`,
            }}
          >
            {isEditMode ? 'Run' : 'Edit'}
          </button>
          <button
            data-testid="fullscreen-preview-btn"
            onClick={handleFullscreenPreview}
            title="Fullscreen Preview (Shift+F)"
            style={{ ...smallBtnBase, height: '32px' }}
          >
            <FullscreenIcon />
          </button>
        </div>
      </div>
    </div>
  );
};
                                                                                                                                                                                                                                                                                                                           