/**
 * CanvasCorePanel — Canvas Core testing panel with visual canvas
 * Extracted from TestHarness.tsx, enhanced with drag, shortcuts, and context menu
 *
 * @module shell/dev
 * @layer L6
 */

import React, { useState, useCallback } from 'react';

import type { CanvasEntity } from '@sn/types';

import type { ViewportState } from '../../../canvas/core';
import { CanvasContextMenu, useLongPress, type ContextMenuItem } from '../components/CanvasContextMenu';
import { useCanvasShortcuts } from '../hooks/use-canvas-shortcuts';
import { usePointerDrag } from '../hooks/use-pointer-drag';
import { type EntityType, ENTITY_COLORS } from '../test-entity-factory';

export interface CanvasCorePanelProps {
  viewport: ViewportState;
  onPan: (dx: number, dy: number) => void;
  onZoom: (delta: number) => void;
  onResetViewport: () => void;
  testPoint: { x: number; y: number };
  screenPoint: { x: number; y: number };
  backToCanvas: { x: number; y: number };
  entityType: EntityType;
  setEntityType: (t: EntityType) => void;
  addEntity: () => void;
  addMultipleEntities: (count: number) => void;
  clearAllEntities: () => void;
  selectedEntity: CanvasEntity | null;
  selectedId: string | null;
  moveSelectedEntity: (dx: number, dy: number) => void;
  bringToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  removeEntity: (id: string) => void;
  entities: CanvasEntity[];
  selectEntity: (id: string) => void;
  hitTestCoords: { x: number; y: number };
  setHitTestCoords: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  runHitTest: () => void;
  hitTestResult: string[];
}

export const CanvasCorePanel: React.FC<CanvasCorePanelProps> = ({
  viewport, onPan, onZoom, onResetViewport,
  testPoint, screenPoint, backToCanvas,
  entityType, setEntityType, addEntity, addMultipleEntities, clearAllEntities,
  selectedEntity, selectedId, moveSelectedEntity, bringToFront, sendToBack,
  bringForward, sendBackward, removeEntity,
  entities, selectEntity,
  hitTestCoords, setHitTestCoords, runHitTest, hitTestResult,
}) => {
  // ---- Context Menu State ----
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entityId: string } | null>(null);

  // ---- Pointer Drag ----
  const drag = usePointerDrag({
    onDragMove: useCallback((_id: string, delta: { dx: number; dy: number }) => {
      moveSelectedEntity(delta.dx, delta.dy);
    }, [moveSelectedEntity]),
    onTap: useCallback((id: string) => {
      selectEntity(id);
    }, [selectEntity]),
  });

  // ---- Keyboard Shortcuts ----
  const shortcuts = useCanvasShortcuts({
    hasSelection: !!selectedId,
    onDelete: useCallback(() => {
      if (selectedId) removeEntity(selectedId);
    }, [selectedId, removeEntity]),
    onDeselect: useCallback(() => {
      selectEntity(''); // Toggle deselect
    }, [selectEntity]),
    onSelectAll: useCallback(() => {
      if (entities.length > 0) selectEntity(entities[0].id);
    }, [entities, selectEntity]),
    onNudge: moveSelectedEntity,
    onBringForward: bringForward,
    onSendBackward: sendBackward,
    onBringToFront: bringToFront,
    onSendToBack: sendToBack,
  });

  // ---- Long Press (touch context menu) ----
  const longPress = useLongPress(
    useCallback((pos: { x: number; y: number }) => {
      if (selectedId) {
        setContextMenu({ x: pos.x, y: pos.y, entityId: selectedId });
      }
    }, [selectedId]),
  );

  // ---- Context Menu Items ----
  const contextMenuItems: ContextMenuItem[] = contextMenu ? [
    { label: 'Delete', action: () => removeEntity(contextMenu.entityId) },
    { label: 'Bring to Front', action: bringToFront },
    { label: 'Bring Forward', action: bringForward },
    { label: 'Send Backward', action: sendBackward },
    { label: 'Send to Back', action: sendToBack },
  ] : [];

  // ---- Canvas Click (deselect) ----
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking the canvas background, not an entity
    if (e.target === e.currentTarget) {
      selectEntity('');
    }
  }, [selectEntity]);

  // ---- Right-click Context Menu ----
  const handleContextMenu = useCallback((e: React.MouseEvent, entityId: string) => {
    e.preventDefault();
    e.stopPropagation();
    selectEntity(entityId);
    setContextMenu({ x: e.clientX, y: e.clientY, entityId });
  }, [selectEntity]);

  return (
    <section
      style={{ flex: '1 1 400px', border: '1px solid var(--sn-border, #374151)', padding: 10, outline: 'none' }}
      tabIndex={0}
      onKeyDown={shortcuts.onKeyDown}
    >
      <h2>Canvas Core</h2>

      <div style={{ marginBottom: 10 }}>
        <strong>Viewport:</strong> offset=({viewport.offset.x.toFixed(0)}, {viewport.offset.y.toFixed(0)}) zoom={viewport.zoom.toFixed(2)}
      </div>

      <div style={{ marginBottom: 10 }}>
        <button onClick={() => onPan(-50, 0)}>← Pan</button>
        <button onClick={() => onPan(50, 0)}>Pan →</button>
        <button onClick={() => onPan(0, -50)}>↑ Pan</button>
        <button onClick={() => onPan(0, 50)}>Pan ↓</button>
        <button onClick={() => onZoom(0.2)}>Zoom +</button>
        <button onClick={() => onZoom(-0.2)}>Zoom -</button>
        <button onClick={onResetViewport}>Reset</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <strong>Coord Test:</strong> Canvas({testPoint.x},{testPoint.y}) → Screen({screenPoint.x.toFixed(0)},{screenPoint.y.toFixed(0)}) → Back({backToCanvas.x.toFixed(0)},{backToCanvas.y.toFixed(0)})
        {Math.abs(testPoint.x - backToCanvas.x) < 0.01 ? ' ✓' : ' ✗'}
      </div>

      <div style={{ marginBottom: 10, borderTop: '1px solid #ddd', paddingTop: 10 }}>
        <strong>Entities:</strong>
        <select value={entityType} onChange={(e) => setEntityType(e.target.value as EntityType)} style={{ marginLeft: 5, marginRight: 5 }}>
          <option value="sticker">Sticker</option>
          <option value="text">Text</option>
          <option value="shape">Shape</option>
          <option value="widget">Widget</option>
        </select>
        <button onClick={addEntity}>Add 1</button>
        <button onClick={() => addMultipleEntities(10)}>Add 10</button>
        <button onClick={() => addMultipleEntities(100)}>Add 100</button>
        <button onClick={clearAllEntities}>Clear All</button>
      </div>

      {selectedEntity && (
        <div style={{ marginBottom: 10, background: 'var(--sn-surface, #1f2937)', padding: 5 }}>
          <strong>Selected:</strong> {selectedEntity.id} ({selectedEntity.type})<br />
          <button onClick={() => moveSelectedEntity(-20, 0)}>← Move</button>
          <button onClick={() => moveSelectedEntity(20, 0)}>Move →</button>
          <button onClick={() => moveSelectedEntity(0, -20)}>↑ Move</button>
          <button onClick={() => moveSelectedEntity(0, 20)}>Move ↓</button>
          <button onClick={bringToFront}>Front</button>
          <button onClick={bringForward}>Fwd</button>
          <button onClick={sendBackward}>Bwd</button>
          <button onClick={sendToBack}>Back</button>
          <button onClick={() => removeEntity(selectedEntity.id)}>Delete</button>
        </div>
      )}

      {/* Visual Canvas Area */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 250,
          background: '#0d1117',
          border: '1px solid var(--sn-border, #374151)',
          overflow: 'hidden',
          cursor: 'default',
          touchAction: 'none',
          marginBottom: 10,
        }}
        onClick={handleCanvasClick}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerDown={longPress.onPointerDown}
      >
        {entities.slice(0, 200).map((e) => {
          const color = ENTITY_COLORS[e.type as EntityType] || '#999';
          const isSelected = e.id === selectedId;
          const { position, size } = e.transform;
          return (
            <div
              key={e.id}
              onPointerDown={(ev) => drag.onPointerDown(ev, e.id)}
              onContextMenu={(ev) => handleContextMenu(ev, e.id)}
              style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                background: color + '40',
                border: isSelected ? `2px solid ${color}` : `1px solid ${color}80`,
                borderRadius: 3,
                cursor: 'grab',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                color: '#fff',
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}
              title={`${e.id} (${e.type}) z=${e.zIndex}`}
            >
              {e.type.charAt(0).toUpperCase()}
            </div>
          );
        })}
        {entities.length > 200 && (
          <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 8, color: '#666' }}>
            +{entities.length - 200} more
          </div>
        )}
      </div>

      <div style={{ maxHeight: 150, overflow: 'auto', background: 'var(--sn-surface, #1f2937)', padding: 5, fontSize: 10 }}>
        <strong>Scene Graph ({entities.length}):</strong>
        {entities.slice(0, 50).map((e) => (
          <div
            key={e.id}
            onClick={() => selectEntity(e.id)}
            style={{
              padding: '2px 5px',
              cursor: 'pointer',
              background: e.id === selectedId ? '#cfc' : 'transparent',
              borderLeft: `3px solid ${ENTITY_COLORS[e.type as EntityType] || '#999'}`,
              marginBottom: 1,
            }}
          >
            {e.id} z={e.zIndex} ({e.transform.position.x.toFixed(0)},{e.transform.position.y.toFixed(0)})
          </div>
        ))}
        {entities.length > 50 && <div>...and {entities.length - 50} more</div>}
      </div>

      <div style={{ marginTop: 10, borderTop: '1px solid #ddd', paddingTop: 10 }}>
        <strong>Hit Test:</strong>
        <input
          type="number"
          value={hitTestCoords.x}
          onChange={(e) => setHitTestCoords((p) => ({ ...p, x: +e.target.value }))}
          style={{ width: 50, marginLeft: 5 }}
        />
        <input
          type="number"
          value={hitTestCoords.y}
          onChange={(e) => setHitTestCoords((p) => ({ ...p, y: +e.target.value }))}
          style={{ width: 50, marginLeft: 5 }}
        />
        <button onClick={runHitTest} style={{ marginLeft: 5 }}>Test</button>
        <div style={{ fontSize: 10, marginTop: 5 }}>
          Hits: {hitTestResult.length > 0 ? hitTestResult.join(', ') : 'none'}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </section>
  );
};
