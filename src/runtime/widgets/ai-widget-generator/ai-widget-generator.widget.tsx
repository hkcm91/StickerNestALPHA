/**
 * AI Widget Generator Widget
 *
 * A canvas-placeable widget that generates other widgets from natural
 * language prompts. Uses the unified WidgetGenerator from runtime/ai —
 * the exact same generation engine that powers the Widget Lab IDE.
 *
 * Features:
 * - Multi-model selector (Claude, Kimi, Llama, Qwen)
 * - Streaming generation with live HTML preview
 * - Transparent background toggle
 * - Ecosystem-aware (shows widget count, can wire to neighbors)
 * - Auto-manifest generation on successful output
 * - Generated widgets can be placed directly on the canvas
 *
 * @module runtime/widgets/ai-widget-generator
 * @layer L4A-2
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

import type { WidgetManifest } from '@sn/types';

import { useEmit, useSubscribe, useWidgetState } from '../../hooks';
import {
  createWidgetGenerator,
  AI_MODELS,
  saveModelId,
  type WidgetGenerator,
  type GenerationResult,
} from '../../ai';

// ═══════════════════════════════════════════════════════════════════
// Manifest
// ═══════════════════════════════════════════════════════════════════

export const aiWidgetGeneratorManifest: WidgetManifest = {
  id: 'sn.builtin.ai-widget-generator',
  name: 'AI Widget Generator',
  version: '1.0.0',
  description: 'Generate new widgets from natural language descriptions',
  author: { name: 'StickerNest', url: 'https://stickernest.com' },
  category: 'utilities',
  tags: ['ai', 'generator', 'widget', 'creation'],
  permissions: ['ai'],
  size: {
    defaultWidth: 400,
    defaultHeight: 360,
    minWidth: 340,
    minHeight: 300,
    aspectLocked: false,
  },
  license: 'MIT',
  config: { fields: [] },
  spatialSupport: false,
  entry: 'inline',
  crossCanvasChannels: [],
  events: {
    emits: [
      { name: 'widget.ai-widget-generator.ready' },
      { name: 'widget.ai-widget-generator.generation.started' },
      { name: 'widget.ai-widget-generator.generation.completed' },
      { name: 'widget.ai-widget-generator.generation.failed' },
      { name: 'widget.ai-widget-generator.widget.created' },
    ],
    subscribes: [
      { name: 'canvas.entity.count' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export const AIWidgetGeneratorWidget: React.FC<{ instanceId: string }> = ({
  instanceId,
}) => {
  const emit = useEmit();
  const [state, persistState] = useWidgetState(instanceId);

  // Generator instance (stable across renders)
  const generatorRef = useRef<WidgetGenerator | null>(null);
  if (!generatorRef.current) {
    generatorRef.current = createWidgetGenerator();
  }
  const generator = generatorRef.current;

  // State
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamHtml, setStreamHtml] = useState('');
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(
    state.lastModelId || generator.getModel().id,
  );
  const [transparentBg, setTransparentBg] = useState(
    state.transparentBg ?? false,
  );
  const [widgetCount, setWidgetCount] = useState(state.widgetCount ?? 0);

  const previewRef = useRef<HTMLDivElement>(null);

  // Listen for ecosystem widget count updates
  useSubscribe(
    'canvas.entity.count',
    useCallback((payload: unknown) => {
      const p = payload as { count?: number };
      if (typeof p?.count === 'number') {
        setWidgetCount(p.count);
        persistState('widgetCount', p.count);
      }
    }, [persistState]),
  );

  // Signal ready
  useEffect(() => {
    emit('widget.ai-widget-generator.ready', { instanceId });
  }, [emit, instanceId]);

  // Model change handler
  const handleModelChange = useCallback(
    (modelId: string) => {
      setSelectedModelId(modelId);
      generator.setModel(modelId);
      saveModelId(modelId);
      persistState('lastModelId', modelId);
    },
    [generator, persistState],
  );

  // Generate handler
  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setStreamHtml('');
    setLastResult(null);

    emit('widget.ai-widget-generator.generation.started', {
      prompt: trimmed,
      model: selectedModelId,
    });

    try {
      const result = await generator.generateStream(
        trimmed,
        (partialHtml) => setStreamHtml(partialHtml),
        {
          toggles: { transparentBackground: transparentBg },
          canvas: { widgetCount, nearbyWidgets: [] },
        },
      );

      setLastResult(result);

      if (result.isValid) {
        emit('widget.ai-widget-generator.generation.completed', {
          prompt: trimmed,
          manifestName: result.manifest?.manifest.name,
        });
      } else {
        setError(result.errors.join(', '));
        emit('widget.ai-widget-generator.generation.failed', {
          prompt: trimmed,
          errors: result.errors,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      emit('widget.ai-widget-generator.generation.failed', {
        prompt: trimmed,
        errors: [msg],
      });
    } finally {
      setIsGenerating(false);
    }
  }, [
    prompt,
    isGenerating,
    generator,
    transparentBg,
    widgetCount,
    selectedModelId,
    emit,
  ]);

  // Stop handler
  const handleStop = useCallback(() => {
    generator.cancel();
    setIsGenerating(false);
  }, [generator]);

  // Clear handler
  const handleClear = useCallback(() => {
    setStreamHtml('');
    setLastResult(null);
    setError(null);
    setPrompt('');
  }, []);

  // Place widget on canvas
  const handlePlace = useCallback(() => {
    if (!lastResult?.isValid || !lastResult.html) return;

    emit('widget.ai-widget-generator.widget.created', {
      html: lastResult.html,
      manifest: lastResult.manifest?.manifest,
      generatedBy: instanceId,
      prompt,
    });
  }, [lastResult, emit, instanceId, prompt]);

  // Enter key to submit
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate],
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>AI Widget Generator</span>
          <span style={styles.subtitle}>
            {widgetCount} widgets in ecosystem
          </span>
        </div>
        <div style={styles.headerRight}>
          <select
            value={selectedModelId}
            onChange={(e) => handleModelChange(e.target.value)}
            style={styles.modelSelect}
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {(streamHtml || lastResult) && (
            <button onClick={handleClear} style={styles.clearBtn}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Active prompt (shown during/after generation) */}
      {(isGenerating || lastResult) && prompt && (
        <div style={styles.activePrompt}>{prompt}</div>
      )}

      {/* Generation status */}
      {isGenerating && <div style={styles.status}>Generating...</div>}

      {/* Preview area */}
      {(streamHtml || lastResult?.html) && (
        <div ref={previewRef} style={styles.previewArea}>
          <iframe
            srcDoc={lastResult?.html || streamHtml}
            style={styles.previewIframe}
            sandbox="allow-scripts"
            title="Widget Preview"
          />
        </div>
      )}

      {/* Error */}
      {error && <div style={styles.error}>{error}</div>}

      {/* Place button (shown after successful generation) */}
      {lastResult?.isValid && (
        <button onClick={handlePlace} style={styles.placeBtn}>
          Place on Canvas
        </button>
      )}

      {/* Controls */}
      <div style={styles.controls}>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={transparentBg}
            onChange={(e) => {
              setTransparentBg(e.target.checked);
              persistState('transparentBg', e.target.checked);
            }}
          />
          <span>Transparent background</span>
        </label>
      </div>

      {/* Input area */}
      <div style={styles.inputArea}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a widget to generate..."
          style={styles.input}
          disabled={isGenerating}
        />
        <button
          onClick={isGenerating ? handleStop : handleGenerate}
          disabled={!isGenerating && !prompt.trim()}
          style={{
            ...styles.actionBtn,
            ...(isGenerating ? styles.stopBtn : {}),
            opacity: !isGenerating && !prompt.trim() ? 0.5 : 1,
          }}
        >
          {isGenerating ? 'Stop' : 'Generate'}
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--sn-bg, #ffffff)',
    color: 'var(--sn-text, #1a1a1a)',
    fontFamily: 'var(--sn-font-family, system-ui, sans-serif)',
    fontSize: 13,
    borderRadius: 'var(--sn-radius, 8px)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderBottom: '1px solid var(--sn-border, #e0e0e0)',
    background: 'var(--sn-surface, #f5f5f5)',
    gap: 8,
  },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: 1 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 6 },
  title: { fontWeight: 600, fontSize: 13 },
  subtitle: { fontSize: 11, color: 'var(--sn-text-muted, #888)' },
  modelSelect: {
    padding: '3px 6px',
    borderRadius: 4,
    border: '1px solid var(--sn-border, #ddd)',
    background: 'var(--sn-bg, #fff)',
    color: 'var(--sn-text, #333)',
    fontSize: 11,
    outline: 'none',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--sn-text-muted, #888)',
    cursor: 'pointer',
    fontSize: 11,
    padding: '2px 6px',
  },
  activePrompt: {
    padding: '6px 10px',
    background: 'var(--sn-accent, #4a90d9)',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 500,
  },
  status: {
    padding: '4px 10px',
    fontSize: 11,
    color: 'var(--sn-text-muted, #888)',
    fontStyle: 'italic',
  },
  previewArea: {
    flex: 1,
    minHeight: 100,
    overflow: 'hidden',
    borderBottom: '1px solid var(--sn-border, #e0e0e0)',
  },
  previewIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    background: 'transparent',
  },
  error: {
    padding: '6px 10px',
    background: '#fee2e2',
    color: '#991b1b',
    fontSize: 11,
  },
  placeBtn: {
    margin: '6px 10px',
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    background: '#22c55e',
    color: '#fff',
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer',
  },
  controls: { padding: '4px 10px' },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: 'var(--sn-text-muted, #666)',
    cursor: 'pointer',
  },
  inputArea: {
    display: 'flex',
    gap: 6,
    padding: '8px 10px',
    borderTop: '1px solid var(--sn-border, #e0e0e0)',
  },
  input: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--sn-border, #ddd)',
    background: 'var(--sn-bg, #fff)',
    color: 'var(--sn-text, #1a1a1a)',
    fontSize: 12,
    outline: 'none',
    fontFamily: 'inherit',
  },
  actionBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    background: 'var(--sn-accent, #4a90d9)',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 12,
  },
  stopBtn: { background: '#ef4444' },
};
