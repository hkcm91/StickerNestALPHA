/**
 * Widget Package module
 *
 * Provides build, extraction, and asset utilities for the widget .zip package
 * format used by the Lab publish pipeline and Marketplace install flow.
 *
 * @module runtime/package
 * @layer L3
 */

export { buildWidgetPackage, downloadPackage } from './builder';
export type { BuildPackageInput } from './builder';

export { extractWidgetPackage } from './extractor';
export type { ExtractionResult } from './extractor';

export { inlineAssets, estimatePackageSize } from './asset-inliner';
export type { InlineAssetsResult } from './asset-inliner';
