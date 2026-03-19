/**
 * CrossCanvasPanel — dual-pane cross-canvas event testing
 *
 * Renders two side-by-side "canvas" panes, each hosting WidgetFrame instances
 * that use the cross-canvas event system. Uses a local in-memory loopback
 * router so cross-canvas works without Supabase Realtime in dev.
 *
 * @module shell/dev
 * @layer L6
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

import type { BusEvent } from '@sn/types';
import { WidgetManifestSchema } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useWidgetStore } from '../../../kernel/stores/widget/widget.store';
import { WidgetFrame } from '../../../runtime';
import type { CrossCanvasRouter } from '../../../runtime/cross-canvas';
import { DEFAULT_WIDGET_THEME, getWidgetHtml } from '../widget-templates';

// ── Types ───────────────────────────────────────────────────────

interface PaneWidget {
  id: string;
  type: 'xc-sender' | 'xc-receiver';
}

// ── Local Loopback Router ───────────────────────────────────────

/**
 * In-memory cross-canvas router for dev testing.
 * Emitting on a channel immediately invokes all subscribers — no Supabase needed.
 */
function createLoopbackRouter(): CrossCanvasRouter {
  const channels = new Map<string, Set<(payload: unknown) => void>>();

  return {
    subscribe(channel: string, callback: (payload: unknown) => void): () => void {
      let cbs = channels.get(channel);
      if (!cbs) {
        cbs = new Set();
        channels.set(channel, cbs);
      }
      cbs.add(callback);
      return () => {
        cbs!.delete(callback);
        if (cbs!.size === 0) channels.delete(channel);
      };
    },
    unsubscribe(channel: string) {
      channels.delete(channel);
    },
    emit(channel: string, payload: unknown) {
      const cbs = channels.get(channel);
      if (cbs) {
        for (const cb of cbs) {
          try { cb(payload); } catch (e) { console.error('[LoopbackRouter] Handler error:', e); }
        }
      }
    },
    destroy() {
      channels.clear();
    },
    getQueueLength() {
      return 0;
    },
  };
}

// ── Widget Registration ─────────────────────────────────────────

const XC_WIDGET_IDS = ['cross-canvas-sender', 'cross-canvas-receiver'] as const;

function registerCrossCanvasWidgets() {
  const store = useWidgetStore.getState();
  for (const widgetId of XC_WIDGET_IDS) {
    if (!store.registry[widgetId]) {
      store.registerWidget({
        widgetId,
        manifest: WidgetManifestSchema.parse({
          id: widgetId,
          name: widgetId === 'cross-canvas-sender' ? 'XC Sender' : 'XC Receiver',
          version: '1.0.0',
          permissions: ['cross-canvas'],
        }),
        htmlContent: '',
        isBuiltIn: true,
        installedAt: new Date().toISOString(),
      });
    }
  }
}

function unregisterCrossCanvasWidgets() {
  const store = useWidgetStore.getState();
  for (const widgetId of XC_WIDGET_IDS) {
    if (store.registry[widgetId]) {
      store.unregisterWidget(widgetId);
    }
  }
}

// ── Sub-components ──────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  flex: '1 1 300px',
  border: '1px solid var(--sn-border, #374151)',
  padding: 8,
  minWidth: 0,
};

const btnStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '2px 8px',
  marginRight: 4,
  cursor: 'pointer',
};

interface CanvasPaneProps {
  label: string;
  widgets: PaneWidget[];
  channel: string;
  router: CrossCanvasRouter;
  onAdd: (type: 'xc-sender' | 'xc-receiver') => void;
  onRemove: (id: string) => void;
}

const CanvasPane: React.FC<CanvasPaneProps> = ({ label, widgets, channel, router, onAdd, onRemove }) => (
  <div style={sectionStyle}>
    <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 6, color: 'var(--sn-text-muted, #9ca3af)' }}>{label}</div>
    <div style={{ marginBottom: 6 }}>
      <button style={btnStyle} onClick={() => onAdd('xc-sender')}>+ Sender</button>
      <button style={btnStyle} onClick={() => onAdd('xc-receiver')}>+ Receiver</button>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {widgets.map((w) => (
        <div key={w.id} style={{ border: '1px solid var(--sn-border, #374151)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            background: 'var(--sn-surface, #1f2937)',
            padding: '2px 6px',
            fontSize: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: w.type === 'xc-sender' ? 'var(--sn-accent, #6366f1)' : '#22c55e' }}>
              {w.type === 'xc-sender' ? 'Sender' : 'Receiver'}
            </span>
            <button onClick={() => onRemove(w.id)} style={{ fontSize: 10, padding: '0 4px', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--sn-text-muted, #9ca3af)' }}>x</button>
          </div>
          <div style={{ width: 220, height: 130 }}>
            <WidgetFrame
              widgetId={w.type === 'xc-sender' ? 'cross-canvas-sender' : 'cross-canvas-receiver'}
              instanceId={w.id}
              widgetHtml={getWidgetHtml(w.type)}
              config={{ channel }}
              theme={DEFAULT_WIDGET_THEME}
              visible={true}
              width={220}
              height={130}
              crossCanvasRouter={router}
            />
          </div>
        </div>
      ))}
      {widgets.length === 0 && (
        <span style={{ fontSize: 10, color: 'var(--sn-text-muted, #6b7280)' }}>No widgets — add one above</span>
      )}
    </div>
  </div>
);

// ── Main Panel ──────────────────────────────────────────────────

export const CrossCanvasPanel: React.FC = () => {
  const [channel, setChannel] = useState('dev-test');
  const [paneA, setPaneA] = useState<PaneWidget[]>([]);
  const [paneB, setPaneB] = useState<PaneWidget[]>([]);
  const [eventLog, setEventLog] = useState<BusEvent[]>([]);
  const idRef = useRef(0);

  // Single shared loopback router — all widgets in both panes use this
  const router = useMemo(() => createLoopbackRouter(), []);

  // Register cross-canvas widgets on mount
  useEffect(() => {
    registerCrossCanvasWidgets();
    return () => {
      unregisterCrossCanvasWidgets();
      router.destroy();
    };
  }, [router]);

  // Subscribe to crossCanvas.* bus events
  useEffect(() => {
    const unsub = bus.subscribeAll((event) => {
      if (event.type.startsWith('crossCanvas.')) {
        setEventLog((prev) => [event, ...prev.slice(0, 49)]);
      }
    });
    return unsub;
  }, []);

  const addWidget = (pane: 'A' | 'B', type: 'xc-sender' | 'xc-receiver') => {
    const widget: PaneWidget = { id: `xc-${pane}-${++idRef.current}`, type };
    if (pane === 'A') setPaneA((prev) => [...prev, widget]);
    else setPaneB((prev) => [...prev, widget]);
  };

  const removeWidget = (pane: 'A' | 'B', id: string) => {
    if (pane === 'A') setPaneA((prev) => prev.filter((w) => w.id !== id));
    else setPaneB((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <section style={{ flex: '1 1 100%', border: '1px solid var(--sn-border, #374151)', padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 14 }}>Cross-Canvas Events</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 10, color: 'var(--sn-text-muted, #9ca3af)' }}>Channel:</label>
          <input
            type="text"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            style={{
              width: 100,
              fontSize: 10,
              padding: '2px 6px',
              background: 'var(--sn-surface, #1f2937)',
              color: 'var(--sn-text, #e5e7eb)',
              border: '1px solid var(--sn-border, #374151)',
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      {/* Dual canvas panes */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <CanvasPane
          label="Canvas A"
          widgets={paneA}
          channel={channel}
          router={router}
          onAdd={(type) => addWidget('A', type)}
          onRemove={(id) => removeWidget('A', id)}
        />
        <CanvasPane
          label="Canvas B"
          widgets={paneB}
          channel={channel}
          router={router}
          onAdd={(type) => addWidget('B', type)}
          onRemove={(id) => removeWidget('B', id)}
        />
      </div>

      {/* Event log */}
      <div style={{ border: '1px solid var(--sn-border, #374151)', padding: 6, maxHeight: 120, overflowY: 'auto', fontSize: 10, fontFamily: 'monospace' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontWeight: 600, color: 'var(--sn-text-muted, #9ca3af)' }}>Event Log ({eventLog.length})</span>
          <button onClick={() => setEventLog([])} style={{ fontSize: 9, padding: '1px 6px', cursor: 'pointer' }}>Clear</button>
        </div>
        {eventLog.map((evt, i) => (
          <div key={i} style={{ color: evt.type.includes('error') ? '#ef4444' : 'var(--sn-text-muted, #9ca3af)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {evt.type} {JSON.stringify(evt.payload)}
          </div>
        ))}
        {eventLog.length === 0 && (
          <span style={{ color: 'var(--sn-text-muted, #6b7280)' }}>No cross-canvas events yet</span>
        )}
      </div>
    </section>
  );
};
