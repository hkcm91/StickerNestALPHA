/**
 * StickerNest V5 — Layer 5: Marketplace
 *
 * Widget discovery, installation, publishing, ratings, and reviews.
 *
 * @module marketplace
 * @layer L5
 * @see .claude/rules/L5-marketplace.md
 */

export { initMarketplace, teardownMarketplace, isMarketplaceInitialized } from './init';

export { createMarketplaceAPI } from './api';
export type {
  MarketplaceAPI,
  MarketplaceWidgetListing,
  MarketplaceWidgetDetail,
  WidgetReview,
  WidgetVersion,
  SearchParams,
  PaginatedResult,
} from './api';

export { createWidgetListingService } from './listing';
export type { WidgetListingService, WidgetCategory } from './listing';

export { createWidgetDetailService } from './detail';
export type { WidgetDetailService } from './detail';

export { createInstallFlowService } from './install';
export type { InstallFlowService, InstallResult, UninstallOptions } from './install';

export { createPublisherDashboard } from './publisher';
export type { PublisherDashboard, PublishResult, UpdateResult } from './publisher';

export { createReviewManager } from './reviews';
export type { ReviewManager } from './reviews';
