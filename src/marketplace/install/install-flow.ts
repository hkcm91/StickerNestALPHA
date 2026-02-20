/**
 * Widget Install/Uninstall Flow
 *
 * Handles the full installation lifecycle: fetch, validate manifest,
 * register in widgetStore via bus event, record in DB.
 * Uninstall requires explicit user confirmation.
 *
 * @module marketplace/install
 * @layer L5
 * @see .claude/rules/L5-marketplace.md
 */

import { WidgetManifestSchema, MarketplaceEvents } from '@sn/types';
import type { WidgetManifest } from '@sn/types';

import { bus } from '../../kernel/bus';
import { useWidgetStore } from '../../kernel/stores/widget/widget.store';
import { createMarketplaceAPI } from '../api/marketplace-api';

export interface InstallResult {
  success: boolean;
  widgetId?: string;
  error?: string;
}

export interface UninstallOptions {
  confirmed: boolean;
}

export interface InstallFlowService {
  install(userId: string, widgetId: string): Promise<InstallResult>;
  uninstall(
    userId: string,
    widgetId: string,
    options: UninstallOptions,
  ): Promise<InstallResult>;
  isInstalled(widgetId: string): boolean;
}

export function createInstallFlowService(): InstallFlowService {
  const api = createMarketplaceAPI();

  return {
    async install(userId: string, widgetId: string): Promise<InstallResult> {
      try {
        // 1. Fetch widget HTML + manifest from API
        const { htmlContent, manifest } = await api.install(userId, widgetId);

        // 2. Validate manifest (mandatory — no bypass)
        const validation = WidgetManifestSchema.safeParse(manifest);
        if (!validation.success) {
          return {
            success: false,
            error: `Invalid manifest: ${validation.error.issues.map((i) => i.message).join(', ')}`,
          };
        }

        // 3. Register in widgetStore
        const store = useWidgetStore.getState();
        store.registerWidget({
          widgetId: validation.data.id,
          manifest: validation.data,
          htmlContent,
          isBuiltIn: false,
          installedAt: new Date().toISOString(),
        });

        // 4. Emit bus event
        bus.emit(MarketplaceEvents.WIDGET_INSTALLED, {
          widgetId: validation.data.id,
          manifest: validation.data,
        });

        return { success: true, widgetId: validation.data.id };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Installation failed',
        };
      }
    },

    async uninstall(
      userId: string,
      widgetId: string,
      options: UninstallOptions,
    ): Promise<InstallResult> {
      // Require explicit confirmation — refuse if not confirmed
      if (!options.confirmed) {
        return {
          success: false,
          error: 'Uninstall requires explicit confirmation',
        };
      }

      try {
        // 1. Emit uninstall event (Runtime handles state deletion)
        bus.emit(MarketplaceEvents.WIDGET_UNINSTALLED, { widgetId });

        // 2. Remove from DB
        await api.uninstall(userId, widgetId);

        // 3. Remove from widgetStore
        const store = useWidgetStore.getState();
        store.unregisterWidget(widgetId);

        return { success: true, widgetId };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Uninstall failed',
        };
      }
    },

    isInstalled(widgetId: string): boolean {
      const store = useWidgetStore.getState();
      return widgetId in store.registry;
    },
  };
}
