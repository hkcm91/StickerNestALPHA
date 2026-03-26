/**
 * Canvas Thumbnail Capture Utility
 *
 * Captures the canvas viewport as a JPEG thumbnail for gallery display.
 * Uses html2canvas to render DOM elements to a canvas, then compresses
 * and uploads to Supabase Storage.
 *
 * @module shell/canvas/utils/thumbnail-capture
 * @layer L6
 */

import html2canvas from 'html2canvas';

import { supabase } from '../../../kernel/supabase';

/** Maximum thumbnail dimensions */
const MAX_WIDTH = 600;
const MAX_HEIGHT = 400;
const JPEG_QUALITY = 0.8;

/**
 * Capture the canvas viewport element as a compressed JPEG blob.
 * Scales down to fit within MAX_WIDTH x MAX_HEIGHT.
 */
export async function captureCanvasThumbnail(
  viewportElement: HTMLElement,
): Promise<Blob> {
  const rendered = await html2canvas(viewportElement, {
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    scale: 1,
    logging: false,
  });

  // Scale down to thumbnail size
  const scale = Math.min(
    MAX_WIDTH / rendered.width,
    MAX_HEIGHT / rendered.height,
    1, // never scale up
  );
  const thumbWidth = Math.round(rendered.width * scale);
  const thumbHeight = Math.round(rendered.height * scale);

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbWidth;
  thumbCanvas.height = thumbHeight;
  const ctx = thumbCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create 2D context for thumbnail');
  }
  ctx.drawImage(rendered, 0, 0, thumbWidth, thumbHeight);

  return new Promise<Blob>((resolve, reject) => {
    thumbCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create thumbnail blob'));
        }
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

/**
 * Upload a thumbnail blob to Supabase Storage and return the public URL.
 */
export async function uploadCanvasThumbnail(
  canvasId: string,
  blob: Blob,
): Promise<string> {
  const path = `canvas-thumbnails/${canvasId}.jpg`;

  const { error } = await supabase.storage
    .from('assets')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Thumbnail upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('assets')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * Capture + upload in one call. Returns the public URL of the uploaded thumbnail.
 */
export async function captureAndUploadThumbnail(
  viewportElement: HTMLElement,
  canvasId: string,
): Promise<string> {
  const blob = await captureCanvasThumbnail(viewportElement);
  return uploadCanvasThumbnail(canvasId, blob);
}
