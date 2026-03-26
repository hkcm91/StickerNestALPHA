/**
 * Empty State Content
 *
 * Messages displayed when a list, panel, or view has no content to show.
 * Each empty state has a title, body, and an optional action.
 *
 * @module content/empty-states
 */

export interface EmptyState {
  /** Short heading */
  title: string;
  /** Explanatory body text */
  body: string;
  /** Optional CTA button label */
  action?: string;
  /** Optional icon name (from your icon library) */
  icon?: string;
}

export const EMPTY_STATES = {
  /** Canvas with no entities */
  emptyCanvas: {
    title: 'A blank canvas',
    body: 'Start by adding stickers from the asset panel or installing widgets from the Marketplace.',
    action: 'Browse the Marketplace',
    icon: 'canvas',
  },

  /** Asset panel with no stickers */
  noStickers: {
    title: 'No stickers yet',
    body: 'Upload images, GIFs, or videos to build your sticker collection.',
    action: 'Upload a sticker',
    icon: 'image',
  },

  /** Asset panel with no installed widgets */
  noWidgets: {
    title: 'No widgets installed',
    body: 'Browse the Marketplace to find interactive widgets for your canvas.',
    action: 'Open Marketplace',
    icon: 'widgets',
  },

  /** Marketplace search with no results */
  noSearchResults: {
    title: 'No results found',
    body: 'Try a different search term or browse by category.',
    icon: 'search',
  },

  /** Marketplace reviews section with no reviews */
  noReviews: {
    title: 'No reviews yet',
    body: 'Be the first to review this widget.',
    action: 'Write a review',
    icon: 'star',
  },

  /** Layers panel with no entities */
  noLayers: {
    title: 'Nothing here yet',
    body: 'Entities you add to the canvas will appear in this list.',
    icon: 'layers',
  },

  /** Pipeline view with no connections */
  noPipelines: {
    title: 'No pipelines',
    body: 'Switch to the pipeline tool (W) and drag between widget ports to create connections.',
    icon: 'pipeline',
  },

  /** Publisher dashboard with no published widgets */
  noPublishedWidgets: {
    title: 'You haven\'t published any widgets yet',
    body: 'Build a widget in the Widget Lab and publish it to the Marketplace.',
    action: 'Open Widget Lab',
    icon: 'lab',
  },

  /** Gallery with no uploaded assets */
  emptyGallery: {
    title: 'Your gallery is empty',
    body: 'Upload images, GIFs, or videos to start building your asset library.',
    action: 'Upload files',
    icon: 'upload',
  },

  /** Canvas list on workspace home with no canvases */
  noCanvases: {
    title: 'No canvases yet',
    body: 'Create your first canvas to get started.',
    action: 'New canvas',
    icon: 'plus',
  },

  /** Collaborator list with no shared users */
  noCollaborators: {
    title: 'Just you for now',
    body: 'Invite others to collaborate on this canvas.',
    action: 'Share',
    icon: 'users',
  },

  /** Lab version history with no snapshots */
  noVersions: {
    title: 'No versions saved',
    body: 'Save a snapshot to create a restore point for your widget.',
    action: 'Save snapshot',
    icon: 'history',
  },

  /** Docker container with no widgets in tab */
  emptyDocker: {
    title: 'Empty container',
    body: 'Drag widgets into this container to organize them in tabs.',
    icon: 'container',
  },
} as const satisfies Record<string, EmptyState>;
