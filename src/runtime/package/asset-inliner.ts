/**
 * Asset Inliner
 *
 * Utility for inlining external assets referenced in widget HTML as inline
 * data URIs. This makes packages fully self-contained so they can be loaded
 * in a sandboxed iframe without network access to external hosts.
 *
 * The current implementation is a stub — external resource fetching and
 * base64 encoding will be added in a follow-up pass once the asset proxy
 * endpoint is available. Callers can already integrate against the API
 * contract today.
 *
 * @module runtime/package/asset-inliner
 * @layer L3
 */

/**
 * Result of an asset inlining pass.
 */
export interface InlineAssetsResult {
  /** Widget HTML with external resources replaced by inline data URIs where possible. */
  html: string;
  /** Number of external resources successfully inlined. */
  inlinedCount: number;
}

/**
 * Scans widget HTML for external resource references and replaces them with
 * inline data URIs where possible.
 *
 * @remarks
 * Current implementation is a passthrough stub. Future passes will handle:
 * - `<img src="https://...">` → `data:image/...;base64,...`
 * - `<link href="https://...">` (stylesheets)
 * - `url(https://...)` within `<style>` blocks
 *
 * Inline `<script src="https://...">` tags are intentionally NOT inlined —
 * the CSP policy forbids remote scripts and they should be removed, not inlined.
 */
export function inlineAssets(html: string): InlineAssetsResult {
  // Stub: full implementation will fetch and inline external resources
  return { html, inlinedCount: 0 };
}

/**
 * Estimates the total encoded package size in bytes for a given widget HTML
 * and manifest before building the full package.
 *
 * Useful for surfacing a size warning in the Lab UI before the user exports.
 *
 * @returns Estimated byte count of the combined manifest + HTML content.
 */
export function estimatePackageSize(html: string, manifest: unknown): number {
  const manifestStr = JSON.stringify(manifest);
  const encoder = new TextEncoder();
  return (
    encoder.encode(html).byteLength +
    encoder.encode(manifestStr).byteLength
  );
}
