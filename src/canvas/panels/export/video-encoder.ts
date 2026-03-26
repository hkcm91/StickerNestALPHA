/**
 * Video Encoder — WebCodecs encoding pipeline for video export
 *
 * @module canvas/panels/export/video-encoder
 * @layer L4A-4
 *
 * @remarks
 * Encodes rendered frames using the WebCodecs VideoEncoder API.
 * Collects encoded chunks and provides them for muxing.
 *
 * Falls back gracefully when WebCodecs is not available.
 */

// =============================================================================
// Types
// =============================================================================

export interface EncodedChunk {
  data: Uint8Array;
  timestamp: number;
  duration: number;
  isKeyFrame: boolean;
}

export interface VideoEncoderConfig {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: 'h264' | 'vp9';
}

// =============================================================================
// WebCodecs Support Check
// =============================================================================

export function isWebCodecsSupported(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

// =============================================================================
// Video Encoder
// =============================================================================

export interface IVideoExportEncoder {
  /** Initialize the encoder */
  init(): Promise<void>;
  /** Encode a single frame from ImageData */
  encodeFrame(imageData: ImageData, frameNumber: number): Promise<void>;
  /** Flush remaining frames and finalize */
  finalize(): Promise<EncodedChunk[]>;
  /** Get all encoded chunks so far */
  getChunks(): EncodedChunk[];
  /** Cancel encoding */
  cancel(): void;
  /** Check if encoder is active */
  isActive(): boolean;
}

export function createVideoExportEncoder(config: VideoEncoderConfig): IVideoExportEncoder {
  const chunks: EncodedChunk[] = [];
  let encoder: VideoEncoder | null = null;
  let active = false;
  let canvas: OffscreenCanvas | null = null;

  return {
    async init(): Promise<void> {
      if (!isWebCodecsSupported()) {
        throw new Error('WebCodecs API is not supported in this browser');
      }

      canvas = new OffscreenCanvas(config.width, config.height);

      const codecString = config.codec === 'h264'
        ? 'avc1.42E01E' // H.264 Baseline
        : 'vp09.00.10.08'; // VP9

      encoder = new VideoEncoder({
        output: (chunk: EncodedVideoChunk) => {
          const data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          chunks.push({
            data,
            timestamp: chunk.timestamp,
            duration: chunk.duration ?? (1_000_000 / config.fps),
            isKeyFrame: chunk.type === 'key',
          });
        },
        error: (err: DOMException) => {
          console.error('[VideoEncoder] Error:', err.message);
          active = false;
        },
      });

      encoder.configure({
        codec: codecString,
        width: config.width,
        height: config.height,
        bitrate: config.bitrate,
        framerate: config.fps,
      });

      active = true;
    },

    async encodeFrame(imageData: ImageData, frameNumber: number): Promise<void> {
      if (!encoder || !active || !canvas) return;

      // Draw ImageData to canvas to create VideoFrame
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(imageData, 0, 0);

      const frame = new VideoFrame(canvas, {
        timestamp: frameNumber * (1_000_000 / config.fps),
        duration: 1_000_000 / config.fps,
      });

      const isKeyFrame = frameNumber % (config.fps * 2) === 0; // Keyframe every 2 seconds
      encoder.encode(frame, { keyFrame: isKeyFrame });
      frame.close();
    },

    async finalize(): Promise<EncodedChunk[]> {
      if (!encoder || !active) return chunks;

      await encoder.flush();
      encoder.close();
      active = false;
      encoder = null;

      return chunks;
    },

    getChunks(): EncodedChunk[] {
      return chunks;
    },

    cancel(): void {
      if (encoder && active) {
        encoder.close();
      }
      active = false;
      encoder = null;
    },

    isActive(): boolean {
      return active;
    },
  };
}

/**
 * Create a downloadable blob from encoded chunks.
 * Note: For proper MP4 muxing, the mp4-muxer library should be used.
 * This function creates a raw container as a fallback.
 */
export function chunksToBlob(chunks: EncodedChunk[], mimeType = 'video/mp4'): Blob {
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.data.byteLength, 0);
  const buffer = new Uint8Array(totalSize);
  let offset = 0;

  for (const chunk of chunks) {
    buffer.set(chunk.data, offset);
    offset += chunk.data.byteLength;
  }

  return new Blob([buffer], { type: mimeType });
}

/**
 * Trigger a file download for a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
