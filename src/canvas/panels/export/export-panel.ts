/**
 * Export Panel Controller — orchestrates the video export pipeline
 *
 * @module canvas/panels/export
 * @layer L4A-4
 *
 * @remarks
 * Coordinates frame rendering, audio mixing, and video encoding
 * to produce a downloadable video file from the timeline.
 */

import { TimelineEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import type {
  ClientExportConfig,
  ExportProgress,
  FormatSpec,
} from '../../../kernel/schemas/export-config';
import { FORMAT_SPECS } from '../../../kernel/schemas/export-config';
import { useTimelineStore } from '../../../kernel/stores/timeline/timeline.store';

import type { EntitySnapshot } from './frame-renderer';
import { createFrameRenderer } from './frame-renderer';
import {
  createVideoExportEncoder,
  isWebCodecsSupported,
  downloadBlob,
  chunksToBlob,
} from './video-encoder';

// =============================================================================
// Interface
// =============================================================================

export interface ExportPanelController {
  /** Check if WebCodecs is available */
  isExportAvailable(): boolean;
  /** Get available export formats */
  getFormats(): Array<{ id: string; spec: FormatSpec }>;
  /** Start an export with the given config */
  startExport(config: ClientExportConfig): Promise<void>;
  /** Cancel a running export */
  cancelExport(): void;
  /** Get current export progress */
  getProgress(): ExportProgress | null;
}

// =============================================================================
// Implementation
// =============================================================================

export function createExportPanelController(): ExportPanelController {
  let currentProgress: ExportProgress | null = null;
  let cancelled = false;

  function setProgress(progress: ExportProgress): void {
    currentProgress = progress;
    bus.emit(TimelineEvents.RENDER_PROGRESS, {
      phase: progress.phase,
      percent: progress.percent,
      currentFrame: progress.currentFrame,
      totalFrames: progress.totalFrames,
    });
  }

  return {
    isExportAvailable(): boolean {
      return isWebCodecsSupported();
    },

    getFormats(): Array<{ id: string; spec: FormatSpec }> {
      return Object.entries(FORMAT_SPECS).map(([id, spec]) => ({ id, spec }));
    },

    async startExport(config: ClientExportConfig): Promise<void> {
      cancelled = false;
      const store = useTimelineStore.getState();
      const spec = FORMAT_SPECS[config.format];
      if (!spec) {
        setProgress({ phase: 'failed', currentFrame: 0, totalFrames: 0, percent: 0, estimatedTimeRemaining: null, error: `Unknown format: ${config.format}` });
        return;
      }

      const width = config.width ?? spec.width;
      const height = config.height ?? spec.height;
      const fps = store.composition.fps;
      const duration = store.composition.duration;
      const totalFrames = Math.ceil(duration * fps);
      const startFrame = config.startFrame ?? 0;
      const endFrame = config.endFrame ?? totalFrames;

      bus.emit(TimelineEvents.RENDER_REQUESTED, { format: config.format, totalFrames });

      // Phase: Preparing
      setProgress({ phase: 'preparing', currentFrame: 0, totalFrames: endFrame - startFrame, percent: 0, estimatedTimeRemaining: null });

      // Create frame renderer
      const frameRenderer = createFrameRenderer({
        width,
        height,
        fps,
        startFrame,
        endFrame,
        backgroundColor: store.composition.backgroundColor,
      });

      // Gather entity snapshots from timeline clips
      const entitySnapshots: EntitySnapshot[] = store.clips.map((clip) => ({
        id: clip.entityId,
        type: 'default',
        x: width / 2,
        y: height / 2,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        zIndex: 0,
        overlay: undefined,
      }));
      frameRenderer.init(entitySnapshots);

      // Create encoder
      if (spec.codec === 'gif') {
        // GIF export not supported via WebCodecs — would need canvas-based GIF encoder
        setProgress({ phase: 'failed', currentFrame: 0, totalFrames: 0, percent: 0, estimatedTimeRemaining: null, error: 'GIF export requires server-side rendering' });
        return;
      }

      const encoder = createVideoExportEncoder({
        width,
        height,
        fps,
        bitrate: config.bitrate ?? spec.bitrate,
        codec: spec.codec as 'h264' | 'vp9',
      });

      try {
        await encoder.init();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setProgress({ phase: 'failed', currentFrame: 0, totalFrames: 0, percent: 0, estimatedTimeRemaining: null, error: message });
        bus.emit(TimelineEvents.RENDER_FAILED, { error: message });
        return;
      }

      // Phase: Rendering + Encoding
      const startTime = Date.now();
      for (let frame = startFrame; frame < endFrame; frame++) {
        if (cancelled) {
          encoder.cancel();
          frameRenderer.dispose();
          setProgress({ phase: 'cancelled', currentFrame: frame, totalFrames: endFrame - startFrame, percent: 0, estimatedTimeRemaining: null });
          return;
        }

        // Render frame
        const rendered = frameRenderer.renderFrame(frame);

        // Encode frame
        await encoder.encodeFrame(rendered.imageData, frame - startFrame);

        // Update progress
        const elapsed = Date.now() - startTime;
        const framesRendered = frame - startFrame + 1;
        const framesTotal = endFrame - startFrame;
        const msPerFrame = elapsed / framesRendered;
        const remaining = (framesTotal - framesRendered) * msPerFrame;

        setProgress({
          phase: 'rendering',
          currentFrame: framesRendered,
          totalFrames: framesTotal,
          percent: Math.round((framesRendered / framesTotal) * 100),
          estimatedTimeRemaining: remaining / 1000,
        });

        // Yield to UI thread every 10 frames
        if (framesRendered % 10 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      // Phase: Encoding (finalize)
      setProgress({ phase: 'encoding', currentFrame: endFrame - startFrame, totalFrames: endFrame - startFrame, percent: 95, estimatedTimeRemaining: null });

      const chunks = await encoder.finalize();
      frameRenderer.dispose();

      // Phase: Muxing
      setProgress({ phase: 'muxing', currentFrame: endFrame - startFrame, totalFrames: endFrame - startFrame, percent: 98, estimatedTimeRemaining: null });

      const mimeType = spec.codec === 'vp9' ? 'video/webm' : 'video/mp4';
      const blob = chunksToBlob(chunks, mimeType);

      // Trigger download
      const filename = `export-${Date.now()}.${spec.fileExtension}`;
      downloadBlob(blob, filename);

      // Phase: Complete
      setProgress({ phase: 'complete', currentFrame: endFrame - startFrame, totalFrames: endFrame - startFrame, percent: 100, estimatedTimeRemaining: 0 });

      bus.emit(TimelineEvents.RENDER_COMPLETED, {
        filename,
        size: blob.size,
        duration: store.composition.duration,
        format: config.format,
      });
    },

    cancelExport(): void {
      cancelled = true;
    },

    getProgress(): ExportProgress | null {
      return currentProgress;
    },
  };
}
