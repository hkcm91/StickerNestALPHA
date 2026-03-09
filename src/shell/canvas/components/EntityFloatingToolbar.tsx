/**
 * EntityFloatingToolbar — a small floating toolbar for quick entity actions.
 *
 * @module shell/canvas/components
 * @layer L6
 */

import React from "react";

import type { CanvasEntity } from "@sn/types";
import { CanvasEvents } from "@sn/types";

import { bus } from "../../../kernel/bus";
import { transition } from "../../theme/animation-vars";

// ---------------------------------------------------------------------------
// Icons (Inline SVGs)
// ---------------------------------------------------------------------------

const RotateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <polyline points="21 3 21 8 16 8" />
  </svg>
);

const FlipHIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3l-5 5 5 5V3z" />
    <path d="M9 3l5 5-5 5V3z" />
    <line x1="12" y1="1" x2="12" y2="23" strokeDasharray="4" />
  </svg>
);

const FlipVIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(90deg)' }}>
    <path d="M15 3l-5 5 5 5V3z" />
    <path d="M9 3l5 5-5 5V3z" />
    <line x1="12" y1="1" x2="12" y2="23" strokeDasharray="4" />
  </svg>
);

const View3DIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const PinIcon = ({ locked }: { locked: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={locked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const DockerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <path d="M7 21h10" />
    <path d="M12 17v4" />
  </svg>
);

const FolderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

/* P3: Invisible toolbar — glass surface, spring entry */
const toolbarStyle: React.CSSProperties = {
  position: "absolute",
  display: "flex",
  gap: "2px",
  background: "color-mix(in srgb, var(--sn-surface-raised, #1A1A1F) 92%, transparent)",
  padding: "4px 5px",
  borderRadius: "12px",
  boxShadow: "0 6px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--sn-border-hover, rgba(255,255,255,0.08))",
  pointerEvents: "auto",
  zIndex: 1000,
  backdropFilter: "blur(16px) saturate(1.2)",
  transform: "translateX(-50%)",
  userSelect: "none",
  animation: "sn-toolbar-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
};

const buttonBaseStyle: React.CSSProperties = {
  width: "30px",
  height: "30px",
  borderRadius: "8px",
  border: "none",
  background: "transparent",
  color: "var(--sn-text-soft, #A8A4AE)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: transition("all", { duration: "fast" }),
};

const dividerStyle: React.CSSProperties = {
  width: "1px",
  background: "var(--sn-border, rgba(255,255,255,0.04))",
  margin: "6px 2px",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface EntityFloatingToolbarProps {
  entity: CanvasEntity;
  position: { x: number; y: number };
}

export const EntityFloatingToolbar: React.FC<EntityFloatingToolbarProps> = ({
  entity,
  position,
}) => {
  const [hoveredBtn, setHoveredBtn] = React.useState<string | null>(null);

  /* P6: Feedback through light, not motion — hover glows, doesn't bounce */
  const getButtonStyle = (id: string, active: boolean = false): React.CSSProperties => ({
    ...buttonBaseStyle,
    background: active
      ? "var(--sn-accent, #3E7D94)"
      : hoveredBtn === id
        ? "color-mix(in srgb, var(--sn-accent, #3E7D94) 12%, transparent)"
        : "transparent",
    color: active ? "#ffffff" : hoveredBtn === id ? "var(--sn-text, #EDEBE6)" : "var(--sn-text-soft, #A8A4AE)",
  });

  const handleRotate = () => {
    const rotation = (entity.transform.rotation + 90) % 360;
    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: entity.id,
      updates: { transform: { ...entity.transform, rotation } },
    });
  };

  const handleFlipH = () => {
    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: entity.id,
      updates: { flipH: !(entity as any).flipH },
    });
  };

  const handleFlipV = () => {
    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: entity.id,
      updates: { flipV: !(entity as any).flipV },
    });
  };

  const handleToggle2D = () => {
    let next: '2d' | '3d' | 'both';
    if (entity.canvasVisibility === '2d') next = 'both';
    else if (entity.canvasVisibility === 'both') next = '3d';
    else next = '2d';

    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: entity.id,
      updates: { canvasVisibility: next },
    });
  };

  const handleToggle3D = () => {
    // Just toggle 3D bit
    let next: '2d' | '3d' | 'both';
    if (entity.canvasVisibility === '3d') next = 'both';
    else if (entity.canvasVisibility === 'both') next = '2d';
    else next = '3d';

    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: entity.id,
      updates: { canvasVisibility: next },
    });
  };

  const handleToggleDocker = () => {
    if (entity.type === 'docker') {
      // Revert to original type or just 'group'
      bus.emit(CanvasEvents.ENTITY_UPDATED, {
        id: entity.id,
        updates: { type: 'sticker' as any }, 
      });
    } else {
      bus.emit(CanvasEvents.ENTITY_UPDATED, {
        id: entity.id,
        updates: { 
          type: 'docker' as any,
          children: (entity as any).children || [],
          layout: 'free'
        },
      });
    }
  };

  const handleToggleFolder = () => {
    if (entity.type === 'docker' && (entity as any).layout === 'folder') {
      bus.emit(CanvasEvents.ENTITY_UPDATED, {
        id: entity.id,
        updates: { layout: 'free' },
      });
    } else {
      bus.emit(CanvasEvents.ENTITY_UPDATED, {
        id: entity.id,
        updates: { 
          type: 'docker' as any,
          layout: 'folder',
          children: (entity as any).children || [],
        },
      });
    }
  };

  const handleToggleLock = () => {
    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: entity.id,
      updates: { locked: !entity.locked },
    });
  };

  const handleSettings = () => {
    bus.emit("sticker.settings.requested", {
      entityId: entity.id,
      entity: entity,
    });
  };

  return (
    <div
      style={{
        ...toolbarStyle,
        left: position.x,
        top: position.y - 48,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button 
        style={getButtonStyle('rotate')} 
        onClick={handleRotate} 
        onMouseEnter={() => setHoveredBtn('rotate')}
        onMouseLeave={() => setHoveredBtn(null)}
        title="Rotate 90°"
      >
        <RotateIcon />
      </button>
      
      <button 
        style={getButtonStyle('flipH', !!(entity as any).flipH)} 
        onClick={handleFlipH}
        onMouseEnter={() => setHoveredBtn('flipH')}
        onMouseLeave={() => setHoveredBtn(null)}
        title="Flip Horizontal"
      >
        <FlipHIcon />
      </button>

      <button 
        style={getButtonStyle('flipV', !!(entity as any).flipV)} 
        onClick={handleFlipV}
        onMouseEnter={() => setHoveredBtn('flipV')}
        onMouseLeave={() => setHoveredBtn(null)}
        title="Flip Vertical"
      >
        <FlipVIcon />
      </button>

      <div style={dividerStyle} />

      <button
        style={getButtonStyle('2d', entity.canvasVisibility === '2d' || entity.canvasVisibility === 'both')}
        onClick={handleToggle2D}
        onMouseEnter={() => setHoveredBtn('2d')}
        onMouseLeave={() => setHoveredBtn(null)}
        title="Toggle 2D Visibility"
      >
        <span style={{ fontSize: '10px', fontWeight: 'bold' }}>2D</span>
      </button>

      <button
        style={getButtonStyle('3d', entity.canvasVisibility === '3d' || entity.canvasVisibility === 'both')}
        onClick={handleToggle3D}
        onMouseEnter={() => setHoveredBtn('3d')}
        onMouseLeave={() => setHoveredBtn(null)}
        title="Toggle 3D Visibility"
      >
        <View3DIcon />
      </button>

      <div style={dividerStyle} />

      <button
        style={getButtonStyle('docker', entity.type === 'docker')}
        onClick={handleToggleDocker}
        onMouseEnter={() => setHoveredBtn('docker')}
        onMouseLeave={() => setHoveredBtn(null)}
        title="Convert to Docker"
      >
        <DockerIcon />
      </button>

      <button
        style={getButtonStyle('folder', entity.type === 'docker' && (entity as any).layout === 'folder')}
        onClick={handleToggleFolder}
        onMouseEnter={() => setHoveredBtn('folder')}
        onMouseLeave={() => setHoveredBtn(null)}
        title="Toggle Folder Layout"
      >
        <FolderIcon />
      </button>

      <button
        style={getButtonStyle('lock', entity.locked)}
        onClick={handleToggleLock}
        onMouseEnter={() => setHoveredBtn('lock')}
        onMouseLeave={() => setHoveredBtn(null)}
        title={entity.locked ? "Unlock" : "Lock (Pin)"}
      >
        <PinIcon locked={entity.locked} />
      </button>

      <div style={dividerStyle} />

      <button 
        style={getButtonStyle('settings')} 
        onClick={handleSettings}
        onMouseEnter={() => setHoveredBtn('settings')}
        onMouseLeave={() => setHoveredBtn(null)}
        title="Entity Settings"
      >
        <SettingsIcon />
      </button>
    </div>
  );
};
