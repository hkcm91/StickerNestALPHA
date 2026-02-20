/**
 * Layer 3 -- Widget Runtime
 *
 * Sandboxed iframe execution environment for all widgets.
 * Owns WidgetFrame, Bridge Protocol, Widget SDK, and lifecycle management.
 * Every widget interacts with the platform through this layer only.
 *
 * @module runtime
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

// WidgetFrame component
export { WidgetFrame } from './WidgetFrame';
export type { WidgetFrameProps } from './WidgetFrame';

// Bridge protocol
export { createWidgetBridge } from './bridge';
export type { WidgetBridge, HostMessage, WidgetMessage, ThemeTokens } from './bridge';
export { validateWidgetMessage, validateHostMessage, createMessageQueue, MAX_QUEUE_SIZE } from './bridge';
export type { MessageQueue } from './bridge';

// Widget SDK
export { generateSDKTemplate, buildSrcdoc } from './sdk';
export type { StickerNestSDK, SrcdocBuildOptions } from './sdk';

// Lifecycle management
export { createLifecycleManager, WidgetErrorBoundary, createLazyLoader, LAZY_LOAD_MARGIN } from './lifecycle';
export type { WidgetLifecycleManager, WidgetLifecycleState, LifecycleTransition, LazyLoader } from './lifecycle';

// Security
export { DEFAULT_CSP, generateCSPMetaTag, createRateLimiter, DEFAULT_RATE_LIMIT, SANDBOX_POLICY, validateSandboxPolicy } from './security';
export type { RateLimiter } from './security';

// iframe pool
export { createIframePool, DEFAULT_POOL_MAX_SIZE, DEFAULT_WARMUP_COUNT } from './pool';
export type { IframePool } from './pool';

// Layer init
export { initRuntime, teardownRuntime, isRuntimeInitialized } from './init';
