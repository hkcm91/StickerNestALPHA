/**
 * Route page components for each top-level route.
 *
 * @module shell/router
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { initCanvasCore, teardownCanvasCore } from '../../canvas/core';
import type { SceneGraph } from '../../canvas/core';
import { initCanvasPanels, teardownCanvasPanels } from '../../canvas/panels/init';
import { useUIStore } from '../../kernel/stores/ui/ui.store';
import { BUILT_IN_WIDGET_HTML } from '../../runtime/widgets/built-in-html';
import {
  CanvasWorkspace,
  useViewport,
  Toolbar,
  PropertiesPanel,
  LayersPanel,
  AssetPanel,
  useSceneGraph,
  usePersistence,
} from '../canvas';
import { ShellLayout } from '../layout';

import { seedDemoEntities } from '../canvas/seedDemoEntities';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DashboardPage: React.FC = () => (
  <div data-testid="page-dashboard"><h1>Dashboard</h1></div>
);

export const LoginPage: React.FC = () => (
  <div data-testid="page-login"><h1>Login</h1></div>
);

/**
 * Full canvas page — composes ShellLayout with CanvasWorkspace, toolbar, and panels.
 */
export const CanvasPage: React.FC = () => {
  const { canvasParam } = useParams<{ canvasParam: string }>();
  const setMode = useUIStore((s) => s.setCanvasInteractionMode);
  const mode = useUIStore((s) => s.canvasInteractionMode);
  const isUUID = canvasParam ? UUID_RE.test(canvasParam) : false;
  const isDemo = canvasParam === 'demo';
  const seededRef = useRef(false);
  const [sceneGraph, setSceneGraph] = useState<SceneGraph | null>(null);

  // Derive a stable canvas ID from the route param
  const canvasId = isUUID
    ? canvasParam!
    : isDemo
      ? '00000000-0000-4000-8000-000000000001'
      : canvasParam ?? 'unknown';

  // Set canvas interaction mode based on route
  useEffect(() => {
    setMode(isUUID || isDemo ? 'edit' : 'preview');
  }, [isUUID, isDemo, setMode]);

  // Initialize Canvas Core + Panels on mount
  useEffect(() => {
    const coreCtx = initCanvasCore();
    setSceneGraph(coreCtx.sceneGraph);
    initCanvasPanels(() => coreCtx.sceneGraph.entityCount > 0 ? 1 : 1);

    // Seed demo entities for /canvas/demo route
    if (isDemo && !seededRef.current) {
      seededRef.current = true;
      seedDemoEntities();
    }

    return () => {
      teardownCanvasPanels();
      teardownCanvasCore();
      setSceneGraph(null);
      seededRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get viewport store for toolbar zoom controls
  const { store: viewportStore } = useViewport();

  // Subscribe to scene graph changes for sidebar panels
  const entities = useSceneGraph(sceneGraph);

  // Persistence: auto-save + manual save/load
  const persistence = usePersistence(canvasId, sceneGraph);

  // Build widgetHtmlMap from current entities — maps instanceId → HTML source
  const widgetHtmlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entity of entities) {
      if (entity.type === 'widget') {
        const wEntity = entity as { widgetInstanceId: string; widgetId: string };
        const html = BUILT_IN_WIDGET_HTML[wEntity.widgetId];
        if (html) {
          map.set(wEntity.widgetInstanceId, html);
        }
      }
    }
    return map;
  }, [entities]);

  // Toggle edit/preview mode via P key
  const toggleMode = useCallback(() => {
    setMode(mode === 'edit' ? 'preview' : 'edit');
  }, [mode, setMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        toggleMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMode]);

  return (
    <div
      data-testid="page-canvas"
      data-mode={mode}
      style={{ width: '100vw', height: '100vh' }}
    >
      <ShellLayout
        topbar={
          <Toolbar
            viewportStore={viewportStore}
            saveStatus={persistence.status}
            onSave={persistence.save}
          />
        }
        sidebarLeft={mode === 'edit' ? <AssetPanel /> : undefined}
        sidebarRight={
          mode === 'edit' ? (
            <>
              <PropertiesPanel entities={entities} />
              <LayersPanel entities={entities} />
            </>
          ) : undefined
        }
      >
        <CanvasWorkspace sceneGraph={sceneGraph} widgetHtmlMap={widgetHtmlMap} />
      </ShellLayout>
    </div>
  );
};

export const MarketplacePage: React.FC = () => (
  <div data-testid="page-marketplace"><h1>Marketplace</h1></div>
);

export const SettingsPage: React.FC = () => (
  <div data-testid="page-settings"><h1>Settings</h1></div>
);

export const InvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  return (
    <div data-testid="page-invite"><h1>Accept Invite</h1><p>Token: {token}</p></div>
  );
};

export const NotFoundPage: React.FC = () => (
  <div data-testid="page-not-found"><h1>404 — Not Found</h1></div>
);
