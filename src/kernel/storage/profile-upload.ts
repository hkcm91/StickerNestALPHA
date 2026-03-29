/**
 * Profile image upload utilities.
 * Handles validation and upload to Supabase Storage.
 *
 * @module kernel/storage/profile-upload
 */

import { supabase } from '../supabase';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const LIMITS = {
  avatar: { maxBytes: 2 * 1024 * 1024, label: '2 MB' },
  banner: { maxBytes: 5 * 1024 * 1024, label: '5 MB' },
} as const;

const BUCKET = 'profile-images';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadProfileImageOptions {
  userId: string;
  file: Blob;
  type: 'avatar' | 'banner';
}

export interface UploadResult {
  publicUrl: string;
}

/**
 * Validate a file for profile image upload.
 */
export function validateProfileImage(file: File, type: 'avatar' | 'banner'): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported format. Allowed: JPEG, PNG, WebP, GIF.`,
    };
  }

  const limit = LIMITS[type];
  if (file.size > limit.maxBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size for ${type}: ${limit.label}.`,
    };
  }

  return { valid: true };
}

/**
 * Upload a profile image (avatar or banner) to Supabase Storage.
 * Uses upsert so old images are automatically replaced.
 */
export async function uploadProfileImage(
  opts: UploadProfileImageOptions,
): Promise<UploadResult> {
  const { userId, file, type } = opts;
  const ext = 'jpg'; // We always convert to JPEG via image-resize
  const storagePath = `${userId}/${type}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      upsert: true,
      contentType: 'image/jpeg',
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  // Append cache-bust param so browsers pick up the new image
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

  return { publicUrl };
}
