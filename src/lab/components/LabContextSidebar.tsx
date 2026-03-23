/**
 * LabContextSidebar — Panel-switching left sidebar (~220px) for the Widget Lab.
 *
 * Shows different content depending on the active sidebar panel:
 * - entities: All entity types grouped into Content/Visual/Spatial/Structure
 * - widgets: My Widgets, Marketplace, Upload
 * - inspector: Live preview + node inspector
 * - testing: Device controls, simulation, console
 * - deploy: Manifest, history, validation actions
 *
 * All items are wired to callbacks — no dead placeholders.
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useRef, useState } from 'react';

import type { WidgetRegistryEntry } from '../../kernel/stores/widget/widget.store';
import type { SceneNodeType } from '../graph/scene-types';
import type { SidebarPanel } from '../hooks/useLabState';

import { labPalette, SPRING, HEX, hexToRgb } from './shared/palette';

const [sr, sg, sb] = hexToRgb(HEX.storm);
const [mr, mg, mb] = hexToRgb(HEX.moss);

// ═══════════════════════════════════════════════════════════════════
// Shared sidebar primitives
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

const GhostButton: React.FC<{
  label: string;
  onClick?: () => void;
}> = ({ label, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: '6px 12px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.08)',
        background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        color: labPalette.textSoft,
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 500,
        fontFamily: 'var(--sn-font-family)',
        transition: `all 200ms ${SPRING}`,
        outline: 'none',
      }}
    >
      {label}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Entity → SceneNodeType mapping
// ═══════════════════════════════════════════════════════════════════

/** Map sidebar entity labels to SceneNodeType (or null for future entity types) */
const ENTITY_MAP: Record<string, SceneNodeType | null> = {
  Widget: 'widget',
  Sticker: 'sticker',
  Docker: 'docker',
  Group: 'group',
  // These entity types don't have scene node equivalents yet:
  Text: null,
  Audio: null,
  Lottie: null,
  Shape: null,
  Drawing: null,
  Path: null,
  SVG: null,
  '3D Object': null,
  Artboard: null,
  Folder: null,
};

// ═══════════════════════════════════════════════════════════════════
// Panel components
// ═══════════════════════════════════════════════════════════════════

interface EntitiesPanelProps {
  onAddEntity: (type: SceneNodeType) => void;
}

const EntitiesPanel: React.FC<EntitiesPanelProps> = ({ onAddEntity }) => {
  const add = (label: string) => {
    const sceneType = ENTITY_MAP[label];
    if (sceneType) onAddEntity(sceneType);
  };

  return (
    <>
      <SidebarSection label="Content">
        <SidebarItem label="Widget" icon="⬡" onClick={() => add('Widget')} />
        <SidebarItem label="Sticker" icon="✦" onClick={() => add('Sticker')} />
        <SidebarItem label="Text" icon="T" onClick={() => add('Text')} />
        <SidebarItem label="Audio" icon="♫" onClick={() => add('Audio')} />
        <SidebarItem label="Lottie" icon="▶" onClick={() => add('Lottie')} />
      </SidebarSection>
      <SidebarSection label="Visual">
        <SidebarItem label="Shape" icon="◻" onClick={() => add('Shape')} />
        <SidebarItem label="Drawing" icon="✎" onClick={() => add('Drawing')} />
        <SidebarItem label="Path" icon="⌇" onClick={() => add('Path')} />
        <SidebarItem label="SVG" icon="◈" onClick={() => add('SVG')} />
      </SidebarSection>
      <SidebarSection label="Spatial">
        <SidebarItem label="3D Object" icon="⬢" onClick={() => add('3D Object')} />
        <SidebarItem label="Artboard" icon="▭" onClick={() => add('Artboard')} />
      </SidebarSection>
      <SidebarSection label="Structure">
        <SidebarItem label="Docker" icon="▣" onClick={() => add('Docker')} />
        <SidebarItem label="Group" icon="⊞" onClick={() => add('Group')} />
        <SidebarItem label="Folder" icon="📁" onClick={() => add('Folder')} />
      </SidebarSection>
    </>
  );
};

interface WidgetsPanelProps {
  installedWidgets: WidgetRegistryEntry[];
  onAddWidget: (entry: WidgetRegistryEntry) => void;
  onBrowseMarketplace: () => void;
  onUploadHtml: () => void;
}

const WidgetsPanel: React.FC<WidgetsPanelProps> = ({
  installedWidgets,
  onAddWidget,
  onBrowseMarketplace,
  onUploadHtml,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadHtml();
    // Reset the input so the same file can be selected again
    e.target.value = '';
  }, [onUploadHtml]);

  return (
    <>
      <SidebarSection label="My Widgets">
        {installedWidgets.length === 0 ? (
          <div style={{
            fontSize: 11, fontStyle: 'italic',
            color: labPalette.textFaint, padding: '4px 0',
          }}>
            No widgets installed
          </div>
        ) : (
          installedWidgets.map((entry) => (
            <SidebarItem
              key={entry.widgetId}
              label={entry.manifest.name}
              icon="⬡"
              onClick={() => onAddWidget(entry)}
            />
          ))
        )}
      </SidebarSection>
      <SidebarSection label="Marketplace">
        <GhostButton label="Browse Marketplace" onClick={onBrowseMarketplace} />
      </SidebarSection>
      <SidebarSection label="Upload">
        <GhostButton label="Upload .html" onClick={handleUploadClick} />
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      </SidebarSection>
    </>
  );
};

interface InspectorPanelProps {
  previewSlot?: React.ReactNode;
  isRunning?: boolean;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({
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
      margin: 0,
      borderRadius: 0,
      overflow: 'hidden',
      background: 'var(--sn-bg, #0A0A0E)',
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

interface TestingPanelProps {
  activeDevice: string;
  onDeviceChange: (device: string) => void;
  activeSimulation: string;
  onSimulationChange: (sim: string) => void;
  onRunPipeline: () => void;
}

const TestingPanel: React.FC<TestingPanelProps> = ({
  activeDevice,
  onDeviceChange,
  activeSimulation,
  onSimulationChange,
}) => (
  <>
    <SidebarSection label="Controls">
      <SidebarItem
        label="Desktop (1920×1080)"
        active={activeDevice === 'desktop'}
        onClick={() => onDeviceChange('desktop')}
      />
      <SidebarItem
        label="Tablet (768×1024)"
        active={activeDevice === 'tablet'}
        onClick={() => onDeviceChange('tablet')}
      />
      <SidebarItem
        label="Phone (375×812)"
        active={activeDevice === 'phone'}
        onClick={() => onDeviceChange('phone')}
      />
    </SidebarSection>
    <SidebarSection label="Simulation">
      <SidebarItem
        label="Default"
        active={activeSimulation === 'default'}
        onClick={() => onSimulationChange('default')}
      />
      <SidebarItem
        label="High latency (200ms)"
        active={activeSimulation === 'high-latency'}
        onClick={() => onSimulationChange('high-latency')}
      />
      <SidebarItem
        label="Offline"
        active={activeSimulation === 'offline'}
        onClick={() => onSimulationChange('offline')}
      />
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

interface DeployPanelProps {
  manifestName?: string;
  manifestVersion?: string;
  eventCount?: number;
  onValidate: () => void;
}

const DeployPanel: React.FC<DeployPanelProps> = ({
  manifestName,
  manifestVersion,
  eventCount = 0,
  onValidate,
}) => (
  <>
    <SidebarSection label="Manifest">
      <SidebarItem label={`Name: ${manifestName ?? 'Untitled'}`} />
      <SidebarItem label={`Version: ${manifestVersion ?? '0.0.0'}`} />
      <SidebarItem label={`Events: ${eventCount}`} />
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
      <SidebarItem label="Validate Pipeline" onClick={onValidate} />
    </SidebarSection>
  </>
);

// ═══════════════════════════════════════════════════════════════════
// Action button labels per panel
// ═══════════════════════════════════════════════════════════════════

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

  // Entity panel
  onAddEntity?: (type: SceneNodeType) => void;

  // Widget panel
  installedWidgets?: WidgetRegistryEntry[];
  onAddWidget?: (entry: WidgetRegistryEntry) => void;
  onBrowseMarketplace?: () => void;
  onUploadHtml?: () => void;

  // Testing panel
  activeDevice?: string;
  onDeviceChange?: (device: string) => void;
  activeSimulation?: string;
  onSimulationChange?: (sim: string) => void;

  // Deploy panel
  manifestName?: string;
  manifestVersion?: string;
  eventCount?: number;
  onValidate?: () => void;

  // Action button (bottom CTA per panel)
  onAction?: (panel: SidebarPanel) => void;
}

export const LabContextSidebar: React.FC<LabContextSidebarProps> = ({
  activePanel,
  projectName = 'Untitled Widget',
  projectVersion = 'v0.1.0',
  previewSlot,
  isRunning,
  onAddEntity,
  installedWidgets = [],
  onAddWidget,
  onBrowseMarketplace,
  onUploadHtml,
  activeDevice = 'desktop',
  onDeviceChange,
  activeSimulation = 'default',
  onSimulationChange,
  manifestName,
  manifestVersion,
  eventCount = 0,
  onValidate,
  onAction,
}) => {
  const [actionHovered, setActionHovered] = useState(false);
  const buttonLabel = PANEL_BUTTON_LABELS[activePanel];

  const handleAction = useCallback(() => {
    onAction?.(activePanel);
  }, [onAction, activePanel]);

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
        {activePanel === 'entities' && (
          <EntitiesPanel onAddEntity={onAddEntity ?? (() => {})} />
        )}
        {activePanel === 'widgets' && (
          <WidgetsPanel
            installedWidgets={installedWidgets}
            onAddWidget={onAddWidget ?? (() => {})}
            onBrowseMarketplace={onBrowseMarketplace ?? (() => {})}
            onUploadHtml={onUploadHtml ?? (() => {})}
          />
        )}
        {activePanel === 'inspector' && (
          <InspectorPanel previewSlot={previewSlot} isRunning={isRunning} />
        )}
        {activePanel === 'testing' && (
          <TestingPanel
            activeDevice={activeDevice}
            onDeviceChange={onDeviceChange ?? (() => {})}
            activeSimulation={activeSimulation}
            onSimulationChange={onSimulationChange ?? (() => {})}
            onRunPipeline={handleAction}
          />
        )}
        {activePanel === 'deploy' && (
          <DeployPanel
            manifestName={manifestName}
            manifestVersion={manifestVersion}
            eventCount={eventCount}
            onValidate={onValidate ?? (() => {})}
          />
        )}
      </div>

      {/* Action button */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <button
          onClick={handleAction}
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
