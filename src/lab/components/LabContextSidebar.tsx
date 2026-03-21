/**
 * LabContextSidebar — Panel-switching left sidebar (~220px) for the Widget Lab.
 *
 * Shows different content depending on the active sidebar panel:
 * - entities: All 15 entity types grouped into Content/Visual/Spatial/Structure
 * - widgets: AI Generate, My Widgets, Marketplace, Upload
 * - inspector: Placeholder for node inspection
 * - testing: Device controls, simulation, console
 * - deploy: Manifest, history, validation actions
 *
 * Also shows project info at top and a context-specific action button at bottom.
 *
 * @module lab/components
 * @layer L2
 */

import React, { useState } from 'react';

import type { SidebarPanel } from '../hooks/useLabState';

import { labPalette, SPRING, HEX, hexToRgb } from './shared/palette';

const [sr, sg, sb] = hexToRgb(HEX.storm);
const [mr, mg, mb] = hexToRgb(HEX.moss);
const [er, eg, eb] = hexToRgb(HEX.ember);

// ═══════════════════════════════════════════════════════════════════
// Section component
// ═══════════════════════════════════════════════════════════════════

const SidebarSection: React.FC<{
  label: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}> = ({ label, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          border: 'none',
          background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
          color: labPalette.textMuted,
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'var(--sn-font-family)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          transition: `all 200ms ${SPRING}`,
          outline: 'none',
          textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: 8,
          transition: `transform 200ms ${SPRING}`,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          opacity: 0.5,
        }}>
          ▶
        </span>
        {label}
      </button>
      {open && children && (
        <div style={{ padding: '4px 12px 4px 24px' }}>
          {children}
        </div>
      )}
    </div>
  );
};

const SidebarItem: React.FC<{
  label: string;
  active?: boolean;
  icon?: string;
  onClick?: () => void;
}> = ({ label, active = false, icon, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 8px',
        borderRadius: 6,
        border: 'none',
        background: active
          ? `rgba(${sr},${sg},${sb},0.1)`
          : hovered
            ? 'rgba(255,255,255,0.03)'
            : 'transparent',
        color: active
          ? labPalette.text
          : hovered
            ? labPalette.textSoft
            : labPalette.textMuted,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: active ? 500 : 400,
        fontFamily: 'var(--sn-font-family)',
        transition: `all 200ms ${SPRING}`,
        outline: 'none',
        textAlign: 'left',
      }}
    >
      {icon && <span style={{ fontSize: 11, opacity: 0.6 }}>{icon}</span>}
      {label}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Panel-specific sections
// ═══════════════════════════════════════════════════════════════════

const EntitiesPanel: React.FC = () => (
  <>
    <SidebarSection label="Content">
      <SidebarItem label="Widget" icon="⬡" />
      <SidebarItem label="Sticker" icon="✦" />
      <SidebarItem label="Text" icon="T" />
      <SidebarItem label="Audio" icon="♫" />
      <SidebarItem label="Lottie" icon="▶" />
    </SidebarSection>
    <SidebarSection label="Visual">
      <SidebarItem label="Shape" icon="◻" />
      <SidebarItem label="Drawing" icon="✎" />
      <SidebarItem label="Path" icon="⌇" />
      <SidebarItem label="SVG" icon="◈" />
    </SidebarSection>
    <SidebarSection label="Spatial">
      <SidebarItem label="3D Object" icon="⬢" />
      <SidebarItem label="Artboard" icon="▭" />
    </SidebarSection>
    <SidebarSection label="Structure">
      <SidebarItem label="Docker" icon="▣" />
      <SidebarItem label="Group" icon="⊞" />
      <SidebarItem label="Folder" icon="📁" />
    </SidebarSection>
  </>
);

const WidgetsPanel: React.FC = () => {
  const [generateHovered, setGenerateHovered] = useState(false);
  const [browseHovered, setBrowseHovered] = useState(false);
  const [uploadHovered, setUploadHovered] = useState(false);

  return (
    <>
      <SidebarSection label="AI Generate">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            type="text"
            placeholder="Describe a widget..."
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.03)',
              color: labPalette.text,
              fontSize: 11,
              fontFamily: 'var(--sn-font-family)',
              outline: 'none',
              transition: `border-color 200ms ${SPRING}`,
              boxSizing: 'border-box' as const,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = `rgba(${er},${eg},${eb},0.3)`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
            }}
          />
          <button
            onMouseEnter={() => setGenerateHovered(true)}
            onMouseLeave={() => setGenerateHovered(false)}
            style={{
              width: '100%',
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: generateHovered
                ? `rgba(${er},${eg},${eb},0.2)`
                : `rgba(${er},${eg},${eb},0.12)`,
              color: labPalette.ember,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--sn-font-family)',
              transition: `all 250ms ${SPRING}`,
              outline: 'none',
              boxShadow: generateHovered
                ? `0 0 10px rgba(${er},${eg},${eb},0.15)`
                : 'none',
            }}
          >
            Generate
          </button>
        </div>
      </SidebarSection>
      <SidebarSection label="My Widgets">
        <SidebarItem label="Counter" icon="⬡" />
        <SidebarItem label="Weather" icon="⬡" />
        <SidebarItem label="Todo List" icon="⬡" />
      </SidebarSection>
      <SidebarSection label="Marketplace">
        <button
          onMouseEnter={() => setBrowseHovered(true)}
          onMouseLeave={() => setBrowseHovered(false)}
          style={{
            width: '100%',
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.08)',
            background: browseHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
            color: labPalette.textSoft,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 500,
            fontFamily: 'var(--sn-font-family)',
            transition: `all 200ms ${SPRING}`,
            outline: 'none',
          }}
        >
          Browse Marketplace
        </button>
      </SidebarSection>
      <SidebarSection label="Upload">
        <button
          onMouseEnter={() => setUploadHovered(true)}
          onMouseLeave={() => setUploadHovered(false)}
          style={{
            width: '100%',
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.08)',
            background: uploadHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
            color: labPalette.textSoft,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 500,
            fontFamily: 'var(--sn-font-family)',
            transition: `all 200ms ${SPRING}`,
            outline: 'none',
          }}
        >
          Upload .html
        </button>
      </SidebarSection>
    </>
  );
};

const InspectorPanel: React.FC<{ previewSlot?: React.ReactNode; isRunning?: boolean }> = ({
  previewSlot,
  isRunning = false,
}) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: 0,
  }}>
    {/* Live preview */}
    <div style={{
      flex: 1,
      minHeight: 120,
      margin: '0 12px 8px',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'var(--sn-bg, #0A0A0E)',
      border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: isRunning ? HEX.moss : labPalette.textFaint,
          boxShadow: isRunning ? `0 0 4px ${HEX.moss}40` : 'none',
          transition: `all 300ms ${SPRING}`,
        }} />
        <span style={{
          fontSize: 10,
          color: labPalette.textMuted,
          fontFamily: 'var(--sn-font-family)',
        }}>
          Preview
        </span>
      </div>
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {previewSlot ?? (
          <span style={{ color: labPalette.textFaint, fontSize: 11, fontStyle: 'italic' }}>
            No preview
          </span>
        )}
      </div>
    </div>

    {/* Node inspector placeholder */}
    <div style={{
      padding: '12px',
      borderTop: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{
        fontSize: 12,
        fontStyle: 'italic',
        color: labPalette.textFaint,
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        Select a node to inspect
      </div>
    </div>
  </div>
);

const TestingPanel: React.FC = () => (
  <>
    <SidebarSection label="Controls">
      <SidebarItem label="Desktop (1920×1080)" active />
      <SidebarItem label="Tablet (768×1024)" />
      <SidebarItem label="Phone (375×812)" />
    </SidebarSection>
    <SidebarSection label="Simulation">
      <SidebarItem label="Default" active />
      <SidebarItem label="High latency (200ms)" />
      <SidebarItem label="Offline" />
    </SidebarSection>
    <SidebarSection label="Console" defaultOpen={false}>
      <div style={{
        fontSize: 10,
        color: labPalette.textFaint,
        fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
        padding: '4px 0',
      }}>
        Run pipeline to see events
      </div>
    </SidebarSection>
  </>
);

const DeployPanel: React.FC = () => (
  <>
    <SidebarSection label="Manifest">
      <SidebarItem label="Name" />
      <SidebarItem label="Version" />
      <SidebarItem label="Events" />
    </SidebarSection>
    <SidebarSection label="History">
      <div style={{
        fontSize: 11,
        fontStyle: 'italic',
        color: labPalette.textFaint,
        padding: '4px 0',
      }}>
        No versions yet
      </div>
    </SidebarSection>
    <SidebarSection label="Actions">
      <SidebarItem label="Validate Pipeline" />
    </SidebarSection>
  </>
);

const PANEL_SECTIONS: Record<Exclude<SidebarPanel, 'inspector'>, React.FC> = {
  entities: EntitiesPanel,
  widgets: WidgetsPanel,
  testing: TestingPanel,
  deploy: DeployPanel,
};

const PANEL_BUTTON_LABELS: Record<SidebarPanel, string> = {
  entities: 'Add to Canvas',
  widgets: 'Add Widget',
  inspector: 'Remove Node',
  testing: 'Run Pipeline',
  deploy: 'Publish Pipeline',
};

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════

export interface LabContextSidebarProps {
  activePanel: SidebarPanel;
  projectName?: string;
  projectVersion?: string;
  previewSlot?: React.ReactNode;
  isRunning?: boolean;
}

export const LabContextSidebar: React.FC<LabContextSidebarProps> = ({
  activePanel,
  projectName = 'Untitled Widget',
  projectVersion = 'v0.1.0',
  previewSlot,
  isRunning,
}) => {
  const [actionHovered, setActionHovered] = useState(false);
  const buttonLabel = PANEL_BUTTON_LABELS[activePanel];

  return (
    <aside
      aria-label="Lab context sidebar"
      style={{
        width: 220,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sn-surface-glass, rgba(20,17,24,0.7))',
        backdropFilter: 'blur(16px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.1)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Project info */}
      <div style={{
        padding: '14px 12px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: labPalette.text,
          marginBottom: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {projectName}
        </div>
        <div style={{
          fontSize: 10,
          color: labPalette.textFaint,
          fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
        }}>
          {projectVersion}
        </div>
      </div>

      {/* Panel content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px 0',
      }}>
        {activePanel === 'inspector' ? (
          <InspectorPanel previewSlot={previewSlot} isRunning={isRunning} />
        ) : (
          (() => { const Panel = PANEL_SECTIONS[activePanel]; return <Panel />; })()
        )}
      </div>

      {/* Action button */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <button
          onMouseEnter={() => setActionHovered(true)}
          onMouseLeave={() => setActionHovered(false)}
          style={{
            width: '100%',
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: actionHovered
              ? `rgba(${mr},${mg},${mb},0.2)`
              : `rgba(${mr},${mg},${mb},0.12)`,
            color: labPalette.moss,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--sn-font-family)',
            transition: `all 250ms ${SPRING}`,
            outline: 'none',
            boxShadow: actionHovered
              ? `0 0 12px rgba(${mr},${mg},${mb},0.15)`
              : 'none',
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </aside>
  );
};
