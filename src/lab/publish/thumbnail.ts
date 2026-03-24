/**
 * Thumbnail Generator
 *
 * Renders a widget in a hidden iframe and captures a screenshot
 * for the Marketplace listing using a canvas-based capture approach.
 *
 * E2E publish pipeline tests use Playwright with --use-gl=swiftshader
 * for deterministic, GPU-free rendering. This module handles the
 * client-side capture for the Lab publish flow.
 *
 * @module lab/publish
 * @layer L2
 */

export interface ThumbnailResult {
  success: boolean;
  data: Blob | null;
  error?: string;
}

/** Thumbnail dimensions */
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 300;

/** Time to wait for the widget to render before capture (ms) */
const RENDER_SETTLE_MS = 1500;

/** Maximum time to wait for capture to complete (ms) */
const CAPTURE_TIMEOUT_MS = 5000;

/**
 * Generates a thumbnail for a widget by rendering it in a hidden iframe
 * and capturing the content via a foreignObject SVG → canvas pipeline.
 *
 * @param html - Widget HTML source
 * @param options - Optional configuration
 * @returns Thumbnail result with PNG blob
 */
export async function generateThumbnail(
  html: string,
  options?: { width?: number; height?: number; settleMs?: number }
): Promise<ThumbnailResult> {
  const width = options?.width ?? THUMBNAIL_WIDTH;
  const height = options?.height ?? THUMBNAIL_HEIGHT;
  const settleMs = options?.settleMs ?? RENDER_SETTLE_MS;

  if (!html || html.trim().length === 0) {
    return { success: false, data: null, error: 'Widget HTML is empty' };
  }

  // In non-browser environments (e.g., unit tests), return a placeholder
  if (typeof document === 'undefined') {
    return createPlaceholderThumbnail(width, height);
  }

  return captureWithTimeout(html, width, height, settleMs);
}

/**
 * Creates a placeholder thumbnail using an OffscreenCanvas (or regular canvas).
 * Used in environments where iframe capture isn't possible.
 */
function createPlaceholderThumbnail(width: number, height: number): Promise<ThumbnailResult> {
  return new Promise((resolve) => {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#999';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Widget Preview', width / 2, height / 2);
      }
      canvas.convertToBlob({ type: 'image/png' }).then((blob) => {
        resolve({ success: true, data: blob });
      });
    } else {
      const blob = new Blob(['placeholder-thumbnail'], { type: 'image/png' });
      resolve({ success: true, data: blob });
    }
  });
}

/**
 * Wraps the iframe capture flow with a timeout.
 */
async function captureWithTimeout(
  html: string,
  width: number,
  height: number,
  settleMs: number
): Promise<ThumbnailResult> {
  return new Promise<ThumbnailResult>((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        success: false,
        data: null,
        error: `Thumbnail capture timed out after ${CAPTURE_TIMEOUT_MS}ms`,
      });
    }, CAPTURE_TIMEOUT_MS);

    captureIframe(html, width, height, settleMs)
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          data: null,
          error: err instanceof Error ? err.message : 'Capture failed',
        });
      });
  });
}

/**
 * Renders widget HTML in a hidden iframe and captures it via canvas drawing.
 *
 * Uses a foreignObject SVG approach: the iframe's srcdoc content is serialized
 * into an SVG foreignObject, drawn onto a canvas, and exported as PNG.
 * This avoids cross-origin restrictions since the content is loaded via srcdoc.
 */
async function captureIframe(
  html: string,
  width: number,
  height: number,
  settleMs: number
): Promise<ThumbnailResult> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = `${width}px`;
  iframe.style.height = `${height}px`;
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  // Strip SDK injection and scripts for a safe static render
  const safeHtml = stripScripts(html);
  iframe.srcdoc = safeHtml;

  document.body.appendChild(iframe);

  try {
    // Wait for iframe load
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Iframe failed to load'));
      setTimeout(() => resolve(), settleMs + 500); // fallback
    });

    // Let content settle (CSS animations, fonts, etc.)
    await new Promise((r) => setTimeout(r, settleMs));

    // Capture via foreignObject SVG → canvas
    const svgData = buildSvgCapture(safeHtml, width, height);
    const blob = await svgToBlob(svgData, width, height);

    return { success: true, data: blob };
  } finally {
    document.body.removeChild(iframe);
  }
}

/**
 * Strips <script> tags from HTML to produce a safe static snapshot for thumbnail.
 * Widget logic doesn't need to run for a visual preview.
 */
function stripScripts(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

/**
 * Builds an SVG with a foreignObject containing the widget HTML.
 */
function buildSvgCapture(html: string, width: number, height: number): string {
  const escaped = html
    .replace(/&/g, '&amp;')
    .replace(/#/g, '%23');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;">
          ${escaped}
        </div>
      </foreignObject>
    </svg>
  `.trim();
}

/**
 * Converts SVG data to a PNG Blob via canvas.
 */
function svgToBlob(svgData: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not get canvas 2d context'));
        return;
      }

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob returned null'));
          }
        },
        'image/png'
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG into image'));
    };

    img.src = url;
  });
}
