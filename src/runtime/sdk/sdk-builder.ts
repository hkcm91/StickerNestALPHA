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

import { generateCSPMetaTag } from '../security/csp';

import { generateSDKTemplate } from './sdk-template';

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
 * Escapes HTML special characters to prevent injection in attributes.
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds a complete srcdoc HTML string with SDK injection and CSP.
 *
 * @param options - Build options
 * @returns Complete HTML string for iframe srcdoc
 */
export function buildSrcdoc(options: SrcdocBuildOptions): string {
  const { widgetHtml, widgetId, instanceId } = options;
  const cspTag = generateCSPMetaTag();
  const sdkSource = generateSDKTemplate();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${cspTag}
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="sn-widget-id" content="${escapeHtml(widgetId)}">
  <meta name="sn-instance-id" content="${escapeHtml(instanceId)}">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: auto; }
  </style>
  <script>${sdkSource}</script>
</head>
<body>
${widgetHtml}
</body>
</html>`;
}
