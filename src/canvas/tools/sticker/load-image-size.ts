/**
 * Image/video dimension loader for aspect-ratio-aware sticker placement.
 *
 * @module canvas/tools/sticker
 * @layer L4A-2
 */

const DEFAULT_SIZE = { width: 120, height: 120 };
const LOAD_TIMEOUT_MS = 3_000;

/**
 * Load the natural dimensions of an image or video asset.
 * Falls back to 120×120 on timeout or error.
 */
export function loadImageSize(
  url: string,
  assetType: 'image' | 'gif' | 'video' = 'image',
): Promise<{ width: number; height: number }> {
  if (!url) return Promise.resolve(DEFAULT_SIZE);

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(DEFAULT_SIZE), LOAD_TIMEOUT_MS);

    if (assetType === 'video') {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve({
          width: video.videoWidth || DEFAULT_SIZE.width,
          height: video.videoHeight || DEFAULT_SIZE.height,
        });
        video.src = '';
      };
      video.onerror = () => {
        clearTimeout(timer);
        resolve(DEFAULT_SIZE);
      };
      video.src = url;
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        clearTimeout(timer);
        resolve({
          width: img.naturalWidth || DEFAULT_SIZE.width,
          height: img.naturalHeight || DEFAULT_SIZE.height,
        });
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(DEFAULT_SIZE);
      };
      img.src = url;
    }
  });
}

/**
 * Compute entity size from natural image dimensions, preserving aspect ratio.
 *
 * - Shorter side scales to `baseSize`
 * - Longer side is proportional
 * - Neither side exceeds `maxDim`
 */
export function computeStickerSize(
  natural: { width: number; height: number },
  baseSize = 120,
  maxDim = 400,
): { width: number; height: number } {
  const { width: nw, height: nh } = natural;
  if (nw <= 0 || nh <= 0) return { width: baseSize, height: baseSize };

  const aspect = nw / nh;
  let w: number;
  let h: number;

  if (aspect >= 1) {
    // Landscape or square
    h = baseSize;
    w = baseSize * aspect;
  } else {
    // Portrait
    w = baseSize;
    h = baseSize / aspect;
  }

  // Cap at maxDim
  if (w > maxDim) {
    w = maxDim;
    h = maxDim / aspect;
  }
  if (h > maxDim) {
    h = maxDim;
    w = maxDim * aspect;
  }

  return { width: Math.round(w), height: Math.round(h) };
}
