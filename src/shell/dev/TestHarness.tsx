/**
 * Dev Test Harness — tabbed dev environment for testing, UI swatches, and split canvas.
 *
 * Three tabs:
 *   Systems  — event bus, canvas core, widgets, pipelines (original panels)
 *   Swatches — visual specimen sheet for the design system
 *   Split    — side-by-side dual canvas view
 *
 * @module shell/dev
 * @layer L6
 * @version 2026-03-19-v5
 */

import React, { useState, useEffect, useRef } from 'react';

import type { BusEvent, CanvasEntity, PipelineNode, PipelineEdge } from '@sn/types';
import { CanvasEvents, WidgetEvents } from '@sn/types';

import {
  createViewport,
  createSceneGraph,
  panBy,
  zoomTo,
  canvasToScreen,
  screenToCanvas,
  hitTestPoint as hitTestPointFn,
  type ViewportState,
  type SceneGraph,
} from '../../canvas/core';
import type { BenchResult } from '../../kernel/bus';
import { bus } from '../../kernel/bus';
import { palette } from '../theme/theme-vars';

import { CanvasCorePanel } from './panels/CanvasCorePanel';
import { CrossCanvasPanel } from './panels/CrossCanvasPanel';
import { EventBusPanel } from './panels/EventBusPanel';
import { GridLayerPanel } from './panels/GridLayerPanel';
import { ImageGenerationPanel } from './panels/ImageGenerationPanel';
import { MultiEntityCanvas } from './panels/MultiEntityCanvas';
import { PipelinePanel } from './panels/PipelinePanel';
import { SpatialCanvasPanel } from './panels/SpatialCanvasPanel';
import { UISwatchesPanel } from './panels/UISwatchesPanel';
import { VideoEditingPanel } from './panels/VideoEditingPanel';
import { WidgetRuntimePanel } from './panels/WidgetRuntimePanel';
import { SplitCanvasView } from './SplitCanvasView';
import { type EntityType, createTestEntity } from './test-entity-factory';
import { ThemeToggle } from './ThemeToggle';

// ============================================================================
// Tab Types & Config
// ============================================================================

type DevTab = 'systems' | 'swatches' | 'split';

interface TabDef {
  id: DevTab;
  label: string;
}

const DEV_TABS: TabDef[] = [
  { id: 'systems', label: 'Systems' },
  { id: 'swatches', label: 'UI Swatches' },
  { id: 'split', label: 'Split Canvas' },
];


// ============================================================================
// Main Component
// ============================================================================

export const TestHarness: React.FC<{ initialTab?: DevTab }> = ({ initialTab }) => {
  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState<DevTab>(() => {
    // Support ?tab=swatches or ?tab=split in URL
    if (initialTab) return initialTab;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'swatches' || tab === 'split') return tab;
    }
    return 'systems';
  });

  // ---- Event Bus State ----
  const [busHistory, setBusHistory] = useState<BusEvent[]>([]);
  const [benchResult, setBenchResult] = useState<BenchResult | null>(null);
  const [customEventType, setCustomEventType] = useState('test.event');
  const [customPayload, setCustomPayload] = useState('{"message":"hello"}');
  const [eventFilter, setEventFilter] = useState('');
  const [wildcardSub, setWildcardSub] = useState('');
  const [activeWildcards, setActiveWildcards] = useState<string[]>([]);

  // ---- Canvas State ----
  const [viewport, setViewport] = useState<ViewportState>(() => createViewport(800, 600));
  const [sceneGraph] = useState<SceneGraph>(() => createSceneGraph());
  const [entities, setEntities] = useState<CanvasEntity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entityType, setEntityType] = useState<EntityType>('sticker');
  const entityIdRef = useRef(0);

  // ---- Hit Test State ----
  const [hitTestCoords, setHitTestCoords] = useState({ x: 200, y: 200 });
  const [hitTestResult, setHitTestResult] = useState<string[]>([]);

  // ---- Widget State ----
  const [activeWidgets, setActiveWidgets] = useState<{ id: string; type: string; channel: string }[]>([]);

  // ---- Pipeline State ----
  const [pipelineNodes, setPipelineNodes] = useState<PipelineNode[]>([]);
  const [pipelineEdges, setPipelineEdges] = useState<PipelineEdge[]>([]);

  // ---- Stats ----
  const [stats, setStats] = useState({ totalEvents: 0, eventsPerSec: 0 });
  const eventCountRef = useRef(0);

  // Subscribe to all bus events
  useEffect(() => {
    const unsub = bus.subscribeAll((event) => {
      eventCountRef.current++;
      setBusHistory((prev) => [...prev.slice(-99), event]);
    });
    const interval = setInterval(() => {
      setStats((s) => ({ totalEvents: eventCountRef.current, eventsPerSec: eventCountRef.current - s.totalEvents }));
    }, 1000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  // ---- Event Bus Actions ----
  const emitCustomEvent = () => {
    try { bus.emit(customEventType, JSON.parse(customPayload)); }
    catch { alert('Invalid JSON payload'); }
  };
  const emitBurstEvents = (count: number) => {
    for (let i = 0; i < count; i++) bus.emit('burst.event', { index: i, timestamp: Date.now() });
  };
  const runBenchmark = () => setBenchResult(bus.bench(10000));
  const addWildcardSubscription = () => {
    if (!wildcardSub || activeWildcards.includes(wildcardSub)) return;
    setActiveWildcards((prev) => [...prev, wildcardSub]);
    setWildcardSub('');
  };

  // ---- Canvas Actions ----
  const addEntity = () => {
    const id = `${entityType}-${++entityIdRef.current}`;
    const entity = createTestEntity(id, entityType, Math.random() * 500, Math.random() * 400, entityIdRef.current);
    sceneGraph.addEntity(entity);
    setEntities([...sceneGraph.getAllEntities()]);
    bus.emit(CanvasEvents.ENTITY_CREATED, { entity });
  };
  const addMultipleEntities = (count: number) => {
    const types: EntityType[] = ['sticker', 'text', 'shape', 'widget'];
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      sceneGraph.addEntity(createTestEntity(`${type}-${++entityIdRef.current}`, type, Math.random() * 600, Math.random() * 400, entityIdRef.current));
    }
    setEntities([...sceneGraph.getAllEntities()]);
    bus.emit(CanvasEvents.ENTITY_CREATED, { count });
  };
  const removeEntity = (id: string) => {
    sceneGraph.removeEntity(id);
    setEntities([...sceneGraph.getAllEntities()]);
    if (selectedId === id) setSelectedId(null);
    bus.emit(CanvasEvents.ENTITY_DELETED, { entityId: id });
  };
  const clearAllEntities = () => {
    for (const e of sceneGraph.getAllEntities()) sceneGraph.removeEntity(e.id);
    setEntities([]); setSelectedId(null);
    bus.emit(CanvasEvents.ENTITY_DELETED, { all: true });
  };
  const selectEntity = (id: string) => {
    setSelectedId(id === selectedId ? null : id);
    bus.emit(CanvasEvents.ENTITY_SELECTED, { entityId: id });
  };
  const moveSelectedEntity = (dx: number, dy: number) => {
    if (!selectedId) return;
    const entity = sceneGraph.getEntity(selectedId);
    if (!entity) return;
    const newPos = { x: entity.transform.position.x + dx, y: entity.transform.position.y + dy };
    sceneGraph.updateEntity(selectedId, { transform: { ...entity.transform, position: newPos } } as Partial<CanvasEntity>);
    setEntities([...sceneGraph.getAllEntities()]);
    bus.emit(CanvasEvents.ENTITY_MOVED, { entityId: selectedId, position: newPos });
  };
  const bringToFront = () => {
    if (!selectedId) return;
    sceneGraph.bringToFront(selectedId);
    setEntities([...sceneGraph.getAllEntities()]);
    bus.emit('canvas.entity.reordered', { entityId: selectedId, action: 'bringToFront' });
  };
  const sendToBack = () => {
    if (!selectedId) return;
    sceneGraph.sendToBack(selectedId);
    setEntities([...sceneGraph.getAllEntities()]);
    bus.emit('canvas.entity.reordered', { entityId: selectedId, action: 'sendToBack' });
  };
  const bringForward = () => {
    if (!selectedId) return;
    sceneGraph.bringForward(selectedId);
    setEntities([...sceneGraph.getAllEntities()]);
    bus.emit('canvas.entity.reordered', { entityId: selectedId, action: 'bringForward' });
  };
  const sendBackward = () => {
    if (!selectedId) return;
    sceneGraph.sendBackward(selectedId);
    setEntities([...sceneGraph.getAllEntities()]);
    bus.emit('canvas.entity.reordered', { entityId: selectedId, action: 'sendBackward' });
  };

  // ---- Hit Testing ----
  const runHitTest = () => {
    hitTestPointFn(sceneGraph, hitTestCoords);
    const hits: string[] = [];
    for (const e of sceneGraph.getAllEntities()) {
      const { position, size } = e.transform;
      if (hitTestCoords.x >= position.x && hitTestCoords.x <= position.x + size.width &&
          hitTestCoords.y >= position.y && hitTestCoords.y <= position.y + size.height) {
        hits.push(e.id);
      }
    }
    setHitTestResult(hits);
    bus.emit('canvas.hittest', { point: hitTestCoords, hits, topEntity: hits[0] ?? null });
  };

  // ---- Viewport ----
  const handlePan = (dx: number, dy: number) => setViewport((v) => panBy(v, { x: dx, y: dy }));
  const handleZoom = (delta: number) => setViewport((v) => zoomTo(v, v.zoom + delta, { x: 400, y: 300 }));

  // ---- Widget Management ----
  const addWidget = (type: string) => {
    const id = `widget-${Date.now()}`;
    setActiveWidgets((prev) => [...prev, { id, type, channel: '' }]);
    bus.emit(WidgetEvents.MOUNTED, { widgetId: id, type });
  };
  const removeWidget = (id: string) => {
    setActiveWidgets((prev) => prev.filter((w) => w.id !== id));
    bus.emit(WidgetEvents.UNMOUNTED, { widgetId: id });
  };
  const updateWidgetChannel = (id: string, channel: string) => {
    setActiveWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, channel } : w)),
    );
  };

  // ---- Pipeline ----
  const addPipelineNode = (type: string) => {
    const node: PipelineNode = {
      id: `node-${Date.now()}`,
      type: type as PipelineNode['type'],
      position: { x: Math.random() * 400, y: Math.random() * 300 },
      inputPorts: [{ id: 'input', name: 'Input', direction: 'input' as const }],
      outputPorts: [{ id: 'output', name: 'Output', direction: 'output' as const }],
      widgetInstanceId: type === 'widget' ? `widget-${Date.now()}` : undefined,
      config: {},
    };
    setPipelineNodes((prev) => [...prev, node]);
    bus.emit(CanvasEvents.PIPELINE_NODE_ADDED, { node });
  };
  const connectNodes = (sourceId: string, targetId: string) => {
    const edge: PipelineEdge = {
      id: `edge-${Date.now()}`,
      sourceNodeId: sourceId, sourcePortId: 'output',
      targetNodeId: targetId, targetPortId: 'input',
    };
    setPipelineEdges((prev) => [...prev, edge]);
    bus.emit('pipeline.edge.added', { edge });
  };

  // ---- Computed Values ----
  const [testPoint] = useState({ x: 100, y: 100 });
  const screenPoint = canvasToScreen(testPoint, viewport);
  const backToCanvas = screenToCanvas(screenPoint, viewport);
  const selectedEntity = selectedId ? sceneGraph.getEntity(selectedId) ?? null : null;

  return (
    <div style={{ background: 'var(--sn-bg, #111827)', color: 'var(--sn-text, #e5e7eb)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header + Tabs ───────────────────────────────────────── */}
      <div style={{
        padding: '12px 20px 0',
        background: palette.surface,
        borderBottom: `1px solid ${palette.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--sn-font-family)', fontWeight: 700 }}>StickerNest V5 Dev</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {activeTab === 'systems' && (
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: palette.textMuted }}>
                Events: {stats.totalEvents} | /sec: {stats.eventsPerSec} | Entities: {entities.length}
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Tab bar */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: 0,
          }}
        >
          {DEV_TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`devpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 20px',
                  fontSize: 12,
                  fontFamily: 'var(--sn-font-family)',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? palette.text : palette.textMuted,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--sn-storm)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                  outline: 'none',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'systems' && (
          <div
            id="devpanel-systems"
            role="tabpanel"
            style={{ padding: 20, fontFamily: 'monospace', fontSize: 11, maxWidth: 1200 }}
          >
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <EventBusPanel
                customEventType={customEventType} setCustomEventType={setCustomEventType}
                customPayload={customPayload} setCustomPayload={setCustomPayload}
                emitCustomEvent={emitCustomEvent} emitBurstEvents={emitBurstEvents}
                runBenchmark={runBenchmark}
                wildcardSub={wildcardSub} setWildcardSub={setWildcardSub}
                addWildcardSubscription={addWildcardSubscription} activeWildcards={activeWildcards}
                benchResult={benchResult} eventFilter={eventFilter} setEventFilter={setEventFilter}
                busHistory={busHistory} clearHistory={() => setBusHistory([])}
              />
              <CanvasCorePanel
                viewport={viewport} onPan={handlePan} onZoom={handleZoom}
                onResetViewport={() => setViewport(createViewport(800, 600))}
                testPoint={testPoint} screenPoint={screenPoint} backToCanvas={backToCanvas}
                entityType={entityType} setEntityType={setEntityType}
                addEntity={addEntity} addMultipleEntities={addMultipleEntities}
                clearAllEntities={clearAllEntities}
                selectedEntity={selectedEntity} selectedId={selectedId}
                moveSelectedEntity={moveSelectedEntity} bringToFront={bringToFront}
                sendToBack={sendToBack} bringForward={bringForward}
                sendBackward={sendBackward} removeEntity={removeEntity}
                entities={entities} selectEntity={selectEntity}
                hitTestCoords={hitTestCoords} setHitTestCoords={setHitTestCoords}
                runHitTest={runHitTest} hitTestResult={hitTestResult}
              />
              <WidgetRuntimePanel
                activeWidgets={activeWidgets} addWidget={addWidget}
                removeWidget={removeWidget} clearWidgets={() => setActiveWidgets([])}
                updateWidgetChannel={updateWidgetChannel}
              />
              <CrossCanvasPanel />
              <PipelinePanel
                pipelineNodes={pipelineNodes} pipelineEdges={pipelineEdges}
                addPipelineNode={addPipelineNode} connectNodes={connectNodes}
                clearPipeline={() => { setPipelineNodes([]); setPipelineEdges([]); }}
              />
              <VideoEditingPanel />
              <ImageGenerationPanel />
              <MultiEntityCanvas />
              <SpatialCanvasPanel />
              <GridLayerPanel />
            </div>
          </div>
        )}

        {activeTab === 'swatches' && (
          <div id="devpanel-swatches" role="tabpanel">
            <UISwatchesPanel />
          </div>
        )}

        {activeTab === 'split' && (
          <div id="devpanel-split" role="tabpanel" style={{ height: 'calc(100vh - 90px)' }}>
            <SplitCanvasView />
          </div>
        )}
      </div>
    </div>
  );
};
