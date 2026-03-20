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

import { CreatorLayout } from './CreatorLayout';
import { AICompanion } from './LabAI';
import { LabEditorComponent } from './LabEditor';
import { LabGraph } from './LabGraph';
import { LabImportComponent } from './LabImport';
import { LabInspectorComponent } from './LabInspector';
import { LabLayout } from './LabLayout';
import { LabManifestComponent } from './LabManifest';
import { LabPreviewComponent } from './LabPreview';
import { LabPublishComponent } from './LabPublish';
import { LabVersionsComponent } from './LabVersions';
import { OnboardingOverlay } from './OnboardingOverlay';
import type { OnboardingPath } from './OnboardingOverlay';
import { GlassPanel, GlowButton } from './shared';
import { ensureLabKeyframes } from './shared/keyframes';

// ═══════════════════════════════════════════════════════════════════
// Atmospheric Layers
// ═══════════════════════════════════════════════════════════════════

/**
 * Dual-layer grain overlay with breathing animation.
 * Matches swatches/primitives.tsx GrainOverlay exactly.
 */
const GrainOverlay: React.FC = () => (
  <div aria-hidden="true" style={{
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    animation: 'sn-grain-breathe 5s ease-in-out infinite',
  }}>
    {/* Primary grain layer */}
    <div style={{
      position: 'absolute', inset: 0,
      opacity: 0.045,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: '128px 128px',
    }} />
    {/* Secondary grain — offset, slightly different frequency for organic depth */}
    <div style={{
      position: 'absolute', inset: 0,
      opacity: 0.02,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n2'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n2)'/%3E%3C/svg%3E")`,
      backgroundSize: '192px 192px',
      transform: 'translate(2px, 2px)',
    }} />
  </div>
);

/**
 * Aurora layers — each gradient drifts independently on prime-number cycles.
 * Matches swatches/UISwatchesPanel exactly.
 */
const AuroraBackground: React.FC = () => (
  <>
    <div aria-hidden="true" style={{
      position: 'fixed', inset: '-20%', pointerEvents: 'none',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(78,123,142,0.06) 0%, transparent 55%)',
      animation: 'sn-aurora-1 23s ease-in-out infinite',
    }} />
    <div aria-hidden="true" style={{
      position: 'fixed', inset: '-20%', pointerEvents: 'none',
      background: 'radial-gradient(ellipse at 80% 30%, rgba(232,128,108,0.04) 0%, transparent 50%)',
      animation: 'sn-aurora-2 31s ease-in-out infinite',
    }} />
    <div aria-hidden="true" style={{
      position: 'fixed', inset: '-20%', pointerEvents: 'none',
      background: 'radial-gradient(ellipse at 50% 80%, rgba(184,160,216,0.04) 0%, transparent 55%)',
      animation: 'sn-aurora-3 17s ease-in-out infinite',
    }} />
    {/* Warm ember undercurrent — very subtle, grounds the cool gradients */}
    <div aria-hidden="true" style={{
      position: 'fixed', inset: '-10%', pointerEvents: 'none',
      background: 'radial-gradient(ellipse at 60% 60%, rgba(200,140,110,0.025) 0%, transparent 60%)',
      animation: 'sn-aurora-2 37s ease-in-out infinite reverse',
    }} />
  </>
);

/**
 * Cursor-following ambient light — throttled to ~30fps.
 */
const CursorLight: React.FC<{ mousePos: { x: number; y: number } }> = ({ mousePos }) => (
  <div aria-hidden="true" style={{
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    background: `radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, rgba(232,128,108,0.03) 0%, transparent 60%)`,
    transition: 'background 300ms ease-out',
  }} />
);

// ═══════════════════════════════════════════════════════════════════
// Guard Screens
// ═══════════════════════════════════════════════════════════════════

const UpgradePrompt: React.FC = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: 'var(--sn-bg)', fontFamily: 'var(--sn-font-family)',
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
    height: '100vh', padding: '24px', background: 'var(--sn-bg)', fontFamily: 'var(--sn-font-family)',
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
    height: '100vh', background: 'var(--sn-bg)', fontFamily: 'var(--sn-font-family)',
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
  const [editorContent, setEditorContent] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [graphNodes, setGraphNodes] = useState<SceneNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<SceneEdge[]>([]);
  const [pendingAIPrompt, setPendingAIPrompt] = useState<string | null>(null);

  // Creator mode state
  const hasActiveWidget = editorContent.length > 0;
  const creatorMode = useCreatorMode(hasActiveWidget);

  // Track editor content for AI companion + publish
  useEffect(() => {
    if (!lab.instances?.editor) return;
    const unsub = lab.instances.editor.onChange((content) => {
      setEditorContent(content);
    });
    return unsub;
  }, [lab.instances]);

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
        // Future: focus AI prompt bar. For now, open AI companion.
        lab.setActiveView('graph');
        break;
      case 'visual':
        lab.setActiveView('graph');
        break;
    }
  }, [creatorMode, lab]);

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
        height: '100vh', width: '100vw',
        background: 'var(--sn-bg, #0A0A0E)',
        position: 'relative', overflow: 'hidden',
        fontFamily: 'var(--sn-font-family)',
      }}
    >
      <AuroraBackground />
      <CursorLight mousePos={mousePos} />
      <GrainOverlay />

      {/* Lab layout — Creator Mode or classic IDE layout */}
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {creatorMode.isCreatorMode ? (
          <CreatorLayout
            activeView={lab.activeView}
            onViewChange={lab.setActiveView}
            activeBottomTab={lab.activeBottomTab}
            onBottomTabChange={lab.setActiveBottomTab}
            graphCollapsed={creatorMode.graphCollapsed}
            onToggleGraphCollapsed={creatorMode.toggleGraphCollapsed}
            editorSlot={
              <LabEditorComponent editor={instances.editor} />
            }
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
            previewSlot={
              <LabPreviewComponent preview={instances.preview} />
            }
            inspectorSlot={
              <LabInspectorComponent inspector={instances.inspector} />
            }
            manifestSlot={
              <LabManifestComponent manifest={instances.manifest} />
            }
            versionsSlot={
              <LabVersionsComponent
                versions={instances.versions}
                currentHtml={editorContent}
                currentManifest={instances.manifest.getManifest()}
                onRestore={(snapshot) => {
                  instances.editor.setContent(snapshot.html);
                  if (snapshot.manifest) {
                    instances.manifest.setManifest(snapshot.manifest);
                  }
                }}
              />
            }
            publishSlot={
              <LabPublishComponent
                pipeline={instances.publishPipeline}
                currentHtml={editorContent}
                currentManifest={instances.manifest.getManifest()}
              />
            }
          />
        ) : (
          <LabLayout
            activeView={lab.activeView}
            onViewChange={lab.setActiveView}
            activeBottomTab={lab.activeBottomTab}
            onBottomTabChange={lab.setActiveBottomTab}
            editorSlot={
              <LabEditorComponent editor={instances.editor} />
            }
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
            previewSlot={
              <LabPreviewComponent preview={instances.preview} />
            }
            inspectorSlot={
              <LabInspectorComponent inspector={instances.inspector} />
            }
            manifestSlot={
              <LabManifestComponent manifest={instances.manifest} />
            }
            versionsSlot={
              <LabVersionsComponent
                versions={instances.versions}
                currentHtml={editorContent}
                currentManifest={instances.manifest.getManifest()}
                onRestore={(snapshot) => {
                  instances.editor.setContent(snapshot.html);
                  if (snapshot.manifest) {
                    instances.manifest.setManifest(snapshot.manifest);
                  }
                }}
              />
            }
            publishSlot={
              <LabPublishComponent
                pipeline={instances.publishPipeline}
                currentHtml={editorContent}
                currentManifest={instances.manifest.getManifest()}
              />
            }
          />
        )}
      </div>

      {/* Onboarding overlay (Creator Mode, first-time, no active widget) */}
      <OnboardingOverlay
        visible={creatorMode.showOnboarding}
        onSelectPath={handleOnboardingPath}
        onDismiss={creatorMode.dismissOnboarding}
      />

      {/* AI Companion (floating bottom-right) */}
      <AICompanion
        generator={instances.aiGenerator}
        onApplyCode={handleApplyCode}
        currentEditorContent={editorContent}
        graphContext={graphContext}
        pendingPrompt={pendingAIPrompt}
        onPendingPromptConsumed={() => setPendingAIPrompt(null)}
      />

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
