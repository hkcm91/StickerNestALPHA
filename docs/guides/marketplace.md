# Marketplace Guide

> **Audience:** Widget creators publishing to the Marketplace, and users discovering and installing widgets
> **Also see:** [Widget Creator Guide](widget-creator.md) for SDK details, [Widget Lab Guide](widget-lab.md) for the in-app IDE, [Widget SDK Reference](../api/widget-sdk.md) for all SDK methods

## What Is the Marketplace?

The Marketplace is the widget app store for StickerNest V5. Creators publish widgets through the Widget Lab publish pipeline, and users discover, install, rate, and review them. Every widget listing includes a manifest, thumbnail, version history, and license metadata.

The Marketplace layer (`src/marketplace/`) is organized into five services: listing (discovery and search), detail (single widget view), install (install/uninstall flow), publisher (submit, update, deprecate), and reviews (ratings and review CRUD).

---

## Discovering Widgets

### Search

Search is full-text across widget names, descriptions, and tags. Results are paginated (20 per page by default) and sortable by rating, install count, or newest.

```ts
import { createWidgetListingService } from '@/marketplace';

const listing = createWidgetListingService();

// Full-text search
const results = await listing.search('timer');
// results.items — MarketplaceWidgetListing[]
// results.total — total matches
// results.hasMore — whether more pages exist

// Browse by category
const dataWidgets = await listing.browse('data', 0);
```

### Categories

Widgets are organized into seven categories: `productivity`, `data`, `social`, `utilities`, `games`, `media`, and `other`. The listing service exposes the full category list via `getCategories()`.

### Featured Widgets

A curated featured section highlights platform-recommended widgets. Featured widgets are returned by `listing.getFeatured()` and displayed prominently in the Marketplace UI.

---

## Widget Listings

Each listing in the Marketplace grid shows the widget's thumbnail, name, author, rating (1–5 stars), install count, license badge, and pricing (free or paid). Clicking a listing opens the detail view.

### Listing Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Widget display name |
| `slug` | `string` | URL-safe identifier |
| `description` | `string` | Human-readable description |
| `version` | `string` | Current semver version |
| `category` | `string` | One of the seven categories |
| `tags` | `string[]` | Searchable tags |
| `license` | `string` | License identifier (e.g., `MIT`, `proprietary`, `no-fork`) |
| `isFree` | `boolean` | Whether the widget is free |
| `priceCents` | `number \| null` | Price in smallest currency unit (null for free) |
| `installCount` | `number` | Total installations |
| `ratingAverage` | `number \| null` | Average rating (1–5 scale) |
| `ratingCount` | `number` | Number of reviews |
| `thumbnailUrl` | `string \| null` | Marketplace listing thumbnail |
| `isDeprecated` | `boolean` | Whether the widget has been deprecated by its author |

---

## Widget Detail Page

The detail page shows the full widget description, screenshots, the widget manifest (permissions, event contract, config schema), version history with changelogs, license information, and the review section.

```ts
import { createWidgetDetailService } from '@/marketplace';

const detail = createWidgetDetailService();

const widget = await detail.getWidgetDetail('widget-abc-123');
// widget.htmlContent — the full single-file HTML source
// widget.manifest — validated WidgetManifest
```

---

## Installation Flow

Installation follows a strict four-step process. No step can be skipped.

### Step 1: Fetch

The widget's HTML source and manifest are fetched from the Marketplace API via the Supabase backend.

### Step 2: Validate Manifest

The manifest is validated against the `WidgetManifestSchema` (from `@sn/types`) using Zod `safeParse`. If validation fails, installation is rejected with a specific error message describing which fields are invalid. Invalid widgets never reach `widgetStore`.

### Step 3: Register

On successful validation, the widget is registered in `widgetStore` via the store's `registerWidget` action. The widget becomes immediately available in the canvas asset panel.

### Step 4: Emit Event

A `marketplace.widget.installed` bus event is emitted with the `widgetId` and validated manifest. Other layers (e.g., canvas panels) react to this event to update their UI.

```ts
import { createInstallFlowService } from '@/marketplace';

const installFlow = createInstallFlowService();

// Install a widget
const result = await installFlow.install(userId, widgetId);
if (result.success) {
  console.log('Installed:', result.widgetId);
} else {
  console.error('Failed:', result.error);
}

// Check if installed
const installed = installFlow.isInstalled(widgetId);
```

### Uninstallation

Uninstallation requires explicit user confirmation. The install flow service refuses to proceed if `options.confirmed` is `false`. This is a safety measure because uninstalling deletes all saved widget state (instance state and any data the widget stored via `setState`).

```ts
// Uninstall — must pass confirmed: true
const uninstallResult = await installFlow.uninstall(userId, widgetId, {
  confirmed: true,
});
```

The uninstall sequence is: emit `marketplace.widget.uninstalled` bus event (Runtime handles state cleanup), remove from the backend database, then remove from `widgetStore`.

---

## Publishing Widgets

Publishing is the final step of the Widget Lab publish pipeline. After a widget passes validation, testing, and thumbnail generation in the Lab, the creator submits it to the Marketplace.

### Publisher Dashboard

Authenticated creators access their published widgets through the publisher dashboard. The dashboard supports five actions: publish (new widget), update (new version), deprecate, delete, and view version history.

```ts
import { createPublisherDashboard } from '@/marketplace';

const dashboard = createPublisherDashboard(authorId);

// Publish a new widget
const publishResult = await dashboard.publish(htmlContent, manifest, thumbnailBlob);
// publishResult.widgetId — the new listing ID

// Update an existing widget (new version)
const updateResult = await dashboard.update(widgetId, newHtml, newManifest, 'Fixed timer bug');

// View all your published widgets
const myWidgets = await dashboard.getMyWidgets();

// View version history for a widget
const versions = await dashboard.getVersionHistory(widgetId);
```

### Version History

Each publish creates a new version entry. Versions store the HTML content, manifest at time of publish, and an optional changelog string. The version history is accessible from both the publisher dashboard and the public widget detail page.

### Deprecation vs Deletion

**Deprecating** a widget hides it from Marketplace discovery (search and browse), but existing installations continue to work. Users who already installed the widget keep their copy and their saved state.

**Deleting** a widget removes the listing entirely. Existing installations show a "deprecated" badge in the canvas asset panel, signaling that the widget is no longer maintained or available for re-installation.

Both actions emit bus events: `marketplace.widget.deprecated` and the delete action removes the listing from the database.

---

## Ratings and Reviews

Users can rate installed widgets on a 1–5 scale and optionally leave a text review. Ratings are validated — values outside 1–5 are rejected. Each user can leave one review per widget (subsequent calls update the existing review rather than creating a duplicate).

```ts
import { createReviewManager } from '@/marketplace';

const reviews = createReviewManager(userId);

// Read reviews for a widget (paginated)
const widgetReviews = await reviews.getReviews(widgetId, 0);

// Add a review
await reviews.addReview(widgetId, 5, 'Great timer widget!');

// Update your review
await reviews.updateReview(widgetId, 4, 'Good, but could use dark mode');

// Delete your review
await reviews.deleteReview(widgetId);

// Check if you already reviewed this widget
const myReview = await reviews.getUserReview(widgetId);
```

A database trigger automatically recalculates `ratingAverage` and `ratingCount` on the widget listing whenever a review is added, updated, or deleted.

---

## License Enforcement

Every widget listing includes a `license` field. The platform supports four license types at minimum: `MIT`, `Apache-2.0`, `proprietary`, and `no-fork`.

License enforcement applies at two points in the system. First, the Widget Lab checks the license before allowing a fork/import — widgets with `no-fork` or `proprietary` licenses cannot be loaded into the Lab editor for forking. Second, the license badge is displayed on the widget detail page so users can make informed decisions before installing.

---

## Pricing

Widgets can be free or paid. Paid widgets include a `priceCents` field (in the smallest currency unit, e.g., cents for USD), a `currency` field (ISO 4217 code), and a `stripePriceId` for payment processing via Stripe.

---

## Bus Events

The Marketplace emits the following bus events for cross-layer coordination:

| Event | When |
|-------|------|
| `marketplace.widget.installed` | Widget successfully installed and registered in widgetStore |
| `marketplace.widget.uninstalled` | Widget uninstall confirmed; Runtime handles state cleanup |
| `marketplace.widget.published` | New widget published to Marketplace |
| `marketplace.widget.updated` | Existing widget updated with new version |
| `marketplace.widget.deprecated` | Widget deprecated (hidden from discovery) |

---

## Next Steps

- [Widget Lab Guide](widget-lab.md) — Create and publish widgets using the in-app IDE
- [Widget Creator Guide](widget-creator.md) — SDK lifecycle, events, state, theming
- [Widget SDK Reference](../api/widget-sdk.md) — All 16+ SDK methods
- [Canvas User Guide](canvas-user.md) — Using widgets on the canvas
