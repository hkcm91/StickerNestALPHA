/**
 * EventBusPanel — Event Bus testing panel
 * Extracted from TestHarness.tsx
 *
 * @module shell/dev
 * @layer L6
 */

import React from 'react';

import type { BusEvent } from '@sn/types';

import type { BenchResult } from '../../../kernel/bus';

export interface EventBusPanelProps {
  customEventType: string;
  setCustomEventType: (v: string) => void;
  customPayload: string;
  setCustomPayload: (v: string) => void;
  emitCustomEvent: () => void;
  emitBurstEvents: (count: number) => void;
  runBenchmark: () => void;
  wildcardSub: string;
  setWildcardSub: (v: string) => void;
  addWildcardSubscription: () => void;
  activeWildcards: string[];
  benchResult: BenchResult | null;
  eventFilter: string;
  setEventFilter: (v: string) => void;
  busHistory: BusEvent[];
  clearHistory: () => void;
}

export const EventBusPanel: React.FC<EventBusPanelProps> = ({
  customEventType, setCustomEventType, customPayload, setCustomPayload,
  emitCustomEvent, emitBurstEvents, runBenchmark,
  wildcardSub, setWildcardSub, addWildcardSubscription, activeWildcards,
  benchResult, eventFilter, setEventFilter, busHistory, clearHistory,
}) => {
  const filteredHistory = eventFilter
    ? busHistory.filter((e) => e.type.includes(eventFilter))
    : busHistory;

  return (
    <section style={{ flex: '1 1 400px', border: '1px solid var(--sn-border, #374151)', padding: 10 }}>
      <h2>Event Bus</h2>

      <div style={{ marginBottom: 10 }}>
        <input
          value={customEventType}
          onChange={(e) => setCustomEventType(e.target.value)}
          placeholder="event.type"
          style={{ width: 120, marginRight: 5 }}
        />
        <input
          value={customPayload}
          onChange={(e) => setCustomPayload(e.target.value)}
          placeholder='{"key":"value"}'
          style={{ width: 150, marginRight: 5 }}
        />
        <button onClick={emitCustomEvent}>Emit</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <button onClick={() => emitBurstEvents(10)} style={{ marginRight: 5 }}>Burst 10</button>
        <button onClick={() => emitBurstEvents(100)} style={{ marginRight: 5 }}>Burst 100</button>
        <button onClick={() => emitBurstEvents(1000)} style={{ marginRight: 5 }}>Burst 1000</button>
        <button onClick={runBenchmark}>Benchmark</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          value={wildcardSub}
          onChange={(e) => setWildcardSub(e.target.value)}
          placeholder="wildcard.* pattern"
          style={{ width: 150, marginRight: 5 }}
        />
        <button onClick={addWildcardSubscription}>Add Wildcard Sub</button>
        {activeWildcards.length > 0 && (
          <div style={{ fontSize: 10, marginTop: 5 }}>Active: {activeWildcards.join(', ')}</div>
        )}
      </div>

      {benchResult && (
        <div style={{ background: 'var(--sn-surface, #1f2937)', padding: 8, marginBottom: 10, fontSize: 10 }}>
          <strong>Benchmark:</strong> Avg: {benchResult.avgLatencyUs.toFixed(2)}us |
          P99: {benchResult.p99LatencyUs.toFixed(2)}us | {benchResult.eventsPerSecond.toLocaleString()}/sec
        </div>
      )}

      <div style={{ marginBottom: 5 }}>
        <input
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          placeholder="Filter events..."
          style={{ width: 150, marginRight: 5 }}
        />
        <button onClick={clearHistory}>Clear</button>
        <span style={{ marginLeft: 10, fontSize: 10 }}>Showing: {filteredHistory.length}</span>
      </div>

      <div style={{ maxHeight: 200, overflow: 'auto', background: 'var(--sn-surface, #1f2937)', padding: 5, fontSize: 10 }}>
        {filteredHistory.length === 0 && <p>No events</p>}
        {filteredHistory.slice(-50).reverse().map((e, i) => (
          <div key={i} style={{ borderBottom: '1px solid #eee', padding: '2px 0' }}>
            <strong>{e.type}</strong>: {JSON.stringify(e.payload).slice(0, 80)}
          </div>
        ))}
      </div>
    </section>
  );
};
