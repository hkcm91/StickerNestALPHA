/**
 * SplitCanvasView — side-by-side dual canvas dev tool
 *
 * Renders two iframes, each loading a real /canvas/:slug route.
 * Canvas picker dropdowns populate from the local canvas gallery.
 * Draggable divider to resize the split.
 *
 * @module shell/dev
 * @layer L6
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { listLocalCanvases, type LocalCanvasSummary } from '../canvas/hooks';
import { themeVar } from '../theme/theme-vars';

// ── Divider Drag Hook ───────────────────────────────────────────

function useDraggableSplit(initialFraction = 0.5) {
  const [fraction, setFraction] = useState(initialFraction);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clamped = Math.max(0.15, Math.min(0.85, x / rect.width));
    setFraction(clamped);
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return { fraction, containerRef, onPointerDown, onPointerMove, onPointerUp };
}

// ── Canvas Selector ─────────────────────────────────────────────

interface CanvasSelectorProps {
  label: string;
  value: string;
  canvases: LocalCanvasSummary[];
  onChange: (slug: string) => void;
}

const CanvasSelector: React.FC<CanvasSelectorProps> = ({ label, value, canvases, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: themeVar('--sn-text-muted') }}>{label}:</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: 12,
        padding: '3px 8px',
        background: themeVar('--sn-surface'),
        color: themeVar('--sn-text'),
        border: `1px solid ${themeVar('--sn-border')}`,
        borderRadius: 4,
        cursor: 'pointer',
        maxWidth: 180,
      }}
    >
      <option value="demo">demo</option>
      {canvases.map((c) => (
        <option key={c.slug} value={c.slug}>{c.name || c.slug}</option>
      ))}
    </select>
  </div>
);

// ── Main Component ──────────────────────────────────────────────

export const SplitCanvasView: React.FC = () => {
  const [canvases, setCanvases] = useState<LocalCanvasSummary[]>([]);
  const [slugA, setSlugA] = useState('demo');
  const [slugB, setSlugB] = useState('demo');
  const { fraction, containerRef, onPointerDown, onPointerMove, onPointerUp } = useDraggableSplit();

  useEffect(() => {
    const items = listLocalCanvases();
    setCanvases(items);
    if (items.length >= 1) setSlugA(items[0].slug);
    if (items.length >= 2) setSlugB(items[1].slug);
  }, []);

  const leftPercent = `${fraction * 100}%`;
  const rightPercent = `${(1 - fraction) * 100}%`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: themeVar('--sn-bg'),
        color: themeVar('--sn-text'),
        fontFamily: themeVar('--sn-font-family'),
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderBottom: `1px solid ${themeVar('--sn-border')}`,
          background: themeVar('--sn-surface'),
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>Split Canvas View</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <CanvasSelector label="Left" value={slugA} canvases={canvases} onChange={setSlugA} />
          <CanvasSelector label="Right" value={slugB} canvases={canvases} onChange={setSlugB} />
        </div>
      </div>

      {/* Split panes */}
      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          display: 'flex',
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left pane */}
        <iframe
          key={`left-${slugA}`}
          src={`/canvas/${slugA}`}
          title={`Canvas: ${slugA}`}
          style={{
            width: leftPercent,
            height: '100%',
            border: 'none',
            flexShrink: 0,
          }}
        />

        {/* Draggable divider */}
        <div
          onPointerDown={onPointerDown}
          style={{
            width: 6,
            cursor: 'col-resize',
            background: themeVar('--sn-border'),
            flexShrink: 0,
            position: 'relative',
            zIndex: 10,
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = themeVar('--sn-accent'); }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = themeVar('--sn-border'); }}
        />

        {/* Right pane */}
        <iframe
          key={`right-${slugB}`}
          src={`/canvas/${slugB}`}
          title={`Canvas: ${slugB}`}
          style={{
            width: rightPercent,
            height: '100%',
            border: 'none',
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
};
