/**
 * useLabState — Central state hook for the Widget Lab session.
 *
 * Initializes all Lab module instances on mount, tears them down
 * on unmount. UI state (active view, active bottom tab, etc.) is
 * local React state — ephemeral to the Lab session.
 *
 * @module lab/hooks
 * @layer L2
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { AIGenerator } from '../ai/ai-generator';
import { createAIGenerator } from '../ai/ai-generator';
import type { LabEditor } from '../editor/editor';
import { createLabEditor } from '../editor/editor';
import type { GraphSync } from '../graph/graph-sync';
import { createGraphSync } from '../graph/graph-sync';
import { initLab, teardownLab } from '../init';
import type { EventInspector } from '../inspector/inspector';
import { createEventInspector } from '../inspector/inspector';
import type { ManifestEditor } from '../manifest/manifest-editor';
import { createManifestEditor } from '../manifest/manifest-editor';
import type { PreviewManager, PreviewMode } from '../preview/preview-manager';
import { createPreviewManager } from '../preview/preview-manager';
import type { PublishPipeline } from '../publish/pipeline';
import { createPublishPipeline } from '../publish/pipeline';
import type { VersionManager } from '../versions/version-manager';
import { createVersionManager } from '../versions/version-manager';

export type LabView = 'editor' | 'graph';
export type LabBottomTab = 'manifest' | 'versions' | 'publish' | null;

export interface LabInstances {
  editor: LabEditor;
  inspector: EventInspector;
  preview: PreviewManager;
  manifest: ManifestEditor;
  versions: VersionManager;
  graphSync: GraphSync;
  aiGenerator: AIGenerator;
  publishPipeline: PublishPipeline;
}

export interface LabState {
  /** All instantiated Lab module instances */
  instances: LabInstances | null;
  /** Whether the Lab session is fully initialized */
  ready: boolean;

  // UI state
  activeView: LabView;
  activeBottomTab: LabBottomTab;
  aiExpanded: boolean;
  previewMode: PreviewMode;

  // UI state setters
  setActiveView: (view: LabView) => void;
  setActiveBottomTab: (tab: LabBottomTab) => void;
  setAiExpanded: (expanded: boolean) => void;
  toggleAiExpanded: () => void;
  setPreviewMode: (mode: PreviewMode) => void;
}

export function useLabState(): LabState {
  const instancesRef = useRef<LabInstances | null>(null);
  const [ready, setReady] = useState(false);
  const [activeView, setActiveView] = useState<LabView>('editor');
  const [activeBottomTab, setActiveBottomTab] = useState<LabBottomTab>(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('2d-isolated');

  useEffect(() => {
    // Initialize the Lab layer (bus subscriptions, etc.)
    initLab();

    // Create all module instances
    const inspector = createEventInspector();
    const editor = createLabEditor();
    const preview = createPreviewManager(inspector);
    const manifest = createManifestEditor();
    const versions = createVersionManager('draft-widget');
    const graphSync = createGraphSync(editor);
    const aiGenerator = createAIGenerator('/api/ai/generate');
    const publishPipeline = createPublishPipeline();

    // Wire editor changes to preview
    editor.onChange((content) => {
      preview.update(content);
    });

    instancesRef.current = {
      editor,
      inspector,
      preview,
      manifest,
      versions,
      graphSync,
      aiGenerator,
      publishPipeline,
    };

    setReady(true);

    return () => {
      // Tear down all instances
      editor.dispose();
      preview.destroy();
      inspector.clear();
      graphSync.destroy();
      aiGenerator.cancel();

      instancesRef.current = null;
      setReady(false);

      teardownLab();
    };
  }, []);

  const toggleAiExpanded = useCallback(() => {
    setAiExpanded((prev) => !prev);
  }, []);

  const handleSetPreviewMode = useCallback((mode: PreviewMode) => {
    setPreviewMode(mode);
    instancesRef.current?.preview.setMode(mode);
  }, []);

  return {
    instances: instancesRef.current,
    ready,
    activeView,
    activeBottomTab,
    aiExpanded,
    previewMode,
    setActiveView,
    setActiveBottomTab,
    setAiExpanded,
    toggleAiExpanded,
    setPreviewMode: handleSetPreviewMode,
  };
}
