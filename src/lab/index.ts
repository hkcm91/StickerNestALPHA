/**
 * Layer 2 — Widget Lab
 *
 * In-app IDE for creating, testing, and publishing widgets.
 * Imports from L0 (Kernel), L1 (Social), L3 (Runtime).
 *
 * @module lab
 * @layer L2
 * @see .claude/rules/L2-lab.md
 */

// Guards
export { checkLabAccess, checkDesktopViewport, MIN_DESKTOP_WIDTH } from './guards';
export type { AccessCheckResult } from './guards';

// Editor
export { createLabEditor } from './editor';
export type { LabEditor, LabEditorOptions, EditorChangeCallback } from './editor';

// Inspector
export { createEventInspector } from './inspector';
export type { EventInspector, InspectorEntry, InspectorSubscriber, EventDirection } from './inspector';

// Manifest
export { createManifestEditor } from './manifest';
export type { ManifestEditor, ManifestValidationResult, BreakingChange } from './manifest';

// Versions
export { createVersionManager } from './versions';
export type { VersionManager, VersionSnapshot } from './versions';

// Import
export { importWidget, checkLicense } from './import';
export type { WidgetListing, ImportResult, ImportError, ImportOutcome } from './import';

// Preview
export { createPreviewManager, DEFAULT_PREVIEW_THEME, PREVIEW_DEBOUNCE_MS } from './preview';
export type { PreviewManager, PreviewMode } from './preview';

// AI
export { createAIGenerator, validateWidgetHtml } from './ai';
export type { AIGenerator, AIGenerationResult } from './ai';
export { serializeFullContextForPrompt } from './ai';
export type { AIFullContext } from './ai';
export { createVoiceInput, parseVoiceCommand } from './ai';
export type { VoiceInput, VoiceCommand, VoiceIntent } from './ai';

// Design Spec
export { createDesignSpecEditor, serializeDesignSpec, parseDesignSpec } from './design-spec';
export { flattenDesignSpec, generateDesignSpecStyleBlock, injectDesignSpecIntoHtml, extractDesignSpec, generateDesignSpec } from './design-spec';
export type { DesignSpecEditor, ExtractionResult } from './design-spec';

// Prototype Mode
export { createPrototypeSession, getPrototypeClickScript } from './preview';
export type { PrototypeSession, PrototypeFrame } from './preview';

// Publish
export { validateWidget, testWidget, generateThumbnail, submitWidget, createPublishPipeline } from './publish';
export type { ValidationResult, TestResult, ThumbnailResult, SubmitPayload, SubmitResult, PublishPipeline, PipelineStatus, PipelineStep } from './publish';

// Graph
export { compileGraph, detectCycles, createGraphSync } from './graph';
export type { GraphNode, GraphEdge, NodeType, CompileResult, GraphSync } from './graph';

// Init
export { initLab, teardownLab, isLabInitialized } from './init';

// UI Components
export { LabPage } from './components/LabPage';
