/**
 * CreatorLayout — Preview-primary split layout for Creator Mode.
 *
 * Inverts the classic IDE layout: preview takes 65% (right), graph/code
 * takes 35% (left, collapsible). Bottom tray holds Inspector, Manifest,
 * and Publish panels.
 *
 * Uses react-resizable-panels for the same resize behavior as LabLayout.
 * Entry animation: panels stagger in with spring physics.
 *
 * @module lab/components
 * @layer L2
 */

import { motion, AnimatePresence } from 'framer-motion';
import React, { useMemo } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import type { LabView, LabBottomTab } from '../hooks/useLabState';

import { GlassPanel, LabTabs } from './shared';

export interface CreatorLayoutProps {
  activeView: LabView;
  onViewChange: (view: LabView) => void;
  activeBottomTab: LabBottomTab;
  onBottomTabChange: (tab: LabBottomTab) => void;

  /** Whether the graph/code panel is collapsed */
  graphCollapsed: boolean;
  onToggleGraphCollapsed: () => void;

  /** Slot: Editor panel content */
  editorSlot?: React.ReactNode;
  /** Slot: Graph panel content */
  graphSlot?: React.ReactNode;
  /** Slot: Preview panel content (PRIMARY) */
  previewSlot?: React.ReactNode;
  /** Slot: Inspector panel content */
  inspectorSlot?: React.ReactNode;
  /** Slot: Manifest panel content */
  manifestSlot?: React.ReactNode;
  /** Slot: Versions panel content */
  versionsSlot?: React.ReactNode;
  /** Slot: Publish panel content */
  publishSlot?: React.ReactNode;
  /** Slot: Toolbar extras (play button, prompt bar, etc.) */
  toolbarExtras?: React.ReactNode;
}

const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

const staggerItem = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { ...SPRING_TRANSITION, delay },
  },
});

const resizeHandleStyle: React.CSSProperties = {
  width: '4px',
  background: 'transparent',
  cursor: 'col-resize',
  position: 'relative',
  transition: 'background 200ms',
};


const viewTabs = [
  { id: 'graph', label: 'Graph' },
  { id: 'editor', label: 'Code' },
];

const bottomTabs = [
  { id: 'inspector', label: 'Inspector' },
  { id: 'manifest', label: 'Manifest' },
  { id: 'versions', label: 'Versions' },
  { id: 'publish', label: 'Publish' },
];

export const CreatorLayout: React.FC<CreatorLayoutProps> = ({
  activeView,
  onViewChange,
  activeBottomTab,
  onBottomTabChange,
  graphCollapsed,
  onToggleGraphCollapsed,
  editorSlot,
  graphSlot,
  previewSlot,
  inspectorSlot,
  manifestSlot,
  versionsSlot,
  publishSlot,
  toolbarExtras,
}) => {
  const handleBottomTabChange = (tabId: string) => {
    if (tabId === activeBottomTab) {
      onBottomTabChange(null);
    } else {
      onBottomTabChange(tabId as LabBottomTab);
    }
  };

  // Map the 'inspector' bottom tab to the inspector slot
  const bottomContent = useMemo(() => {
    if (activeBottomTab === 'inspector') return inspectorSlot;
    if (activeBottomTab === 'manifest') return manifestSlot;
    if (activeBottomTab === 'versions') return versionsSlot;
    if (activeBottomTab === 'publish') return publishSlot;
    return null;
  }, [activeBottomTab, inspectorSlot, manifestSlot, publishSlot]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        gap: '4px',
        padding: '4px',
      }}
    >
      {/* Toolbar row */}
      <motion.div {...staggerItem(0)}>
        <GlassPanel
          style={{
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          aria-label="Creator toolbar"
        >
          {/* View toggle (Graph / Code) */}
          <div style={{ flexShrink: 0 }}>
            <LabTabs
              tabs={viewTabs}
              activeTab={activeView}
              onTabChange={(id) => onViewChange(id as LabView)}
            />
          </div>

          {/* Collapse/expand graph toggle */}
          <button
            onClick={onToggleGraphCollapsed}
            aria-label={graphCollapsed ? 'Expand graph panel' : 'Collapse graph panel'}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontFamily: 'var(--sn-font-family)',
              color: 'var(--sn-text-muted)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 200ms',
              flexShrink: 0,
            }}
          >
            {graphCollapsed ? 'Show Panel' : 'Hide Panel'}
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Toolbar extras slot (Play button, prompt bar, etc.) */}
          {toolbarExtras}
        </GlassPanel>
      </motion.div>

      {/* Main content area */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Group orientation="horizontal" id="creator-main">
          {/* Left panel: Graph / Code (collapsible) */}
          {!graphCollapsed && (
            <>
              <Panel defaultSize={35} minSize={20} id="creator-graph">
                <motion.div
                  {...staggerItem(0.08)}
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                  <GlassPanel
                    style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
                    role="tabpanel"
                    aria-label={activeView === 'editor' ? 'Code editor' : 'Graph editor'}
                  >
                    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                      {activeView === 'editor' ? editorSlot : graphSlot}
                    </div>
                  </GlassPanel>
                </motion.div>
              </Panel>

              <Separator style={resizeHandleStyle} />
            </>
          )}

          {/* Right panel: PREVIEW (primary) */}
          <Panel defaultSize={graphCollapsed ? 100 : 65} minSize={40} id="creator-preview">
            <motion.div {...staggerItem(0.16)} style={{ height: '100%' }}>
              <GlassPanel
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                role="region"
                aria-label="Widget preview"
              >
                {previewSlot}
              </GlassPanel>
            </motion.div>
          </Panel>
        </Group>
      </div>

      {/* Bottom tray: Inspector / Manifest / Publish */}
      <motion.div {...staggerItem(0.24)}>
        <GlassPanel
          style={{ padding: '4px' }}
          aria-label="Bottom panel tabs"
        >
          <LabTabs
            tabs={bottomTabs}
            activeTab={activeBottomTab ?? ''}
            onTabChange={handleBottomTabChange}
          />
        </GlassPanel>

        <AnimatePresence>
          {activeBottomTab && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 240, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_TRANSITION}
              style={{ overflow: 'hidden', marginTop: '4px' }}
            >
              <GlassPanel
                style={{ height: '100%', overflow: 'auto' }}
                role="tabpanel"
                aria-label={`${activeBottomTab} panel`}
              >
                {bottomContent}
              </GlassPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
