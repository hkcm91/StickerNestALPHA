/**
 * Marketplace API — Factory that composes domain sub-modules
 *
 * All marketplace database operations go through this module.
 * Handles widget listings, installs, publishing, and reviews.
 *
 * @module marketplace/api
 * @layer L5
 * @see .claude/rules/L5-marketplace.md
 */

import * as discovery from './discovery';
import * as installation from './installation';
import * as publishing from './publishing';
import * as reviews from './reviews';
import type { MarketplaceAPI } from './types';

export type {
  MarketplaceAPI,
  MarketplaceWidgetListing,
  MarketplaceWidgetDetail,
  WidgetReview,
  WidgetVersion,
  SearchParams,
  PaginatedResult,
} from './types';

export function createMarketplaceAPI(): MarketplaceAPI {
  return {
    search: discovery.search,
    getFeatured: discovery.getFeatured,
    getWidget: discovery.getWidget,
    getWidgetBySlug: discovery.getWidgetBySlug,
    install: installation.install,
    uninstall: installation.uninstall,
    getInstalledWidgets: installation.getInstalledWidgets,
    publish: publishing.publish,
    updateWidget: publishing.updateWidget,
    deprecateWidget: publishing.deprecateWidget,
    deleteWidget: publishing.deleteWidget,
    getPublishedByAuthor: publishing.getPublishedByAuthor,
    getVersionHistory: publishing.getVersionHistory,
    getReviews: reviews.getReviews,
    addReview: reviews.addReview,
    updateReview: reviews.updateReview,
    deleteReview: reviews.deleteReview,
  };
}
