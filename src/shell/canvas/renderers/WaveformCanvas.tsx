/**
 * WaveformCanvas — real-time audio waveform visualization
 *
 * @module shell/canvas/renderers/WaveformCanvas
 * @layer L6
 *
 * @remarks
 * Draws real-time waveform data from an AnalyserNode onto an HTML canvas.
 * Uses requestAnimationFrame for 60fps drawing without React re-renders.
 * Falls back to a sine-based placeholder when no audio data is available.
 */

import React, { useRef, useEffect, useCallback } from 'react';

interface WaveformCanvasProps {
  /** Function that returns waveform data (Float32Array) or null */
  getWaveformData: () => Float32Array | null;
  /** Number of bars to render */
  barCount?: number;
  /** Bar color */
  barColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Width of each bar in pixels */
  barWidth?: number;
  /** Gap between bars in pixels */
  barGap?: number;
  /** Canvas width in CSS pixels */
  width: number;
  /** Canvas height in CSS pixels */
  height: number;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  getWaveformData,
  barCount = 32,
  barColor = 'var(--sn-accent, #3b82f6)',
  backgroundColor = 'transparent',
  barWidth = 3,
  barGap = 1,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const resolvedBarColor = useRef(barColor);

  // Resolve CSS variable for canvas drawing
  useEffect(() => {
    if (barColor.startsWith('var(')) {
      // Extract fallback from var(--name, fallback)
      const match = barColor.match(/var\([^,]+,\s*([^)]+)\)/);
      resolvedBarColor.current = match ? match[1].trim() : '#3b82f6';
    } else {
      resolvedBarColor.current = barColor;
    }
  }, [barColor]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const data = getWaveformData();

    ctx.fillStyle = resolvedBarColor.current;

    if (data && data.length > 0) {
      // Real waveform data from AnalyserNode
      const samplesPerBar = Math.floor(data.length / barCount);
      const totalBarWidth = barWidth + barGap;
      const startX = (w - totalBarWidth * barCount) / 2;

      for (let i = 0; i < barCount; i++) {
        // Average samples for this bar
        let sum = 0;
        const start = i * samplesPerBar;
        for (let j = start; j < start + samplesPerBar && j < data.length; j++) {
          sum += Math.abs(data[j]);
        }
        const avg = sum / samplesPerBar;

        // Scale to bar height (0-1 range for time domain data)
        const barHeight = Math.max(2, avg * h * 1.5);
        const x = (startX + i * totalBarWidth) * dpr;
        const y = ((h - barHeight) / 2) * dpr;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth * dpr, barHeight * dpr, 1 * dpr);
        ctx.fill();
      }
    } else {
      // Fallback: sine-based placeholder
      const totalBarWidth = barWidth + barGap;
      const startX = (w - totalBarWidth * barCount) / 2;

      for (let i = 0; i < barCount; i++) {
        const barHeight = h * (0.2 + Math.abs(Math.sin(i * 0.7)) * 0.6);
        const x = (startX + i * totalBarWidth) * dpr;
        const y = ((h - barHeight) / 2) * dpr;

        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth * dpr, barHeight * dpr, 1 * dpr);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [getWaveformData, barCount, barWidth, barGap, backgroundColor, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas resolution for HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [draw, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
    />
  );
};
