/**
 * LabLayout — Resizable split pane layout for the Widget Lab.
 *
 * Uses react-resizable-panels for a 3-panel split:
 * - Left (60%): Editor or Graph (toggled via tabs)
 * - Right-top: Preview
 * - Right-bottom: Inspector
 * - Collapsible bottom drawer: Manifest / Versions / Publish
 *
 * Entry animation: panels stagger in with spring physics (80ms gap).
 *
 * @module lab/components
 * @layer L2
 */

import { motion } from 'framer-motion';
import React, { useMemo } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import type { LabView, LabBottomTab } from '../hooks/useLabState';

import { GlassPanel , LabTabs } from './shared';


export interface LabLayoutProps {
  activeView: LabView;
  onViewChange: (view: LabView) => void;
  activeBottomTab: LabBottomTab;
  onBottomTabChange: (tab: LabBottomTab) => void;

  /** Slot: Editor panel content */
  editorSlot?: React.ReactNode;
  /** Slot: Graph panel content */
  graphSlot?: React.ReactNode;
  /** Slot: Preview panel content */
  previewSlot?: React.ReactNode;
  /** Slot: Inspector panel content */
  inspectorSlot?: React.ReactNode;
  /** Slot: Manifest panel content */
  manifestSlot?: React.ReactNode;
  /** Slot: Versions panel content */
  versionsSlot?: React.ReactNode;
  /** Slot: Publish panel content */
  publishSlot?: React.ReactNode;
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

const resizeHandleHorizontalStyle: React.CSSProperties = {
  height: '4px',
  background: 'transparent',
  cursor: 'row-resize',
  position: 'relative',
  transition: 'background 200ms',
};

const viewTabs = [
  { id: 'editor', label: 'Editor' },
  { id: 'graph', label: 'Graph' },
];

const bottomTabs = [
  { id: 'manifest', label: 'Manifest' },
  { id: 'versions', label: 'Versions' },
  { id: 'publish', label: 'Publish' },
];

export const LabLayout: React.FC<LabLayoutProps> = ({
  activeView,
  onViewChange,
  activeBottomTab,
  onBottomTabChange,
  editorSlot,
  graphSlot,
  previewSlot,
  inspectorSlot,
  manifestSlot,
  versionsSlot,
  publishSlot,
}) => {
  const bottomTabsWithToggle = useMemo(
    () => bottomTabs,
    [],
  );

  const handleBottomTabChange = (tabId: string) => {
    // Toggle: clicking the active tab closes the drawer
    if (tabId === activeBottomTab) {
      onBottomTabChange(null);
    } else {
      onBottomTabChange(tabId as LabBottomTab);
    }
  };

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
      {/* Main content area */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Group orientation="horizontal" id="lab-main">
          {/* Left panel: Editor / Graph */}
          <Panel defaultSize={60} minSize={30}>
            <motion.div
              {...staggerItem(0)}
              style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}
            >
              <GlassPanel
                style={{ padding: '4px' }}
                aria-label="View switcher"
              >
                <LabTabs
                  tabs={viewTabs}
                  activeTab={activeView}
                  onTabChange={(id) => onViewChange(id as LabView)}
                />
              </GlassPanel>

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

          {/* Right panel: Preview + Inspector */}
          <Panel defaultSize={40} minSize={20}>
            <Group orientation="vertical" id="lab-right">
              {/* Preview */}
              <Panel defaultSize={55} minSize={20}>
                <motion.div {...staggerItem(0.08)} style={{ height: '100%' }}>
                  <GlassPanel
                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    role="region"
                    aria-label="Widget preview"
                  >
                    {previewSlot}
                  </GlassPanel>
                </motion.div>
              </Panel>

              <Separator style={resizeHandleHorizontalStyle} />

              {/* Inspector */}
              <Panel defaultSize={45} minSize={15}>
                <motion.div {...staggerItem(0.16)} style={{ height: '100%' }}>
                  <GlassPanel
                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    role="region"
                    aria-label="Event inspector"
                  >
                    {inspectorSlot}
                  </GlassPanel>
                </motion.div>
              </Panel>
            </Group>
          </Panel>
        </Group>
      </div>

      {/* Bottom drawer: Manifest / Versions / Publish */}
      <motion.div {...staggerItem(0.24)}>
        <GlassPanel
          style={{ padding: '4px' }}
          aria-label="Bottom panel tabs"
        >
          <LabTabs
            tabs={bottomTabsWithToggle}
            activeTab={activeBottomTab ?? ''}
            onTabChange={handleBottomTabChange}
          />
        </GlassPanel>

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
              {activeBottomTab === 'manifest' && manifestSlot}
              {activeBottomTab === 'versions' && versionsSlot}
              {activeBottomTab === 'publish' && publishSlot}
            </GlassPanel>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
