/**
 * Canvas Store — manages active canvas metadata, sharing settings, and user role
 * @module kernel/stores/canvas
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type { BusEvent } from '@sn/types';
import { KernelEvents } from '@sn/types';

import { bus } from '../../bus';

export interface CanvasMeta {
  id: string;
  name: string;
  slug: string | null;
  ownerId: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  settings: Record<string, unknown>;
}

export interface CanvasSharingSettings {
  isPublic: boolean;
  defaultRole: 'viewer' | 'commenter' | 'editor';
  slug: string | null;
}

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
