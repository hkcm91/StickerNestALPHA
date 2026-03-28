/**
 * Widget Upload schemas — upload input types, review status, security scan results
 *
 * @module @sn/types/widget-upload
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Upload Input Type
// ---------------------------------------------------------------------------

/** The type of file being uploaded */
export const UploadInputTypeSchema = z.enum(['html', 'zip', 'source']);
export type UploadInputType = z.infer<typeof UploadInputTypeSchema>;

// ---------------------------------------------------------------------------
// Review Status
// ---------------------------------------------------------------------------

/** Widget review status after upload and security scan */
export const ReviewStatusSchema = z.enum(['pending', 'approved', 'flagged', 'rejected']);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

// ---------------------------------------------------------------------------
// Security Scan Result
// ---------------------------------------------------------------------------

/** A single security flag raised by the scanner */
export const SecurityFlagSchema = z.object({
  severity: z.enum(['warning', 'critical']),
  rule: z.string(),
  message: z.string(),
  line: z.number().optional(),
});
export type SecurityFlagType = z.infer<typeof SecurityFlagSchema>;

/** Result of an automated security scan on widget HTML */
export const SecurityScanResultSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  flags: z.array(SecurityFlagSchema),
});
export type SecurityScanResultType = z.infer<typeof SecurityScanResultSchema>;

// ---------------------------------------------------------------------------
// Upload Request/Response (bus event payloads)
// ---------------------------------------------------------------------------

/** Payload for marketplace.upload.request bus event */
export const UploadRequestPayloadSchema = z.object({
  file: z.instanceof(File),
  inputType: UploadInputTypeSchema,
  authorId: z.string(),
});
export type UploadRequestPayload = z.infer<typeof UploadRequestPayloadSchema>;

/** Payload for marketplace.upload.response bus event */
export const UploadResponsePayloadSchema = z.object({
  success: z.boolean(),
  widgetId: z.string().optional(),
  reviewStatus: ReviewStatusSchema.optional(),
  scanResult: SecurityScanResultSchema.optional(),
  error: z.string().optional(),
  errors: z.array(z.string()).optional(),
});
export type UploadResponsePayload = z.infer<typeof UploadResponsePayloadSchema>;

// ---------------------------------------------------------------------------
// JSON Schema exports
// ---------------------------------------------------------------------------

export const ReviewStatusJSONSchema = ReviewStatusSchema.toJSONSchema();
export const SecurityScanResultJSONSchema = SecurityScanResultSchema.toJSONSchema();
export const UploadInputTypeJSONSchema = UploadInputTypeSchema.toJSONSchema();
