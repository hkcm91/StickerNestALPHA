/**
 * Route page components for each top-level route.
 *
 * @module shell/router
 * @layer L6
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { initCanvasCore, teardownCanvasCore } from '../../canvas/core';
import type { SceneGraph } from '../../canvas/core';
// eslint-disable-next-line boundaries/element-types -- shell mounts canvas panels at route level
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
import { seedDemoEntities } from '../canvas/seedDemoEntities';
import { ShellLayout } from '../layout';


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DashboardPage: React.FC = () => (
  <div data-testid="page-dashboard" style={dashboardStyles.container}>
    <h1 style={dashboardStyles.title}>Dashboard</h1>
    <div style={dashboardStyles.grid}>
      <DashboardCard
        to="/canvas/demo"
        testId="dashboard-card-canvas"
        icon="C"
        label="Canvas"
        description="Open the infinite canvas workspace"
      />
      <DashboardCard
        to="/data"
        testId="dashboard-card-data"
        icon="D"
        label="Databases"
        description="Create, manage, and view your databases with AI tools"
      />
      <DashboardCard
        to="/marketplace"
        testId="dashboard-card-marketplace"
        icon="M"
        label="Marketplace"
        description="Discover and install widgets"
      />
      <DashboardCard
        to="/settings"
        testId="dashboard-card-settings"
        icon="S"
        label="Settings"
        description="User and workspace settings"
      />
    </div>
  </div>
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
  }, []); // eslint-disable-line

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

// =============================================================================
// DashboardCard
// =============================================================================

interface DashboardCardProps {
  to: string;
  testId: string;
  icon: string;
  label: string;
  description: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  to,
  testId,
  icon,
  label,
  description,
}: DashboardCardProps) => (
  <Link to={to} data-testid={testId} style={dashboardStyles.card}>
    <div style={dashboardStyles.cardIcon}>{icon}</div>
    <div style={dashboardStyles.cardLabel}>{label}</div>
    <div style={dashboardStyles.cardDesc}>{description}</div>
  </Link>
);

const dashboardStyles: Record<string, React.CSSProperties> = {
  container: { padding: '48px 24px', maxWidth: '900px', margin: '0 auto' },
  title: { fontSize: '28px', fontWeight: 700, margin: '0 0 32px', color: 'var(--sn-text, #111)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  card: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', background: 'var(--sn-surface, #fff)', border: '1px solid var(--sn-border, #ddd)', borderRadius: 'var(--sn-radius, 8px)', textDecoration: 'none', textAlign: 'center' as const, transition: 'border-color 0.15s, box-shadow 0.15s' },
  cardIcon: { width: '48px', height: '48px', borderRadius: '12px', background: 'var(--sn-accent, #2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, marginBottom: '12px' },
  cardLabel: { fontWeight: 600, fontSize: '16px', color: 'var(--sn-text, #111)', marginBottom: '6px' },
  cardDesc: { fontSize: '13px', color: 'var(--sn-text-muted, #666)', lineHeight: 1.4 },
};
