/**
 * Properties Panel — entity position, size, rotation, opacity, visibility, lock.
 * Wraps the headless PropertiesController from L4A-4.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

import React, { useCallback, useMemo } from 'react';

import type { CanvasEntity } from '@sn/types';
import { CanvasEvents } from '@sn/types';

import type { PropertyValue, EntityProperties } from '../../../canvas/panels/properties';
import { bus } from '../../../kernel/bus';
import { useDockerStore } from '../../../kernel/stores/docker';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';
import { useSelection } from '../hooks';


export interface PropertiesPanelProps {
  /** All current entities (from scene graph) */
  entities: CanvasEntity[];
}

/** Resolve properties for selected entities using the same logic as PropertiesController. */
function resolveProperties(entities: CanvasEntity[]): EntityProperties {
  if (entities.length === 0) {
    return {
      position: 'mixed',
      size: 'mixed',
      rotation: 'mixed',
      visible: 'mixed',
      locked: 'mixed',
      name: 'mixed',
    };
  }

  function resolve<T>(values: T[]): PropertyValue<T> {
    if (values.length === 0) return 'mixed';
    const first = values[0];
    if (typeof first === 'object' && first !== null) {
      const firstStr = JSON.stringify(first);
      return values.every((v) => JSON.stringify(v) === firstStr) ? first : 'mixed';
    }
    return values.every((v) => v === first) ? first : 'mixed';
  }

  return {
    position: resolve(entities.map((e) => e.transform.position)),
    size: resolve(entities.map((e) => e.transform.size)),
    rotation: resolve(entities.map((e) => e.transform.rotation)),
    visible: resolve(entities.map((e) => e.visible)),
    locked: resolve(entities.map((e) => e.locked)),
    name: resolve(entities.map((e) => e.name)),
  };
}

/** Display a property value, showing "mixed" for multi-select differences. */
function displayValue(val: PropertyValue<unknown>): string {
  if (val === 'mixed') return 'mixed';
  if (typeof val === 'number') return String(Math.round(val * 100) / 100);
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if ('x' in obj && 'y' in obj) {
      return `${Math.round((obj.x as number) * 10) / 10}, ${Math.round((obj.y as number) * 10) / 10}`;
    }
    if ('width' in obj && 'height' in obj) {
      return `${Math.round(obj.width as number)} x ${Math.round(obj.height as number)}`;
    }
  }
  return String(val ?? '');
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--sn-text-muted, #6b7280)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const valueStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--sn-text, #1a1a2e)',
  padding: '4px 8px',
  background: 'var(--sn-bg, #f8f9fa)',
  border: '1px solid var(--sn-border, #e0e0e0)',
  borderRadius: 'var(--sn-radius, 6px)',
  fontFamily: 'var(--sn-font-family, system-ui)',
  width: '100%',
  boxSizing: 'border-box' as const,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const twoColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
};
const CANVAS_DOCKER_NAME = 'Canvas Docker';

/**
 * Properties Panel — shows entity properties for the current selection.
 * Hidden in preview mode.
 */
export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ entities }) => {
  const mode = useUIStore((s) => s.canvasInteractionMode);
  const { selectedIds } = useSelection();

  const selectedEntities = useMemo(
    () => entities.filter((e) => selectedIds.has(e.id)),
    [entities, selectedIds],
  );

  const properties = useMemo(
    () => resolveProperties(selectedEntities),
    [selectedEntities],
  );
  const selectedWidget = useMemo(
    () =>
      selectedEntities.length === 1 && selectedEntities[0].type === 'widget'
        ? selectedEntities[0]
        : null,
    [selectedEntities],
  );

  const handleDockSelectedWidget = useCallback(() => {
    if (!selectedWidget || selectedWidget.type !== 'widget') return;

    const dockerStore = useDockerStore.getState();
    let dockerEntry =
      Object.values(dockerStore.dockers).find((docker) => docker.name === CANVAS_DOCKER_NAME) ??
      Object.values(dockerStore.dockers)[0];

    if (!dockerEntry) {
      const dockerId = dockerStore.addDocker({
        name: CANVAS_DOCKER_NAME,
        dockMode: 'docked-right',
        visible: true,
        pinned: true,
        size: { width: 320, height: 460 },
        tabs: [{ id: crypto.randomUUID(), name: 'Widgets', widgets: [] }],
      });
      dockerEntry = useDockerStore.getState().dockers[dockerId];
    }

    const alreadyDocked = dockerEntry.tabs.some((tab) =>
      tab.widgets.some((slot) => slot.widgetInstanceId === selectedWidget.widgetInstanceId),
    );
    if (!alreadyDocked) {
      dockerStore.addWidgetToTab(
        dockerEntry.id,
        dockerEntry.activeTabIndex,
        selectedWidget.widgetInstanceId,
        220,
      );
    }
    dockerStore.setVisible(dockerEntry.id, true);
    dockerStore.bringToFront(dockerEntry.id);

    bus.emit(CanvasEvents.ENTITY_UPDATED, {
      id: selectedWidget.id,
      updates: { visible: false },
    });
  }, [selectedWidget]);

  // Hidden in preview mode
  if (mode !== 'edit') return null;

  // Nothing selected
  if (selectedIds.size === 0) {
    return (
      <div
        data-testid="properties-panel"
        style={{
          padding: '16px',
          color: 'var(--sn-text-muted, #6b7280)',
          fontSize: '13px',
          fontFamily: 'var(--sn-font-family, system-ui)',
          textAlign: 'center',
        }}
      >
        Select an entity to view properties
      </div>
    );
  }

  const selectionLabel =
    selectedEntities.length === 1
      ? selectedEntities[0].name ?? `${selectedEntities[0].type}`
      : `${selectedEntities.length} entities selected`;

  return (
    <div
      data-testid="properties-panel"
      style={{
        padding: '12px',
        fontFamily: 'var(--sn-font-family, system-ui)',
        fontSize: '13px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontWeight: 600,
          fontSize: '14px',
          color: 'var(--sn-text, #1a1a2e)',
          borderBottom: '1px solid var(--sn-border, #e0e0e0)',
          paddingBottom: '8px',
        }}
      >
        {selectionLabel}
      </div>

      {/* Position */}
      <div style={twoColStyle}>
        <div style={rowStyle}>
          <label style={labelStyle}>X</label>
          <input
            data-testid="prop-x"
            readOnly
            value={properties.position === 'mixed' ? 'mixed' : String(Math.round((properties.position as { x: number }).x))}
            style={valueStyle}
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Y</label>
          <input
            data-testid="prop-y"
            readOnly
            value={properties.position === 'mixed' ? 'mixed' : String(Math.round((properties.position as { y: number }).y))}
            style={valueStyle}
          />
        </div>
      </div>

      {/* Size */}
      <div style={twoColStyle}>
        <div style={rowStyle}>
          <label style={labelStyle}>W</label>
          <input
            data-testid="prop-w"
            readOnly
            value={properties.size === 'mixed' ? 'mixed' : String(Math.round((properties.size as { width: number }).width))}
            style={valueStyle}
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>H</label>
          <input
            data-testid="prop-h"
            readOnly
            value={properties.size === 'mixed' ? 'mixed' : String(Math.round((properties.size as { height: number }).height))}
            style={valueStyle}
          />
        </div>
      </div>

      {/* Rotation */}
      <div style={rowStyle}>
        <label style={labelStyle}>Rotation</label>
        <input
          data-testid="prop-rotation"
          readOnly
          value={displayValue(properties.rotation)}
          style={valueStyle}
        />
      </div>

      {/* Visibility & Lock */}
      <div style={twoColStyle}>
        <div style={rowStyle}>
          <label style={labelStyle}>Visible</label>
          <div
            data-testid="prop-visible"
            style={{
              ...valueStyle,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            {displayValue(properties.visible)}
          </div>
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Locked</label>
          <div
            data-testid="prop-locked"
            style={{
              ...valueStyle,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            {displayValue(properties.locked)}
          </div>
        </div>
      </div>

      {selectedWidget ? (
        <div style={rowStyle}>
          <label style={labelStyle}>Widget</label>
          <button
            type="button"
            data-testid="prop-dock-widget"
            onClick={handleDockSelectedWidget}
            style={{
              ...valueStyle,
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--sn-surface, #fff)',
            }}
          >
            Dock To Docker
          </button>
        </div>
      ) : null}
    </div>
  );
};
