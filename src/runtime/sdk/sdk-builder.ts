/**
 * SDK Builder
 *
 * Assembles the final srcdoc HTML blob: SDK + CSP + widget code.
 * Widget HTML is loaded via srcdoc blob — never via a remote src URL.
 *
 * @module runtime/sdk
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

/**
 * Options for building the srcdoc blob.
 */
export interface SrcdocBuildOptions {
  /** The widget's HTML source */
  widgetHtml: string;
  /** Widget ID for identification */
  widgetId: string;
  /** Instance ID for the specific widget instance */
  instanceId: string;
}

/**
 * Builds a complete srcdoc HTML string with SDK injection and CSP.
 *
 * @param options - Build options
 * @returns Complete HTML string for iframe srcdoc
 */
export function buildSrcdoc(_options: SrcdocBuildOptions): string {
  // TODO: Implement — see runtime plan section 2.3
  throw new Error('Not implemented: buildSrcdoc');
}
