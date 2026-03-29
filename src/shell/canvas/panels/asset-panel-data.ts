/**
 * Asset Panel data — types, helpers, and default asset definitions.
 * Extracted from AssetPanel.tsx for file size management.
 *
 * @module shell/canvas/panels
 * @layer L6
 */

export interface AssetItem {
  id: string;
  name: string;
  type: 'sticker' | 'widget' | 'icon' | 'lottie' | 'gallery';
  thumbnailUrl?: string;
  icon?: string;
  description?: string;
  tags?: string[];
  widgetType?: string;
  assetUrl?: string;
  assetType?: 'image' | 'gif' | 'video';
  svgContent?: string;
  previewUrl?: string;
  metadata: Record<string, unknown>;
}

export interface AssetPanelProps {
  assets?: AssetItem[];
}

export type AssetTab = 'stickers' | 'widgets' | 'api' | 'gallery';

export function toLibraryLabel(input: string): string {
  return input
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

export const DEFAULT_ASSETS: AssetItem[] = [
  {
    id: 'stk-star',
    name: 'Star',
    type: 'sticker',
    icon: '\u2b50',
    description: 'Five-pointed accent sticker.',
    tags: ['shape', 'highlight'],
    assetUrl: '/assets/stickers/star.png',
    assetType: 'image',
    metadata: { shape: 'star' },
  },
  {
    id: 'stk-heart',
    name: 'Heart',
    type: 'sticker',
    icon: '\u2764\ufe0f',
    description: 'Friendly reaction sticker.',
    tags: ['reaction', 'shape'],
    assetUrl: '/assets/stickers/heart.png',
    assetType: 'image',
    metadata: { shape: 'heart' },
  },
  {
    id: 'stk-arrow',
    name: 'Arrow',
    type: 'sticker',
    icon: '\u27a1\ufe0f',
    description: 'Directional callout sticker.',
    tags: ['pointer', 'annotation'],
    assetUrl: '/assets/stickers/arrow.png',
    assetType: 'image',
    metadata: { shape: 'arrow' },
  },
  {
    id: 'wgt-clock',
    name: 'Clock',
    type: 'widget',
    icon: '\u23f1\ufe0f',
    description: 'Live time widget with timezone-ready display.',
    tags: ['productivity', 'time', 'utility'],
    widgetType: 'information',
    metadata: { widgetType: 'clock' },
  },
  {
    id: 'wgt-note',
    name: 'Sticky Note',
    type: 'widget',
    icon: '\ud83d\udcdd',
    description: 'Quick text capture widget for annotations and reminders.',
    tags: ['notes', 'text', 'collaboration'],
    widgetType: 'content',
    metadata: { widgetType: 'sticky-note' },
  },
  {
    id: 'wgt-counter',
    name: 'Counter',
    type: 'widget',
    icon: '\ud83d\udd22',
    description: 'Increment/decrement control for goals, votes, or tracking.',
    tags: ['input', 'tracking', 'interactive'],
    widgetType: 'control',
    metadata: { widgetType: 'counter' },
  },
  {
    id: 'sn.builtin.image-generator',
    name: 'AI Image Generator',
    type: 'widget',
    icon: '\ud83e\ude84',
    description: 'Generate AI images and place them on the canvas.',
    tags: ['ai', 'image', 'generation', 'creative'],
    widgetType: 'media',
    metadata: { widgetId: 'sn.builtin.image-generator' },
  },
  {
    id: 'sn.builtin.pathfinder',
    name: 'Pathfinder',
    type: 'widget',
    icon: '✨',
    description: 'Vector pathfinder and shapebuilder tool panel.',
    tags: ['vector', 'geometry', 'path', 'shapebuilder'],
    widgetType: 'utility',
    metadata: { widgetId: 'sn.builtin.pathfinder' },
  },
  {
    id: 'sn.builtin.kanban',
    name: 'Kanban Board',
    type: 'widget',
    icon: '📋',
    description: 'Drag-and-drop Kanban board with columns, cards, and color labels.',
    tags: ['productivity', 'project', 'tasks', 'kanban', 'board'],
    widgetType: 'productivity',
    metadata: { widgetId: 'sn.builtin.kanban' },
  },
  {
    id: 'sn.builtin.todo-list',
    name: 'Todo List',
    type: 'widget',
    icon: '✅',
    description: 'Task manager with priorities, filtering, and sorting.',
    tags: ['productivity', 'tasks', 'todo', 'checklist', 'organizer'],
    widgetType: 'productivity',
    metadata: { widgetId: 'sn.builtin.todo-list' },
  },
  {
    id: 'sn.builtin.xc-broadcaster',
    name: 'Broadcaster',
    type: 'widget',
    icon: '📡',
    description: 'Send messages to other canvases via a named channel.',
    tags: ['cross-canvas', 'communication', 'broadcast'],
    widgetType: 'utility',
    metadata: { widgetId: 'sn.builtin.xc-broadcaster' },
  },
  {
    id: 'sn.builtin.xc-listener',
    name: 'Listener',
    type: 'widget',
    icon: '👂',
    description: 'Receive messages from other canvases via a named channel.',
    tags: ['cross-canvas', 'communication', 'listen'],
    widgetType: 'utility',
    metadata: { widgetId: 'sn.builtin.xc-listener' },
  },
  {
    id: 'sn.builtin.data-table',
    name: 'Data Table',
    type: 'widget',
    icon: '📊',
    description: 'Create and read DataSources via the SDK.',
    tags: ['data', 'table', 'datasource', 'test'],
    widgetType: 'data',
    metadata: { widgetId: 'sn.builtin.data-table' },
  },
  {
    id: 'sn.builtin.entity-spawner',
    name: 'Entity Spawner',
    type: 'widget',
    icon: '🔮',
    description: 'Create canvas entities (stickers, text, shapes) via the SDK.',
    tags: ['canvas', 'entity', 'spawn', 'test'],
    widgetType: 'utility',
    metadata: { widgetId: 'sn.builtin.entity-spawner' },
  },
  {
    id: 'sn.builtin.book-search',
    name: 'Book Search',
    type: 'widget',
    icon: '\ud83d\udcda',
    description: 'Search Open Library and save books to your database.',
    tags: ['productivity', 'books', 'reading', 'library', 'search'],
    widgetType: 'productivity',
    metadata: { widgetId: 'sn.builtin.book-search' },
  },
  {
    id: 'sn.builtin.social-feed',
    name: 'Social Feed',
    type: 'widget',
    icon: '📰',
    description: 'Social feed showing posts from followed users.',
    tags: ['social', 'feed', 'posts'],
    widgetType: 'social',
    metadata: { widgetId: 'sn.builtin.social-feed' },
  },
  {
    id: 'sn.builtin.signup',
    name: 'Sign Up',
    type: 'widget',
    icon: '🔐',
    description: 'Email/password signup and login form for canvas visitors.',
    tags: ['commerce', 'auth', 'signup', 'login'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.signup' },
  },
  {
    id: 'sn.builtin.subscribe',
    name: 'Subscribe',
    type: 'widget',
    icon: '💳',
    description: 'Displays canvas subscription tiers for visitor purchase.',
    tags: ['commerce', 'subscription', 'monetization'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.subscribe' },
  },
  {
    id: 'sn.builtin.shop',
    name: 'Shop',
    type: 'widget',
    icon: '🛒',
    description: 'Displays canvas shop items for purchase.',
    tags: ['commerce', 'shop', 'store'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.shop' },
  },
  {
    id: 'sn.builtin.creator-setup',
    name: 'Creator Setup',
    type: 'widget',
    icon: '⚡',
    description: 'Multi-page Stripe Connect onboarding for creators.',
    tags: ['commerce', 'creator', 'stripe', 'onboarding'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.creator-setup' },
  },
  {
    id: 'sn.builtin.tier-manager',
    name: 'Tier Manager',
    type: 'widget',
    icon: '🏷️',
    description: 'Create, edit, and delete subscription tiers.',
    tags: ['commerce', 'creator', 'tiers', 'subscription'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.tier-manager' },
  },
  {
    id: 'sn.builtin.item-manager',
    name: 'Item Manager',
    type: 'widget',
    icon: '📦',
    description: 'Create, edit, and delete shop items.',
    tags: ['commerce', 'creator', 'items', 'products'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.item-manager' },
  },
  {
    id: 'sn.builtin.orders',
    name: 'My Orders',
    type: 'widget',
    icon: '🧾',
    description: 'Purchase history and active subscriptions for buyers.',
    tags: ['commerce', 'buyer', 'orders', 'history'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.orders' },
  },
  {
    id: 'sn.builtin.creator-dashboard',
    name: 'Creator Dashboard',
    type: 'widget',
    icon: '📈',
    description: 'Revenue, subscriber, and order overview for creators.',
    tags: ['commerce', 'creator', 'analytics', 'dashboard'],
    widgetType: 'commerce',
    metadata: { widgetId: 'sn.builtin.creator-dashboard' },
  },
];
