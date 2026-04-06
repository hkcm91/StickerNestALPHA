/**
 * Client-side image resizing using native Canvas API.
 * No external dependencies required.
 *
 * @module kernel/storage/image-resize
 */

/**
 * Resize an image to fit within the given max dimensions, preserving aspect ratio.
 * Returns a JPEG blob for efficiency.
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate scale to fit within bounds
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas 2d context');

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}

/**
 * Center-crop an image to a target aspect ratio, then resize to fit max dimensions.
 */
export async function cropToAspectRatio(
  file: File,
  aspectRatio: number,
  maxWidth: number,
  maxHeight: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate crop region (centered)
  let cropWidth = width;
  let cropHeight = width / aspectRatio;

  if (cropHeight > height) {
    cropHeight = height;
    cropWidth = height * aspectRatio;
  }

  const cropX = (width - cropWidth) / 2;
  const cropY = (height - cropHeight) / 2;

  // Calculate output dimensions
  const scale = Math.min(1, maxWidth / cropWidth, maxHeight / cropHeight);
  const targetWidth = Math.round(cropWidth * scale);
  const targetHeight = Math.round(cropHeight * scale);

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas 2d context');

  ctx.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}
