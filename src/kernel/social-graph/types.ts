/**
 * Social Graph API Types
 * @module kernel/social-graph/types
 */

/** Result type for social graph operations */
export type SocialResult<T> =
  | { success: true; data: T }
  | { success: false; error: SocialError };

export interface SocialError {
  code:
    | 'PERMISSION_DENIED'
    | 'NOT_FOUND'
    | 'ALREADY_EXISTS'
    | 'VALIDATION_ERROR'
    | 'SELF_ACTION'
    | 'BLOCKED'
    | 'UNKNOWN';
  message: string;
}

/** Pagination options */
export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

/** Paginated result wrapper */
export interface Paginated<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/** Supabase query result helper type */
export type QueryResult<T> = { data: T | null; error: { message: string } | null };
