/**
 * WidgetFrame Component
 *
 * The sandboxed iframe host component for all third-party widgets.
 * Uses srcdoc (never src URL), memoized with useMemo,
 * never conditionally rendered (use display:none to hide).
 *
 * @module runtime
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { bus } from '../kernel/bus';
import type { WidgetPermission, EventPort } from '../kernel/schemas';
import { useWidgetStore } from '../kernel/stores/widget/widget.store';

import { handleAiCompletionMessage } from './ai-completion/ai-completion-handler';
import { createWidgetBridge } from './bridge/bridge';
import type { WidgetBridge } from './bridge/bridge';
import { handleCanvasWriteMessage } from './bridge/canvas-write-handler';
import { handleDataSourceMessage } from './bridge/datasource-handler';
import { handleEntityMessage } from './bridge/entity-handler';
import type { ThemeTokens } from './bridge/message-types';
import { getSharedCrossCanvasRouter, isValidChannelName } from './cross-canvas/cross-canvas-router';
import type { CrossCanvasRouter } from './cross-canvas/cross-canvas-router';
import { getIntegrationProxy } from './integrations/singleton';
import { WidgetErrorBoundary } from './lifecycle/error-boundary';
import { createLifecycleManager } from './lifecycle/manager';
import type { WidgetLifecycleManager } from './lifecycle/manager';
import { handleMcpMessage } from './mcp/mcp-proxy';
import { buildSrcdoc } from './sdk/sdk-builder';
import { SANDBOX_POLICY } from './security/sandbox-policy';

/** Maximum state size per instance: 1MB */
const MAX_STATE_SIZE = 1_048_576;

/** Maximum cross-canvas payload size: 64KB (matches Supabase Realtime limit) */
const MAX_CROSS_CANVAS_PAYLOAD_SIZE = 65_536;

/**
 * Checks whether a widget has the 'cross-canvas' permission.
 */
function hasCrossCanvasPermission(widgetId: string): boolean {
  const entry = useWidgetStore.getState().registry[widgetId];
  const has = entry?.manifest?.permissions?.includes('cross-canvas') ?? false;
  if (!has) {
    console.debug(`[WidgetFrame] hasCrossCanvasPermission("${widgetId}"): ${has}, registry keys: [${Object.keys(useWidgetStore.getState().registry).join(', ')}], permissions: ${JSON.stringify(entry?.manifest?.permissions)}`);
  }
  return has;
}

/** Maximum user state size per value: 10MB */
const MAX_USER_STATE_SIZE = 10_485_760;

/** Timeout before widget is considered failed to initialize: 5 seconds */
const READY_TIMEOUT_MS = 5_000;

/** Shared integration proxy — host-side registry for proxied external calls */
const integrationProxy = getIntegrationProxy();

/**
 * Props for the WidgetFrame component.
 */
export interface WidgetFrameProps {
  /** Widget type ID */
  widgetId: string;
  /** Unique instance ID (used as React key) */
  instanceId: string;
  /** Widget HTML source (loaded via srcdoc) */
  widgetHtml: string;
  /** User-configured widget settings */
  config: Record<string, unknown>;
  /** Current theme tokens */
  theme: ThemeTokens;
  /** Controls display:none — NEVER unmounts the iframe */
  visible: boolean;
  /** Container width */
  width: number;
  /** Container height */
  height: number;
  /** Optional channel namespace for event routing isolation */
  channel?: string;
  /** Optional shared cross-canvas router (for dev testing in same tab) */
  crossCanvasRouter?: CrossCanvasRouter;
}

/**
 * Computes the bus event type, optionally namespaced by channel.
 * No channel = global: `widget.counter.changed`
 * Channel "A" = isolated: `widget.A.counter.changed`
 */
function toBusEventType(channel: string | undefined, eventType: string): string {
  return channel ? `widget.${channel}.${eventType}` : `widget.${eventType}`;
}

/**
 * Inner iframe component wrapped by error boundary.
 */
const WidgetIframe: React.FC<WidgetFrameProps> = (props) => {
  const { widgetId, instanceId, widgetHtml, config, theme, visible, width, height, channel, crossCanvasRouter: externalRouter } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<WidgetBridge | null>(null);
  const lifecycleRef = useRef<WidgetLifecycleManager | null>(null);
  /** Returns external router if provided, otherwise the shared singleton */
  function getOrCreateRouter(): CrossCanvasRouter {
    if (externalRouter) return externalRouter;
    return getSharedCrossCanvasRouter();
  }
  // Track bus subscriptions per event type for cleanup
  const busSubscriptionsRef = useRef<Map<string, () => void>>(new Map());
  // Track per-instance cross-canvas unsubscribe functions (channel → unsub fn)
  const crossCanvasUnsubsRef = useRef<Map<string, () => void>>(new Map());

  // Memoize srcdoc — keyed on widgetId, widgetHtml, instanceId
  // Config and theme changes are delivered via postMessage, NOT srcdoc rebuild
  const srcdoc = useMemo(
    () => buildSrcdoc({ widgetHtml, widgetId, instanceId }),
    [widgetId, widgetHtml, instanceId],
  );

  // Initialize bridge and lifecycle on mount / srcdoc change
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const lifecycle = createLifecycleManager(instanceId);
    lifecycleRef.current = lifecycle;
    lifecycle.transition('LOADING');

    const bridge = createWidgetBridge(iframe, instanceId);
    bridgeRef.current = bridge;

    bridge.onMessage((message) => {
      switch (message.type) {
        case 'READY':
          if (lifecycle.getState() === 'LOADING') {
            lifecycle.transition('INITIALIZING');
          }
          if (lifecycle.getState() === 'INITIALIZING') {
            lifecycle.transition('READY');
            lifecycle.transition('RUNNING');
          }
          // Auto-register instance in widget store if not already present
          {
            const ws = useWidgetStore.getState();
            if (!ws.instances[instanceId]) {
              // Restore persisted state from localStorage if available
              let savedState: Record<string, unknown> = {};
              try {
                const raw = localStorage.getItem(`sn:widget-state:${instanceId}`);
                if (raw) savedState = JSON.parse(raw);
              } catch { /* ignore parse errors */ }
              ws.addInstance({
                instanceId,
                widgetId,
                canvasId: '',
                state: savedState,
                config: config ?? {},
              });
            }
          }
          // Send initial config and theme
          bridge.send({
            type: 'INIT',
            widgetId,
            instanceId,
            config,
            theme,
          });
          break;

        case 'REGISTER': {
          // Store widget manifest in registry so permissions (e.g. cross-canvas) are available
          const manifest = message.manifest as Record<string, unknown> | null;
          if (manifest) {
            const permissions = (Array.isArray(manifest.permissions) ? manifest.permissions : []) as WidgetPermission[];
            const events = (manifest.events && typeof manifest.events === 'object' ? manifest.events : { emits: [], subscribes: [] }) as { emits: EventPort[]; subscribes: EventPort[] };
            console.debug(`[WidgetFrame][${instanceId}] REGISTER: widgetId=${widgetId}, permissions=${JSON.stringify(permissions)}`);
            const ws = useWidgetStore.getState();
            if (!ws.registry[widgetId]) {
              ws.registerWidget({
                widgetId,
                manifest: {
                  id: (manifest.id as string) ?? widgetId,
                  name: (manifest.name as string) ?? widgetId,
                  version: (manifest.version as string) ?? '1.0.0',
                  license: ((manifest.license as string) ?? 'MIT') as 'MIT',
                  tags: (Array.isArray(manifest.tags) ? manifest.tags : []) as string[],
                  category: ((manifest.category as string) ?? 'other') as 'other',
                  permissions,
                  events,
                  config: { fields: [] },
                  size: { defaultWidth: 300, defaultHeight: 200, aspectLocked: false },
                  entry: 'index.html',
                  crossCanvasChannels: [],
                  spatialSupport: false,
                },
                htmlContent: '',
                isBuiltIn: true,
                installedAt: new Date().toISOString(),
              });
            } else {
              // Update manifest if already registered (permissions may have changed)
              ws.registry[widgetId].manifest = {
                ...ws.registry[widgetId].manifest,
                permissions: permissions.length > 0 ? permissions : ws.registry[widgetId].manifest.permissions,
              };
            }
            // Verify it was stored
            const stored = useWidgetStore.getState().registry[widgetId];
            console.debug(`[WidgetFrame][${instanceId}] REGISTER stored: permissions=${JSON.stringify(stored?.manifest?.permissions)}`);
          }
          break;
        }

        case 'EMIT':
          // Forward to kernel event bus
          bus.emit(toBusEventType(channel, message.eventType), message.payload);
          break;

        case 'SUBSCRIBE': {
          const eventType = message.eventType;
          const resolvedBusType = toBusEventType(channel, eventType);
          // Only subscribe if not already subscribed to this event type
          if (!busSubscriptionsRef.current.has(eventType)) {
            const unsubscribe = bus.subscribe(resolvedBusType, (busEvent: unknown) => {
              // Extract payload from BusEvent - bus delivers { type, payload, timestamp, ... }
              const payload = (busEvent as { payload: unknown }).payload;
              // Forward bus events to widget via EVENT message
              bridge.send({
                type: 'EVENT',
                event: { type: eventType, payload },
              });
            });
            busSubscriptionsRef.current.set(eventType, unsubscribe);
          }
          break;
        }

        case 'UNSUBSCRIBE': {
          const unsubscribeFn = busSubscriptionsRef.current.get(message.eventType);
          if (unsubscribeFn) {
            unsubscribeFn();
            busSubscriptionsRef.current.delete(message.eventType);
          }
          break;
        }

        case 'SET_STATE': {
          try {
            const serialized = JSON.stringify(message.value);
            if (serialized.length > MAX_STATE_SIZE) {
              const reason = `State write rejected: exceeds 1MB limit (${serialized.length} bytes)`;
              console.error(`[WidgetFrame][${instanceId}] ${reason}`);
              bridge.send({ type: 'STATE_REJECTED', key: message.key, reason });
              return;
            }
          } catch {
            const reason = 'State write rejected: value is not serializable';
            console.error(`[WidgetFrame][${instanceId}] ${reason}`);
            bridge.send({ type: 'STATE_REJECTED', key: message.key, reason });
            return;
          }

          const widgetStore = useWidgetStore.getState();
          const instance = widgetStore.instances[instanceId];
          if (instance) {
            const newState = { ...instance.state, [message.key]: message.value };
            widgetStore.updateInstanceState(instanceId, newState);
            // Persist to localStorage
            try {
              localStorage.setItem(`sn:widget-state:${instanceId}`, JSON.stringify(newState));
            } catch { /* quota exceeded — silently skip */ }
          }
          break;
        }

        case 'GET_STATE': {
          const store = useWidgetStore.getState();
          const inst = store.instances[instanceId];
          const value = inst?.state?.[message.key] ?? null;
          bridge.send({ type: 'STATE_RESPONSE', key: message.key, value });
          break;
        }

        case 'SET_USER_STATE': {
          // Enforce 10MB limit on user state value size
          try {
            const userSerialized = JSON.stringify(message.value);
            if (userSerialized.length > MAX_USER_STATE_SIZE) {
              const reason = `User state write rejected: exceeds 10MB limit (${userSerialized.length} bytes)`;
              console.error(`[WidgetFrame][${instanceId}] ${reason}`);
              bridge.send({ type: 'STATE_REJECTED', key: message.key, reason });
              return;
            }
          } catch {
            const reason = 'User state write rejected: value is not serializable';
            console.error(`[WidgetFrame][${instanceId}] ${reason}`);
            bridge.send({ type: 'STATE_REJECTED', key: message.key, reason });
            return;
          }

          // User state persistence — handled by widget store
          bus.emit('widget.userState.set', {
            instanceId,
            key: message.key,
            value: message.value,
          });
          break;
        }

        case 'GET_USER_STATE':
          bus.emit('widget.userState.get', {
            instanceId,
            key: message.key,
          });
          break;

        case 'LOG':
          console[message.level](
            `[Widget:${widgetId}:${instanceId}]`,
            message.message,
          );
          break;

        case 'RESIZE_REQUEST':
          // Widgets do not control their own container dimensions
          // Forward as a bus event for canvas layer to handle
          bus.emit('widget.resizeRequest', {
            instanceId,
            width: message.width,
            height: message.height,
          });
          break;

        case 'INTEGRATION_QUERY': {
          const queryRequestId = message.requestId;
          integrationProxy.query(message.name, message.params)
            .then((result) => {
              bridge.send({ type: 'INTEGRATION_RESPONSE', requestId: queryRequestId, result });
            })
            .catch((err: unknown) => {
              const errorMessage = err instanceof Error ? err.message : String(err);
              bridge.send({ type: 'INTEGRATION_RESPONSE', requestId: queryRequestId, result: null, error: errorMessage });
            });
          break;
        }

        case 'INTEGRATION_MUTATE': {
          const mutateRequestId = message.requestId;
          integrationProxy.mutate(message.name, message.params)
            .then((result) => {
              bridge.send({ type: 'INTEGRATION_RESPONSE', requestId: mutateRequestId, result });
            })
            .catch((err: unknown) => {
              const errorMessage = err instanceof Error ? err.message : String(err);
              bridge.send({ type: 'INTEGRATION_RESPONSE', requestId: mutateRequestId, result: null, error: errorMessage });
            });
          break;
        }

        case 'CROSS_CANVAS_EMIT': {
          if (!hasCrossCanvasPermission(widgetId)) {
            console.warn(`[WidgetFrame][${instanceId}] cross-canvas emit blocked: widget lacks 'cross-canvas' permission`);
            bus.emit('crossCanvas.error', { instanceId, channel: message.channel, reason: 'permission_denied' });
            break;
          }
          if (!isValidChannelName(message.channel)) {
            console.warn(`[WidgetFrame][${instanceId}] cross-canvas emit blocked: invalid channel name "${message.channel}"`);
            bus.emit('crossCanvas.error', { instanceId, channel: message.channel, reason: 'invalid_channel' });
            break;
          }
          try {
            const payloadSize = JSON.stringify(message.payload).length;
            if (payloadSize > MAX_CROSS_CANVAS_PAYLOAD_SIZE) {
              console.warn(`[WidgetFrame][${instanceId}] cross-canvas emit blocked: payload exceeds 64KB limit (${payloadSize} bytes)`);
              bus.emit('crossCanvas.error', { instanceId, channel: message.channel, reason: 'payload_too_large' });
              break;
            }
          } catch {
            console.warn(`[WidgetFrame][${instanceId}] cross-canvas emit blocked: payload is not serializable`);
            bus.emit('crossCanvas.error', { instanceId, channel: message.channel, reason: 'payload_not_serializable' });
            break;
          }
          getOrCreateRouter().emit(message.channel, message.payload, { widgetId, instanceId });
          bus.emit('crossCanvas.event.emitted', { instanceId, channel: message.channel, payload: message.payload });
          break;
        }

        case 'CROSS_CANVAS_SUBSCRIBE': {
          if (!hasCrossCanvasPermission(widgetId)) {
            console.warn(`[WidgetFrame][${instanceId}] cross-canvas subscribe blocked: widget lacks 'cross-canvas' permission`);
            bus.emit('crossCanvas.error', { instanceId, channel: message.channel, reason: 'permission_denied' });
            break;
          }
          if (!isValidChannelName(message.channel)) {
            console.warn(`[WidgetFrame][${instanceId}] cross-canvas subscribe blocked: invalid channel name "${message.channel}"`);
            bus.emit('crossCanvas.error', { instanceId, channel: message.channel, reason: 'invalid_channel' });
            break;
          }
          const unsub = getOrCreateRouter().subscribe(message.channel, (payload) => {
            bridge.send({ type: 'CROSS_CANVAS_EVENT', channel: message.channel, payload });
            bus.emit('crossCanvas.event.received', { instanceId, channel: message.channel, payload });
          });
          crossCanvasUnsubsRef.current.set(message.channel, unsub);
          bus.emit('crossCanvas.channel.subscribed', { instanceId, channel: message.channel });
          bus.emit('crossCanvas.widget.status', {
            instanceId, channels: [...crossCanvasUnsubsRef.current.keys()], active: true,
          });
          break;
        }

        case 'CROSS_CANVAS_UNSUBSCRIBE': {
          if (!hasCrossCanvasPermission(widgetId)) {
            console.warn(`[WidgetFrame][${instanceId}] cross-canvas unsubscribe blocked: widget lacks 'cross-canvas' permission`);
            bus.emit('crossCanvas.error', { instanceId, channel: message.channel, reason: 'permission_denied' });
            break;
          }
          if (!isValidChannelName(message.channel)) {
            console.warn(`[WidgetFrame][${instanceId}] cross-canvas unsubscribe blocked: invalid channel name "${message.channel}"`);
            bus.emit('crossCanvas.error', { instanceId, channel: message.channel, reason: 'invalid_channel' });
            break;
          }
          // Remove only THIS widget's callback — other widgets on the same channel are unaffected
          const channelUnsub = crossCanvasUnsubsRef.current.get(message.channel);
          if (channelUnsub) {
            channelUnsub();
            crossCanvasUnsubsRef.current.delete(message.channel);
          }
          bus.emit('crossCanvas.channel.unsubscribed', { instanceId, channel: message.channel });
          bus.emit('crossCanvas.widget.status', {
            instanceId,
            channels: [...crossCanvasUnsubsRef.current.keys()],
            active: crossCanvasUnsubsRef.current.size > 0,
          });
          break;
        }

        default:
          // Delegate to dedicated handlers (Canvas Write, Entity, DataSource, MCP, AI)
          if (!handleCanvasWriteMessage(message, { widgetId, instanceId, bridge })
            && !handleEntityMessage(message, { widgetId, instanceId, bridge })
            && !handleDataSourceMessage(message, { widgetId, instanceId, bridge })
            && !handleMcpMessage(message, { widgetId, instanceId, bridge })) {
            handleAiCompletionMessage(message, { widgetId, instanceId, bridge });
          }
          break;
      }
    });

    // Set up READY timeout
    const readyTimeout = setTimeout(() => {
      if (!bridge.isReady() && lifecycle.getState() !== 'ERROR') {
        try {
          lifecycle.transition('ERROR');
        } catch {
          // May already be in an incompatible state
        }
      }
    }, READY_TIMEOUT_MS);

    return () => {
      clearTimeout(readyTimeout);
      bridge.send({ type: 'DESTROY' });
      bridge.destroy();
      lifecycle.destroy();
      // Shared singleton router is NOT destroyed on widget unmount.
      // External routers are managed by the caller.
      // Clean up all bus subscriptions
      for (const unsubscribe of busSubscriptionsRef.current.values()) {
        unsubscribe();
      }
      busSubscriptionsRef.current.clear();
      // Clean up cross-canvas subscriptions (removes only this widget's callbacks)
      for (const unsub of crossCanvasUnsubsRef.current.values()) {
        unsub();
      }
      crossCanvasUnsubsRef.current.clear();
      bridgeRef.current = null;
      lifecycleRef.current = null;
    };
  }, [srcdoc, instanceId, widgetId]);

  // Forward config updates via bridge (NOT srcdoc rebuild)
  useEffect(() => {
    if (bridgeRef.current?.isReady()) {
      bridgeRef.current.send({ type: 'CONFIG_UPDATE', config });
    }
  }, [config]);

  // Forward theme updates via bridge
  useEffect(() => {
    if (bridgeRef.current?.isReady()) {
      bridgeRef.current.send({ type: 'THEME_UPDATE', theme });
    }
  }, [theme]);

  // Forward resize events via bridge
  useEffect(() => {
    if (bridgeRef.current?.isReady()) {
      bridgeRef.current.send({ type: 'RESIZE', width, height });
    }
  }, [width, height]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      sandbox={SANDBOX_POLICY}
      style={{
        display: visible ? 'block' : 'none',
        width,
        height,
        border: 'none',
      }}
      title={`Widget ${widgetId}`}
    />
  );
};

/**
 * Sandboxed iframe host component for widgets.
 * Wraps the iframe in an error boundary.
 */
export const WidgetFrame: React.FC<WidgetFrameProps> = (props) => {
  const handleReload = useCallback(() => {
    // Reload is handled by React re-mounting the inner component
    // The error boundary reset triggers a re-render
  }, []);

  const handleRemove = useCallback(() => {
    bus.emit('widget.remove', { instanceId: props.instanceId });
  }, [props.instanceId]);

  return (
    <WidgetErrorBoundary
      instanceId={props.instanceId}
      widgetName={props.widgetId}
      onReload={handleReload}
      onRemove={handleRemove}
    >
      <WidgetIframe {...props} />
    </WidgetErrorBoundary>
  );
};
