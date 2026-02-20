/**
 * Content Security Policy Generation
 *
 * Generates the CSP meta tag for widget iframe srcdoc.
 * Default policy: no network, inline scripts/styles only,
 * data/blob URIs for images.
 *
 * @module runtime/security
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

/**
 * Default CSP for sandboxed widgets.
 */
export const DEFAULT_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  "connect-src 'none'",
].join('; ');

/**
 * Generates a CSP meta tag string for a widget iframe.
 *
 * @returns HTML meta tag with CSP
 */
export function generateCSPMetaTag(): string {
  return `<meta http-equiv="Content-Security-Policy" content="${DEFAULT_CSP}">`;
}
