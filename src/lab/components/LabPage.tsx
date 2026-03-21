/**
 * LabPage — Top-level page component for the Widget Lab.
 *
 * Mounts at /lab route. Wraps with:
 * 1. Access guard (Creator+ tier check)
 * 2. Mobile viewport guard (desktop-only)
 *
 * Atmosphere: aurora gradients on prime-number drift cycles,
 * dual-layer grain with breathing animation, cursor-following
 * ambient light — matching the UI Swatches gallery.
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { WidgetManifest } from '@sn/types';

import { useAuthStore } from '../../kernel/stores/auth/auth.store';
import { buildAIGraphContext, serializeContextForPrompt } from '../ai/ai-context';
import type { SceneNode, SceneEdge } from '../graph/scene-types';
import { checkLabAccess } from '../guards/access-guard';
import { checkDesktopViewport } from '../guards/mobile-guard';
import { useCreatorMode } from '../hooks/useCreatorMode';
import { useLabState } from '../hooks/useLabState';

import { AICompanion, AISlidePanel } from './LabAI';
import { LabContextSidebar } from './LabContextSidebar';
import { LabGraph } from './LabGraph';
import { LabImportComponent } from './LabImport';
import { LabPreviewComponent } from './LabPreview';
import { LabSidebar } from './LabSidebar';
import { LabStatusBar } from './LabStatusBar';
import { OnboardingOverlay } from './OnboardingOverlay';
import type { OnboardingPath } from './OnboardingOverlay';
import { PromptBar } from './PromptBar';
import { GlassPanel, GlowButton } from './shared';
import { ensureLabKeyframes } from './shared/keyframes';
import { CanvasView } from './views';

// ═══════════════════════════════════════════════════════════════════
// Theme Detection
// ═══════════════════════════════════════════════════════════════════

/** Detect dark/light mode from prefers-color-scheme */
function useColorScheme(): 'dark' | 'light' {
  const [scheme, setScheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setScheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return scheme;
}

// ═══════════════════════════════════════════════════════════════════
// Atmospheric Layers
// ═══════════════════════════════════════════════════════════════════

/**
 * Dual-layer grain overlay with breathing animation.
 * Matches swatches/primitives.tsx GrainOverlay exactly.
 */
const GrainOverlay: React.FC<{ mode: 'dark' | 'light' }> = ({ mode }) => {
  const primaryOpacity = mode === 'dark' ? 0.045 : 0.022;
  const secondaryOpacity = mode === 'dark' ? 0.02 : 0.01;
  return (
  <div aria-hidden="true" style={{
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    animation: 'sn-grain-breathe 5s ease-in-out infinite',
  }}>
    {/* Primary grain layer */}
    <div style={{
      position: 'absolute', inset: 0,
      opacity: primaryOpacity,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: '128px 128px',
    }} />
    {/* Secondary grain — offset, slightly different frequency for organic depth */}
    <div style={{
      position: 'absolute', inset: 0,
      opacity: secondaryOpacity,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n2'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n2)'/%3E%3C/svg%3E")`,
      backgroundSize: '192px 192px',
      transform: 'translate(2px, 2px)',
    }} />
  </div>
  );
};

/**
 * Aurora layers — each gradient drifts independently on prime-number cycles.
 * Matches swatches/UISwatchesPanel exactly.
 */
const AuroraBackground: React.FC<{ mode: 'dark' | 'light' }> = ({ mode }) => {
  const opacity = mode === 'dark' ? 1 : 0.4;
  return (
    <>
      <div aria-hidden="true" style={{
        position: 'fixed', inset: '-20%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 20% 50%, rgba(78,123,142,0.06) 0%, transparent 55%)',
        animation: 'sn-aurora-1 23s ease-in-out infinite',
        opacity,
      }} />
      <div aria-hidden="true" style={{
        position: 'fixed', inset: '-20%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 80% 30%, rgba(232,128,108,0.04) 0%, transparent 50%)',
        animation: 'sn-aurora-2 31s ease-in-out infinite',
        opacity,
      }} />
      <div aria-hidden="true" style={{
        position: 'fixed', inset: '-20%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 80%, rgba(184,160,216,0.04) 0%, transparent 55%)',
        animation: 'sn-aurora-3 17s ease-in-out infinite',
        opacity,
      }} />
      <div aria-hidden="true" style={{
        position: 'fixed', inset: '-10%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 60% 60%, rgba(200,140,110,0.025) 0%, transparent 60%)',
        animation: 'sn-aurora-2 37s ease-in-out infinite reverse',
        opacity,
      }} />
    </>
  );
};

/**
 * Cursor-following ambient light — throttled to ~30fps.
 */
const CursorLight: React.FC<{ mousePos: { x: number; y: number }; mode: 'dark' | 'light' }> = ({ mousePos, mode }) => {
  const tint = mode === 'dark' ? 'rgba(232,128,108,0.03)' : 'rgba(200,160,130,0.025)';
  return (
    <div aria-hidden="true" style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      background: `radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, ${tint} 0%, transparent 60%)`,
      transition: 'background 300ms ease-out',
    }} />
  );
};

// ═══════════════════════════════════════════════════════════════════
// Guard Screens
// ═══════════════════════════════════════════════════════════════════

const UpgradePrompt: React.FC = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', background: 'var(--sn-bg)', fontFamily: 'var(--sn-font-family)',
  }}>
    <GlassPanel style={{
      padding: '48px', maxWidth: '480px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
    }}>
      <h2 style={{
        color: 'var(--sn-text)', fontSize: '24px', fontWeight: 600, margin: 0,
        fontFamily: 'var(--sn-font-serif, Newsreader, Georgia, serif)',
      }}>
        Widget Lab requires Creator tier
      </h2>
      <p style={{ color: 'var(--sn-text-muted)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
        The Widget Lab is a full-featured IDE for creating, testing, and publishing widgets.
        Upgrade to Creator or higher to unlock it.
      </p>
      <GlowButton color="storm">Upgrade Plan</GlowButton>
    </GlassPanel>
  </div>
);

const MobileRedirect: React.FC = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', padding: '24px', background: 'var(--sn-bg)', fontFamily: 'var(--sn-font-family)',
  }}>
    <GlassPanel style={{
      padding: '36px', maxWidth: '400px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
    }}>
      <h2 style={{ color: 'var(--sn-text)', fontSize: '20px', fontWeight: 600, margin: 0 }}>
        Desktop browser required
      </h2>
      <p style={{ color: 'var(--sn-text-muted)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
        Widget Lab needs a wider viewport to work properly.
        Open this URL on a desktop browser to continue.
      </p>
      <code style={{
        display: 'block', padding: '8px 12px', background: 'rgba(0,0,0,0.2)',
        borderRadius: '6px', color: 'var(--sn-text)', fontSize: '12px',
        fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
        userSelect: 'all', wordBreak: 'break-all',
      }}>
        {typeof window !== 'undefined' ? window.location.href : '/lab'}
      </code>
    </GlassPanel>
  </div>
);

const LabLoading: React.FC = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', background: 'var(--sn-bg)', fontFamily: 'var(--sn-font-family)',
    color: 'var(--sn-text-muted)', fontSize: '14px',
  }}>
    Initializing Widget Lab...
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════════

export const LabPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? checkDesktopViewport(window.innerWidth) : true,
  );

  useEffect(() => {
    ensureLabKeyframes();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(checkDesktopViewport(window.innerWidth));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isDesktop) return <MobileRedirect />;

  const accessResult = checkLabAccess(user);
  if (!accessResult.allowed) return <UpgradePrompt />;

  return <LabContent />;
};

/**
 * Inner Lab content — only rendered after guards pass.
 */
const LabContent: React.FC = () => {
  const lab = useLabState();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const colorScheme = useColorScheme();
  const [editorContent, setEditorContent] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [graphNodes, setGraphNodes] = useState<SceneNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<SceneEdge[]>([]);
  const [pendingAIPrompt, setPendingAIPrompt] = useState<string | null>(null);

  // Creator mode state
  const hasActiveWidget = useMemo(() => editorContent.trim().length > 0, [editorContent]);
  const creatorMode = useCreatorMode(hasActiveWidget);

  // AI slide panel state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const handleToggleAiPanel = useCallback(() => {
    setAiPanelOpen((v) => !v);
  }, []);

  // Track editor content for AI companion + publish
  useEffect(() => {
    if (!lab.instances?.editor) return;
    const unsub = lab.instances.editor.onChange((content) => {
      setEditorContent(content);
    });
    return unsub;
  }, [lab.instances]);

  // Auto-open AI slide panel when a pending prompt arrives in Creator Mode
  useEffect(() => {
    if (creatorMode.isCreatorMode && pendingAIPrompt) {
      setAiPanelOpen(true);
    }
  }, [creatorMode.isCreatorMode, pendingAIPrompt]);

  // Cursor-following ambient light — throttled to ~30fps
  const lastUpdate = useRef(0);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    if (now - lastUpdate.current < 33) return;
    lastUpdate.current = now;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  // Apply AI-generated code to editor
  const handleApplyCode = useCallback((code: string) => {
    if (lab.instances?.editor) {
      lab.instances.editor.setContent(code);
      setEditorContent(code);
    }
  }, [lab.instances]);

  // Build serialized AI context from graph state
  const graphContext = useMemo(() => {
    if (graphNodes.length === 0) return undefined;
    const ctx = buildAIGraphContext({
      level: 'scene',
      breadcrumbs: [{ id: 'scene', label: 'Scene', level: 'scene', nodeId: null }],
      sceneNodes: graphNodes,
      sceneEdges: graphEdges,
    });
    return serializeContextForPrompt(ctx);
  }, [graphNodes, graphEdges]);

  // Graph state change callback
  const handleGraphStateChange = useCallback((nodes: SceneNode[], edges: SceneEdge[]) => {
    setGraphNodes(nodes);
    setGraphEdges(edges);
  }, []);

  // Handle onboarding path selection
  const handleOnboardingPath = useCallback((path: OnboardingPath) => {
    creatorMode.dismissOnboarding();
    switch (path) {
      case 'template':
        // Future: open template picker. For now, dismiss onboarding.
        break;
      case 'describe':
        // Focus AI prompt bar — canvas is always visible now.
        lab.setActiveSidebarPanel('widgets');
        break;
      case 'visual':
        // Show entities panel for visual building.
        lab.setActiveSidebarPanel('entities');
        break;
    }
  }, [creatorMode, lab]);

  // Reload the preview widget by bumping a key to force remount
  const [previewReloadKey] = useState(0);

  // Describe widget — triggered from library picker "Ask AI" button
  const handleDescribeWidget = useCallback((manifest: WidgetManifest) => {
    const eventsInfo = [
      ...(manifest.events?.emits ?? []).map((e) => `emits: ${e.name}`),
      ...(manifest.events?.subscribes ?? []).map((e) => `subscribes: ${e.name}`),
    ].join(', ');
    const prompt = `Describe what the "${manifest.name}" widget does${eventsInfo ? ` (${eventsInfo})` : ''}. What widgets pair well with it? How could it fit into my current pipeline?`;
    setPendingAIPrompt(prompt);
  }, []);

  if (!lab.ready || !lab.instances) return <LabLoading />;

  const { instances } = lab;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        height: '100%', width: '100%',
        background: 'var(--sn-bg, #0A0A0E)',
        position: 'relative', overflow: 'hidden',
        fontFamily: 'var(--sn-font-family)',
      }}
    >
      <AuroraBackground mode={colorScheme} />
      <CursorLight mousePos={mousePos} mode={colorScheme} />
      <GrainOverlay mode={colorScheme} />

      {/* Lab layout — Icon Rail + Sidebar Panel + Full-bleed Canvas + Status Bar */}
      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Main area: icon rail + sidebar + canvas */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Icon rail — far left */}
          <LabSidebar
            activePanel={lab.activeSidebarPanel}
            onPanelChange={lab.setActiveSidebarPanel}
          />

          {/* Context sidebar — panel content */}
          <LabContextSidebar
            activePanel={lab.activeSidebarPanel}
            projectName={instances.manifest.getManifest()?.name ?? 'Untitled Widget'}
            projectVersion="v0.1.0"
            previewSlot={<LabPreviewComponent key={previewReloadKey} preview={instances.preview} />}
            isRunning={hasActiveWidget}
          />

          {/* Full-bleed canvas */}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <CanvasView
              debugMode={lab.debugMode}
              onToggleDebug={lab.toggleDebugMode}
              graphSlot={
                <LabGraph
                  graphSync={instances.graphSync}
                  onCompile={(html) => {
                    instances.editor.setContent(html);
                  }}
                  onGraphStateChange={handleGraphStateChange}
                  onDescribeWidget={handleDescribeWidget}
                />
              }
              promptBar={
                <PromptBar
                  generator={instances.aiGenerator}
                  onApplyCode={handleApplyCode}
                  currentEditorContent={editorContent}
                  graphContext={graphContext}
                  onExpandThread={handleToggleAiPanel}
                  threadOpen={aiPanelOpen}
                />
              }
            />
          </div>
        </div>

        {/* Bottom status bar */}
        <LabStatusBar
          projectName={instances.manifest.getManifest()?.name ?? 'Untitled Widget'}
          hasUnsavedChanges={hasActiveWidget}
          connected={true}
          streaming={true}
          branch="main"
          latencyMs={12}
        />
      </div>

      {/* Onboarding overlay (Creator Mode, first-time, no active widget) */}
      <OnboardingOverlay
        visible={creatorMode.showOnboarding}
        onSelectPath={handleOnboardingPath}
        onDismiss={creatorMode.dismissOnboarding}
      />

      {/* AI surface — slide panel in Creator Mode, floating orb in classic */}
      {creatorMode.isCreatorMode ? (
        <AISlidePanel
          open={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
          generator={instances.aiGenerator}
          onApplyCode={handleApplyCode}
          currentEditorContent={editorContent}
          graphContext={graphContext}
          pendingPrompt={pendingAIPrompt}
          onPendingPromptConsumed={() => setPendingAIPrompt(null)}
        />
      ) : (
        <AICompanion
          generator={instances.aiGenerator}
          onApplyCode={handleApplyCode}
          currentEditorContent={editorContent}
          graphContext={graphContext}
          pendingPrompt={pendingAIPrompt}
          onPendingPromptConsumed={() => setPendingAIPrompt(null)}
        />
      )}

      {/* Import dialog */}
      {showImport && (
        <LabImportComponent
          listings={[]}
          onImport={(result) => {
            if (result.success) {
              instances.editor.setContent(result.html);
              setEditorContent(result.html);
              instances.manifest.setManifest(result.manifest);
              setShowImport(false);
            }
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
};
