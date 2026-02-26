/**
 * DockerContent — scrollable content area containing widgets.
 *
 * @remarks
 * Renders the widgets from the active tab in a vertical stack.
 * Supports scrolling when content exceeds the container height.
 *
 * @module shell/components/docker
 * @layer L6
 */

import React from 'react';

import type { DockerTab } from '@sn/types';

import { DockerWidgetSlot } from './DockerWidgetSlot';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DockerContentProps {
  /** Active tab with widgets to display */
  tab: DockerTab;
  /** Called when a widget is resized */
  onWidgetResize: (widgetInstanceId: string, height: number | undefined) => void;
  /** Called when a widget is removed */
  onWidgetRemove: (widgetInstanceId: string) => void;
  /** Render function for widget content */
  renderWidget: (widgetInstanceId: string) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DockerContent: React.FC<DockerContentProps> = ({
  tab,
  onWidgetResize,
  onWidgetRemove,
  renderWidget,
}) => {
  if (tab.widgets.length === 0) {
    return (
      <div
        data-testid="docker-content-empty"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--sn-text-muted, #9ca3af)',
          fontSize: '13px',
          fontStyle: 'italic',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        Dock widgets from the library or from selected canvas widgets
      </div>
    );
  }

  return (
    <div
      data-testid="docker-content"
      style={{
        flex: 1,
        overflow: 'auto',
        minHeight: 0,
      }}
    >
      {tab.widgets.map((slot) => (
        <DockerWidgetSlot
          key={slot.widgetInstanceId}
          slot={slot}
          onResize={onWidgetResize}
          onRemove={onWidgetRemove}
        >
          {renderWidget(slot.widgetInstanceId)}
        </DockerWidgetSlot>
      ))}
    </div>
  );
};
