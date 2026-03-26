/**
 * MarketplaceRoot — sub-router for all marketplace pages.
 *
 * Routes:
 *   /marketplace              → BrowsePage
 *   /marketplace/widget/:id   → DetailPage
 *   /marketplace/library      → LibraryPage
 *   /marketplace/publisher    → PublisherPage
 *   /marketplace/publisher/:widgetId → WidgetManagePage
 *
 * @module shell/pages/marketplace
 * @layer L6
 */

import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { BrowsePage } from './browse/BrowsePage';
import { DetailPage } from './detail/DetailPage';
import { LibraryPage } from './library/LibraryPage';
import { PublisherPage } from './publisher/PublisherPage';
import { WidgetManagePage } from './publisher/WidgetManagePage';

export const MarketplaceRoot: React.FC = () => {
  return (
    <Routes>
      <Route index element={<BrowsePage />} />
      <Route path="widget/:id" element={<DetailPage />} />
      <Route path="library" element={<LibraryPage />} />
      <Route path="publisher" element={<PublisherPage />} />
      <Route path="publisher/:widgetId" element={<WidgetManagePage />} />
    </Routes>
  );
};
