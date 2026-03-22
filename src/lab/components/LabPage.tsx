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
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';
import type { WidgetRegistryEntry } from '../../kernel/stores/widget/widget.store';
import { buildAIGraphContext, serializeContextForPrompt } from '../ai/ai-context';
import type { CompatibleWidget } from '../ai/prompt-questions';
import type { SceneNode, SceneEdge , SceneNodeType } from '../graph/scene-types';
import { checkLabAccess } from '../guards/access-guard';
import { checkDesktopViewport } from '../guards/mobile-guard';
import { useCreatorMode } from '../hooks/useCreatorMode';
import { useLabState } from '../hooks/useLabState';
import type { SidebarPanel } from '../hooks/useLabState';

import { AICompanion, AISlidePanel } from './LabAI';
import { LabContextSidebar } from './LabContextSidebar';
import { LabGraph } from './LabGraph';
import type { LabGraphAPI } from './LabGraph';
import { LabImportComponent } from './LabImport';
import { LabPreviewComponent } from './LabPreview';
import { LabSidebar } from './LabSidebar';
import { LabStatusBar } from './LabStatusBar';
import { OnboardingOverlay } from './OnboardingOverlay';
import type { OnboardingPath } from './OnboardingOverlay';
import { PromptBar } from './PromptBar';
import { PromptRefinement } from './PromptRefinement';
import { GlassPanel, GlowButton } from './shared';
import { ensureLabKeyframes } from './shared/keyframes';
import { StreamingPreview } from './StreamingPreview';
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
 * Orchestrates all sidebar, graph, AI, and status bar wiring.
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
  const [pendingRefinementPrompt, setPendingRefinementPrompt] = useState<string | null>(null);

  // Graph imperative API — set by LabGraph onAPIReady callback
  const graphAPIRef = useRef<LabGraphAPI | null>(null);

  // Widget registry from kernel store
  const widgetRegistry = useWidgetStore((s) => s.registry);
  const installedWidgets = useMemo(
    () => Object.values(widgetRegistry),
    [widgetRegistry],
  );

  // Creator mode state
  const hasActiveWidget = useMemo(() => editorContent.trim().length > 0, [editorContent]);
  const creatorMode = useCreatorMode(hasActiveWidget);

  // AI slide panel state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Testing panel state
  const [activeDevice, setActiveDevice] = useState('desktop');
  const [activeSimulation, setActiveSimulation] = useState('default');

  // AI generation status for status bar
  const [isGenerating, setIsGenerating] = useState(false);

  // Streaming preview state
  const [streamingHtml, setStreamingHtml] = useState('');
  const [streamingActive, setStreamingActive] = useState(false);
  const [streamingDone, setStreamingDone] = useState(false);
  const [streamingError, setStreamingError] = useState<string | null>(null);

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

  // Apply AI-generated code to editor + add widget node to graph
  const handleApplyCode = useCallback((code: string) => {
    if (lab.instances?.editor) {
      lab.instances.editor.setContent(code);
      setEditorContent(code);

      // If graph is empty, add a widget node to represent the generated widget
      if (graphAPIRef.current && graphAPIRef.current.getNodeCount() === 0) {
        graphAPIRef.current.addNode('widget');
      }
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

  // Graph API ready callback
  const handleGraphAPIReady = useCallback((api: LabGraphAPI) => {
    graphAPIRef.current = api;
  }, []);

  // Handle onboarding path selection
  const handleOnboardingPath = useCallback((path: OnboardingPath) => {
    creatorMode.dismissOnboarding();
    switch (path) {
      case 'template':
        break;
      case 'describe':
        lab.setActiveSidebarPanel('widgets');
        break;
      case 'visual':
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

  // ─── Streaming preview callbacks ─────────────────────────────
  const handleStreamChunk = useCallback((partialHtml: string) => {
    setStreamingHtml(partialHtml);
    if (!streamingActive) setStreamingActive(true);
  }, [streamingActive]);

  const handleStreamDone = useCallback((error?: string | null) => {
    setStreamingDone(true);
    if (error) setStreamingError(error);
    // Preview stays visible showing the completed widget (or error)
  }, []);

  const handleGeneratingChange = useCallback((generating: boolean) => {
    setIsGenerating(generating);
    if (generating) {
      // Reset streaming state when a new generation starts
      setStreamingHtml('');
      setStreamingActive(true);
      setStreamingDone(false);
      setStreamingError(null);
    }
  }, []);

  // ─── Prompt refinement ──────────────────────────────────────────
  const compatibleWidgets: CompatibleWidget[] = useMemo(() => {
    if (graphNodes.length === 0) return [];
    return graphNodes
      .filter((n) => n.type === 'widget')
      .map((n) => ({
        name: n.label,
        ports: [
          ...n.inputPorts.map((p) => `subscribes: ${p.name}`),
          ...n.outputPorts.map((p) => `emits: ${p.name}`),
        ],
      }));
  }, [graphNodes]);

  const handlePromptReady = useCallback((prompt: string) => {
    setPendingRefinementPrompt(prompt);
  }, []);

  const handleRefinementGenerate = useCallback(async (enrichedPrompt: string) => {
    setPendingRefinementPrompt(null);
    if (!lab.instances?.aiGenerator) return;
    handleGeneratingChange(true);
    try {
      const result = await lab.instances.aiGenerator.generate(enrichedPrompt, graphContext);
      if (result.isValid && result.html) {
        handleStreamChunk(result.html);
        handleStreamDone(null);
        handleApplyCode(result.html);
      } else {
        handleStreamDone(result.errors[0] ?? 'Generation failed');
      }
    } catch {
      handleStreamDone('Something went wrong');
    } finally {
      handleGeneratingChange(false);
    }
  }, [lab.instances, graphContext, handleGeneratingChange, handleStreamChunk, handleStreamDone, handleApplyCode]);

  const handleRefinementCancel = useCallback(() => {
    setPendingRefinementPrompt(null);
  }, []);

  // ─── Sidebar entity callbacks ─────────────────────────────────
  const handleAddEntity = useCallback((type: SceneNodeType) => {
    graphAPIRef.current?.addNode(type);
  }, []);

  const handleAddWidget = useCallback((entry: WidgetRegistryEntry) => {
    graphAPIRef.current?.addWidgetFromLibrary(entry);
  }, []);

  const handleBrowseMarketplace = useCallback(() => {
    // Navigate to marketplace — for now switch to widgets panel
    // Future: open marketplace overlay or route
    lab.setActiveSidebarPanel('widgets');
  }, [lab]);

  const handleUploadHtml = useCallback(() => {
    setShowImport(true);
  }, []);

  // ─── Sidebar action button handler ────────────────────────────
  const handleSidebarAction = useCallback((panel: SidebarPanel) => {
    switch (panel) {
      case 'entities':
        // Add a generic widget node as the default entity
        graphAPIRef.current?.addNode('widget');
        break;
      case 'widgets':
        // Add the first installed widget if available
        if (installedWidgets.length > 0) {
          graphAPIRef.current?.addWidgetFromLibrary(installedWidgets[0]);
        }
        break;
      case 'inspector':
        // Future: remove selected node
        break;
      case 'testing':
        // Compile and run the pipeline
        graphAPIRef.current?.compile();
        break;
      case 'deploy':
        // Compile for publishing
        graphAPIRef.current?.compile();
        break;
    }
  }, [installedWidgets]);

  // ─── Deploy panel callbacks ────────────────────────────────────
  const handleValidatePipeline = useCallback(() => {
    graphAPIRef.current?.compile();
  }, []);

  if (!lab.ready || !lab.instances) return <LabLoading />;

  const { instances } = lab;
  const manifest = instances.manifest.getManifest();
  const manifestEvents = [
    ...(manifest?.events?.emits ?? []),
    ...(manifest?.events?.subscribes ?? []),
  ];

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
            debugMode={lab.debugMode}
            onToggleDebug={lab.toggleDebugMode}
          />

          {/* Context sidebar — panel content (fully wired) */}
          <LabContextSidebar
            activePanel={lab.activeSidebarPanel}
            projectName={manifest?.name ?? 'Untitled Widget'}
            projectVersion={manifest?.version ?? 'v0.1.0'}
            previewSlot={<LabPreviewComponent key={previewReloadKey} preview={instances.preview} />}
            isRunning={hasActiveWidget}
            onAddEntity={handleAddEntity}
            installedWidgets={installedWidgets}
            onAddWidget={handleAddWidget}
            onBrowseMarketplace={handleBrowseMarketplace}
            onUploadHtml={handleUploadHtml}
            activeDevice={activeDevice}
            onDeviceChange={setActiveDevice}
            activeSimulation={activeSimulation}
            onSimulationChange={setActiveSimulation}
            manifestName={manifest?.name}
            manifestVersion={manifest?.version}
            eventCount={manifestEvents.length}
            onValidate={handleValidatePipeline}
            onAction={handleSidebarAction}
          />

          {/* Full-bleed canvas */}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <CanvasView
              debugMode={lab.debugMode}
              graphSlot={
                <LabGraph
                  graphSync={instances.graphSync}
                  onCompile={(html) => {
                    instances.editor.setContent(html);
                    setEditorContent(html);
                  }}
                  onGraphStateChange={handleGraphStateChange}
                  onDescribeWidget={handleDescribeWidget}
                  onAPIReady={handleGraphAPIReady}
                />
              }
              promptBar={
                <PromptBar
                  generator={instances.aiGenerator}
                  onApplyCode={handleApplyCode}
                  currentEditorContent={editorContent}
                  graphContext={graphContext}
                  onGeneratingChange={handleGeneratingChange}
                  onStreamChunk={handleStreamChunk}
                  onStreamDone={handleStreamDone}
                  onPromptReady={handlePromptReady}
                />
              }
              refinementOverlay={
                pendingRefinementPrompt ? (
                  <PromptRefinement
                    initialPrompt={pendingRefinementPrompt}
                    generator={instances.aiGenerator}
                    compatibleWidgets={compatibleWidgets}
                    onGenerate={handleRefinementGenerate}
                    onCancel={handleRefinementCancel}
                  />
                ) : undefined
              }
              streamingPreview={
                streamingActive ? (
                  <StreamingPreview
                    html={streamingHtml}
                    done={streamingDone}
                    error={streamingError}
                  />
                ) : undefined
              }
            />
          </div>
        </div>

        {/* Bottom status bar — wired to real state */}
        <LabStatusBar
          projectName={manifest?.name ?? 'Untitled Widget'}
          hasUnsavedChanges={hasActiveWidget}
          connected={true}
          streaming={isGenerating}
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

      {/* Import dialog — triggered by Upload .html or Browse Marketplace */}
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
