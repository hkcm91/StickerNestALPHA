/**
 * Remote image upload utility.
 * Fetches an image from a remote URL and uploads it to Supabase Storage
 * for permanent persistence.
 *
 * @module kernel/storage/remote-upload
 */

import { supabase } from '../supabase';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export interface UploadRemoteImageOptions {
  /** Remote URL to fetch the image from */
  sourceUrl: string;
  /** Supabase Storage bucket name */
  bucket: string;
  /** User ID for RLS-compliant path prefix */
  userId: string;
  /** Optional filename override (defaults to crypto.randomUUID()) */
  filename?: string;
}

export interface RemoteUploadResult {
  publicUrl: string;
}

/**
 * Fetch an image from a remote URL and upload it to Supabase Storage.
 * Returns a permanent public URL.
 */
export async function uploadRemoteImage(
  opts: UploadRemoteImageOptions,
): Promise<RemoteUploadResult> {
  const { sourceUrl, bucket, userId, filename } = opts;

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch remote image: ${response.status} ${response.statusText}`,
    );
  }

  const blob = await response.blob();
  const contentType = response.headers.get('content-type') ?? 'image/png';
  const mimeBase = contentType.split(';')[0].trim();
  const ext = MIME_TO_EXT[mimeBase] ?? 'png';

  const name = filename ?? crypto.randomUUID();
  const storagePath = `${userId}/${name}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, blob, {
      upsert: false,
      contentType: mimeBase,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  return { publicUrl: data.publicUrl };
}
