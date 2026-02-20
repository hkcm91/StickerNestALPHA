/**
 * Asset Panel Controller — sticker/widget library, drag-to-canvas
 *
 * @module canvas/panels/assets
 * @layer L4A-4
 */

import { CanvasEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';
import { useUIStore } from '../../../kernel/stores/ui/ui.store';

export interface AssetItem {
  id: string;
  name: string;
  type: 'sticker' | 'widget';
  thumbnailUrl?: string;
  metadata: Record<string, unknown>;
}

export interface AssetPanelController {
  startDrag(asset: AssetItem): void;
  search(query: string, items: AssetItem[]): AssetItem[];
  paginate(items: AssetItem[], page: number, pageSize: number): { items: AssetItem[]; totalPages: number };
  isActiveInMode(): boolean;
}

export function createAssetPanelController(): AssetPanelController {
  return {
    startDrag(asset: AssetItem) {
      if (asset.type === 'sticker') {
        bus.emit(CanvasEvents.TOOL_CHANGED, { tool: 'sticker', assetId: asset.id, metadata: asset.metadata });
      } else {
        bus.emit(CanvasEvents.TOOL_CHANGED, { tool: 'widget', widgetId: asset.id, metadata: asset.metadata });
      }
    },

    search(query: string, items: AssetItem[]): AssetItem[] {
      if (!query.trim()) return items;
      const lower = query.toLowerCase();
      return items.filter(
        (item) =>
          item.name.toLowerCase().includes(lower) ||
          item.type.toLowerCase().includes(lower),
      );
    },

    paginate(items: AssetItem[], page: number, pageSize: number) {
      const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
      const clampedPage = Math.min(Math.max(1, page), totalPages);
      const start = (clampedPage - 1) * pageSize;
      return {
        items: items.slice(start, start + pageSize),
        totalPages,
      };
    },

    isActiveInMode(): boolean {
      return useUIStore.getState().canvasInteractionMode === 'edit';
    },
  };
}
