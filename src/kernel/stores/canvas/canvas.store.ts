/**
 * Canvas Store — manages active canvas metadata, sharing settings, and user role
 * @module kernel/stores/canvas
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent } from '@sn/types';
import { KernelEvents } from '@sn/types';

import { bus } from '../../bus';

/** Metadata for the active canvas */
export interface CanvasMeta {
  /** Canvas UUID */
  id: string;
  /** Human-readable canvas name */
  name: string;
  /** URL-safe slug for public/embed access (null if not published) */
  slug: string | null;
  /** User ID of the canvas owner */
  ownerId: string;
  /** Optional description shown in workspace listings */
  description: string | null;
  /** Thumbnail screenshot URL for workspace cards */
  thumbnailUrl: string | null;
  /** Whether the canvas is publicly accessible via slug */
  isPublic: boolean;
  /** Canvas-level settings (grid size, snap, background, etc.) */
  settings: Record<string, unknown>;
}

/** Sharing configuration for a canvas */
export interface CanvasSharingSettings {
  /** Whether the canvas is publicly accessible */
  isPublic: boolean;
  /** Default role assigned to users who access via public link */
  defaultRole: 'viewer' | 'commenter' | 'editor';
  /** Public URL slug (null if not published) */
  slug: string | null;
}

/** Canvas-level role for the current user — determines edit/preview mode */
export type CanvasRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface CanvasState {
  activeCanvasId: string | null;
  canvasMeta: CanvasMeta | null;
  sharingSettings: CanvasSharingSettings | null;
  userRole: CanvasRole | null;
  isLoading: boolean;
  error: string | null;
}

export interface CanvasActions {
  setActiveCanvas: (id: string | null, meta: CanvasMeta | null) => void;
  setSharingSettings: (settings: CanvasSharingSettings | null) => void;
  setUserRole: (role: CanvasRole | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export type CanvasStore = CanvasState & CanvasActions;

const initialState: CanvasState = {
  activeCanvasId: null,
  canvasMeta: null,
  sharingSettings: null,
  userRole: null,
  isLoading: false,
  error: null,
};

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...initialState,
      setActiveCanvas: (activeCanvasId, canvasMeta) =>
        set({ activeCanvasId, canvasMeta }),
      setSharingSettings: (sharingSettings) => set({ sharingSettings }),
      setUserRole: (userRole) => set({ userRole }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      reset: () => set(initialState),
    })),
    { name: 'canvasStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

/** Subscribe to canvas-related bus events for cross-store coordination */
export function setupCanvasBusSubscriptions(): void {
  // When auth state changes and user is null, reset canvas
  bus.subscribe(KernelEvents.AUTH_STATE_CHANGED, (event: BusEvent) => {
    const payload = event.payload as { user: unknown } | null;
    if (!payload || payload.user === null) {
      useCanvasStore.getState().reset();
    }
  });
}
