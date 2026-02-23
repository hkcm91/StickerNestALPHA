/**
 * ImageGenerationPanel — End-to-end image generation → sticker placement test
 *
 * Hosts an image generator widget via WidgetFrame, tracks generation history,
 * and renders placed stickers on a mini canvas.
 *
 * @module shell/dev
 * @layer L6
 */

import React, { useState, useEffect, useCallback } from 'react';

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { WidgetFrame } from '../../../runtime';
import { DEFAULT_WIDGET_THEME, getWidgetHtml } from '../widget-templates';

// ============================================================================
// Types
// ============================================================================

interface GenerationRecord {
  id: string;
  prompt: string;
  model: string;
  imageUrl: string;
  duration: number;
  timestamp: number;
  placed: boolean;
}

interface StickerPlacement {
  id: string;
  imageUrl: string;
  prompt: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GenWidget {
  id: string;
  type: string;
}

// ============================================================================
// Constants
// ============================================================================

const QUICK_PROMPTS = [
  'A sunset over mountains',
  'A cat in outer space',
  'Abstract geometric art',
  'Pixel art treasure chest',
  'Watercolor forest scene',
];

const MINI_CANVAS_W = 400;
const MINI_CANVAS_H = 300;

// ============================================================================
// Component
// ============================================================================

export const ImageGenerationPanel: React.FC = () => {
  const [channel, setChannel] = useState('imagegen-1');
  const [mockMode, setMockMode] = useState(true);
  const [widgets, setWidgets] = useState<GenWidget[]>([]);
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [stickerEntities, setStickerEntities] = useState<StickerPlacement[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<{ state: 'idle' | 'generating' | 'done' | 'failed'; message?: string }>({ state: 'idle' });

  // --- Widget management ---
  const addGenerator = useCallback(() => {
    const id = `image-gen-${Date.now()}`;
    setWidgets((prev) => [...prev, { id, type: 'image-generator' }]);
  }, []);

  const removeGenerator = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // --- Bus subscriptions ---
  useEffect(() => {
    const prefix = channel ? `widget.${channel}.` : 'widget.';
    const unsubs = [
      bus.subscribe(`${prefix}image.generation.started`, (payload: unknown) => {
        const p = payload as { prompt?: string };
        setGenStatus({ state: 'generating', message: p?.prompt ?? 'Generating...' });
      }),
      bus.subscribe(`${prefix}image.generation.completed`, (payload: unknown) => {
        const p = payload as { imageUrl: string; prompt: string; model: string; duration: number };
        setGenStatus({ state: 'done', message: `Done: "${p.prompt}" in ${(p.duration / 1000).toFixed(1)}s` });
        setGenerations((prev) => [
          ...prev,
          {
            id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            prompt: p.prompt,
            model: p.model,
            imageUrl: p.imageUrl,
            duration: p.duration,
            timestamp: Date.now(),
            placed: false,
          },
        ]);
      }),
      bus.subscribe(`${prefix}image.generation.failed`, (payload: unknown) => {
        const p = payload as { error?: string };
        setGenStatus({ state: 'failed', message: p?.error ?? 'Generation failed' });
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [channel]);

  // --- Quick prompt ---
  const sendQuickPrompt = useCallback(
    (prompt: string) => {
      const prefix = channel ? `widget.${channel}.` : 'widget.';
      bus.emit(`${prefix}image.command.generate`, { prompt });
    },
    [channel],
  );

  // --- Place on canvas ---
  const placeOnCanvas = useCallback(
    (gen: GenerationRecord) => {
      const placement: StickerPlacement = {
        id: `sticker-${Date.now()}`,
        imageUrl: gen.imageUrl,
        prompt: gen.prompt,
        x: 20 + Math.random() * (MINI_CANVAS_W - 120),
        y: 20 + Math.random() * (MINI_CANVAS_H - 120),
        width: 80,
        height: 80,
      };
      setStickerEntities((prev) => [...prev, placement]);
      setGenerations((prev) => prev.map((g) => (g.id === gen.id ? { ...g, placed: true } : g)));
      bus.emit(CanvasEvents.ENTITY_CREATED, {
        entity: {
          id: placement.id,
          type: 'sticker',
          assetUrl: gen.imageUrl,
          assetType: 'image',
          position: { x: placement.x, y: placement.y },
        },
        source: 'image-generation',
      });
    },
    [],
  );

  const removeSticker = useCallback((id: string) => {
    setStickerEntities((prev) => prev.filter((s) => s.id !== id));
    if (selectedSticker === id) setSelectedSticker(null);
  }, [selectedSticker]);

  // --- Status color ---
  const statusColor =
    genStatus.state === 'generating' ? '#f39c12' :
    genStatus.state === 'done' ? '#2ecc71' :
    genStatus.state === 'failed' ? '#e74c3c' : '#666';

  return (
    <section style={{ flex: '1 1 500px', border: '1px solid var(--sn-border, #374151)', padding: 10 }}>
      <h2>Image Generation &rarr; Sticker Placement</h2>

      {/* Controls */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 10 }}>Channel:</label>
        <input
          type="text"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          style={{ width: 90, fontSize: 10, padding: '2px 4px', background: '#444', color: '#fff', border: '1px solid #555' }}
        />
        <label style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
          <input type="checkbox" checked={mockMode} onChange={(e) => setMockMode(e.target.checked)} />
          Mock
        </label>
        <button onClick={addGenerator} style={btnStyle}>+ Generator</button>
        <button onClick={() => setWidgets([])} style={btnStyle}>Clear Widgets</button>
        <button onClick={() => { setGenerations([]); setStickerEntities([]); setSelectedSticker(null); }} style={btnStyle}>Clear All</button>
      </div>

      {/* Quick prompts */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: '#888', lineHeight: '22px' }}>Quick:</span>
        {QUICK_PROMPTS.map((p) => (
          <button key={p} onClick={() => sendQuickPrompt(p)} style={{ ...btnStyle, fontSize: 9, padding: '2px 6px' }}>
            {p}
          </button>
        ))}
      </div>

      {/* Status */}
      <div style={{ fontSize: 10, color: statusColor, marginBottom: 8, minHeight: 14 }}>
        {genStatus.state !== 'idle' && `[${genStatus.state.toUpperCase()}] ${genStatus.message ?? ''}`}
      </div>

      {/* Widget frames */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {widgets.map((w) => (
          <div key={w.id} style={{ border: '1px solid #555', borderRadius: 4 }}>
            <div style={{ background: '#333', padding: '2px 6px', fontSize: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Generator</span>
              <button onClick={() => removeGenerator(w.id)} style={{ fontSize: 10, padding: '0 4px', background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}>x</button>
            </div>
            <div style={{ width: 340, height: 220 }}>
              <WidgetFrame
                widgetId="image-generator"
                instanceId={w.id}
                widgetHtml={getWidgetHtml('image-generator')}
                config={{ mockMode }}
                theme={DEFAULT_WIDGET_THEME}
                visible={true}
                width={340}
                height={220}
                channel={channel || undefined}
              />
            </div>
          </div>
        ))}
        {widgets.length === 0 && (
          <p style={{ color: '#666', fontSize: 10, margin: 0 }}>
            Click &quot;+ Generator&quot; to add an image generation widget.
          </p>
        )}
      </div>

      {/* Two-column: History + Mini Canvas */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/* Generation history */}
        <div style={{ flex: '1 1 200px', minWidth: 200 }}>
          <h3 style={{ fontSize: 12, margin: '0 0 6px' }}>History ({generations.length})</h3>
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #333', borderRadius: 4 }}>
            {generations.length === 0 && <p style={{ color: '#555', fontSize: 10, padding: 8, margin: 0 }}>No generations yet</p>}
            {generations.map((gen) => (
              <div key={gen.id} style={{ display: 'flex', gap: 6, padding: 6, borderBottom: '1px solid #2a2a2a', alignItems: 'center' }}>
                <img
                  src={gen.imageUrl}
                  alt={gen.prompt}
                  style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 3, border: '1px solid #444', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={gen.prompt}>
                    {gen.prompt}
                  </div>
                  <div style={{ fontSize: 9, color: '#666' }}>
                    {gen.model.split('/').pop()} &middot; {(gen.duration / 1000).toFixed(1)}s
                  </div>
                </div>
                <button
                  onClick={() => placeOnCanvas(gen)}
                  disabled={gen.placed}
                  style={{ ...btnStyle, fontSize: 9, padding: '2px 6px', opacity: gen.placed ? 0.4 : 1 }}
                >
                  {gen.placed ? 'Placed' : 'Place'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Mini canvas */}
        <div style={{ flex: '0 0 auto' }}>
          <h3 style={{ fontSize: 12, margin: '0 0 6px' }}>
            Mini Canvas ({stickerEntities.length} stickers)
            {selectedSticker && (
              <button onClick={() => removeSticker(selectedSticker)} style={{ ...btnStyle, fontSize: 9, marginLeft: 8, padding: '1px 6px' }}>
                Remove Selected
              </button>
            )}
          </h3>
          <div
            style={{
              width: MINI_CANVAS_W,
              height: MINI_CANVAS_H,
              background: '#0d0d1a',
              border: '1px solid #333',
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={() => setSelectedSticker(null)}
          >
            {/* Grid lines */}
            <svg width={MINI_CANVAS_W} height={MINI_CANVAS_H} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', opacity: 0.15 }}>
              {Array.from({ length: Math.floor(MINI_CANVAS_W / 40) }, (_, i) => (
                <line key={`v${i}`} x1={(i + 1) * 40} y1={0} x2={(i + 1) * 40} y2={MINI_CANVAS_H} stroke="#666" strokeWidth={0.5} />
              ))}
              {Array.from({ length: Math.floor(MINI_CANVAS_H / 40) }, (_, i) => (
                <line key={`h${i}`} x1={0} y1={(i + 1) * 40} x2={MINI_CANVAS_W} y2={(i + 1) * 40} stroke="#666" strokeWidth={0.5} />
              ))}
            </svg>
            {stickerEntities.length === 0 && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#333', fontSize: 10 }}>
                Generate images and place them here
              </div>
            )}
            {stickerEntities.map((s) => (
              <div
                key={s.id}
                onClick={(e) => { e.stopPropagation(); setSelectedSticker(s.id); }}
                title={s.prompt}
                style={{
                  position: 'absolute',
                  left: s.x,
                  top: s.y,
                  width: s.width,
                  height: s.height,
                  border: selectedSticker === s.id ? '2px solid #0066cc' : '1px solid #444',
                  borderRadius: 4,
                  cursor: 'pointer',
                  boxShadow: selectedSticker === s.id ? '0 0 8px rgba(0,102,204,0.5)' : 'none',
                  transition: 'border 0.15s, box-shadow 0.15s',
                }}
              >
                <img
                  src={s.imageUrl}
                  alt={s.prompt}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 3, display: 'block' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// Shared button style
// ============================================================================

const btnStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '3px 8px',
  background: '#333',
  color: '#ccc',
  border: '1px solid #555',
  borderRadius: 3,
  cursor: 'pointer',
};
