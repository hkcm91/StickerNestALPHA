/**
 * WidgetRuntimePanel — Widget Runtime testing panel
 * Extracted from TestHarness.tsx
 *
 * @module shell/dev
 * @layer L6
 */

import React from 'react';

import { bus } from '../../../kernel/bus';
import { WidgetFrame } from '../../../runtime';
import { DEFAULT_WIDGET_THEME, getWidgetHtml } from '../widget-templates';

export interface WidgetRuntimePanelProps {
  activeWidgets: { id: string; type: string; channel: string }[];
  addWidget: (type: string) => void;
  removeWidget: (id: string) => void;
  clearWidgets: () => void;
  updateWidgetChannel: (id: string, channel: string) => void;
}

export const WidgetRuntimePanel: React.FC<WidgetRuntimePanelProps> = ({
  activeWidgets, addWidget, removeWidget, clearWidgets, updateWidgetChannel,
}) => {
  return (
    <section style={{ flex: '1 1 400px', border: '1px solid var(--sn-border, #374151)', padding: 10 }}>
      <h2>Widget Runtime</h2>

      <div style={{ marginBottom: 10 }}>
        <button onClick={() => addWidget('counter')} style={{ marginRight: 5 }}>+ Counter</button>
        <button onClick={() => addWidget('display')} style={{ marginRight: 5 }}>+ Display</button>
        <button onClick={() => addWidget('clock')} style={{ marginRight: 5 }}>+ Clock</button>
        <button onClick={clearWidgets}>Clear All</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, marginRight: 5 }}>Bus channel:</label>
        <input
          id="bus-channel"
          type="text"
          placeholder="(global)"
          style={{
            width: 60, fontSize: 10, padding: '1px 3px', marginRight: 5,
            background: '#444', color: '#fff', border: '1px solid #555',
          }}
        />
        <button
          onClick={() => {
            const ch = (document.getElementById('bus-channel') as HTMLInputElement)?.value || '';
            const prefix = ch ? `widget.${ch}.` : 'widget.';
            bus.emit(`${prefix}counter.set`, { value: 42 });
          }}
          style={{ marginRight: 5 }}
        >
          Set Counter=42
        </button>
        <button
          onClick={() => {
            const ch = (document.getElementById('bus-channel') as HTMLInputElement)?.value || '';
            const prefix = ch ? `widget.${ch}.` : 'widget.';
            bus.emit(`${prefix}display.ping`, {});
          }}
          style={{ marginRight: 5 }}
        >
          Ping Display
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {activeWidgets.map((w) => (
          <div key={w.id} style={{ border: '1px solid #999', position: 'relative' }}>
            <div style={{ background: '#333', color: '#fff', padding: '2px 5px', fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span>{w.type}</span>
              <button onClick={() => removeWidget(w.id)} style={{ fontSize: 10, padding: '0 4px' }}>×</button>
            </div>
            <div style={{ padding: '2px 5px', background: '#2a2a2a', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, color: '#888' }}>ch:</span>
              <input
                type="text"
                value={w.channel}
                onChange={(e) => updateWidgetChannel(w.id, e.target.value)}
                placeholder="(global)"
                style={{
                  width: 60, fontSize: 9, padding: '1px 3px',
                  background: '#444', color: '#fff', border: '1px solid #555',
                }}
              />
            </div>
            <div style={{ width: 180, height: 100 }}>
              <WidgetFrame
                widgetId={w.type}
                instanceId={w.id}
                widgetHtml={getWidgetHtml(w.type)}
                config={{}}
                theme={DEFAULT_WIDGET_THEME}
                visible={true}
                width={180}
                height={100}
                channel={w.channel || undefined}
              />
            </div>
          </div>
        ))}
      </div>

      {activeWidgets.length === 0 && (
        <p style={{ color: '#666', fontSize: 10 }}>Add widgets above. Counter and Display communicate via events.</p>
      )}
    </section>
  );
};
