/**
 * Install Flow Tests
 *
 * @module marketplace/install
 * @layer L5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createInstallFlowService } from './install-flow';
import type { InstallFlowService } from './install-flow';

// Mock bus
const mockEmit = vi.fn();
vi.mock('../../kernel/bus', () => ({
  bus: { emit: (...args: unknown[]) => mockEmit(...args) },
}));

// Mock widget store
const mockRegisterWidget = vi.fn();
const mockUnregisterWidget = vi.fn();
const mockRegistry: Record<string, unknown> = {};

vi.mock('../../kernel/stores/widget/widget.store', () => ({
  useWidgetStore: {
    getState: () => ({
      registry: mockRegistry,
      registerWidget: mockRegisterWidget,
      unregisterWidget: mockUnregisterWidget,
    }),
  },
}));

// Mock marketplace API
const mockInstall = vi.fn();
const mockUninstall = vi.fn();

vi.mock('../api/marketplace-api', () => ({
  createMarketplaceAPI: () => ({
    install: mockInstall,
    uninstall: mockUninstall,
  }),
}));

// Mock WidgetManifestSchema
vi.mock('@sn/types', () => ({
  WidgetManifestSchema: {
    safeParse: vi.fn((data: unknown) => ({
      success: true,
      data: { ...(data as Record<string, unknown>), id: (data as Record<string, unknown>).id ?? 'test-widget' },
    })),
  },
  MarketplaceEvents: {
    WIDGET_INSTALLED: 'marketplace.widget.installed',
    WIDGET_UNINSTALLED: 'marketplace.widget.uninstalled',
  },
}));

describe('InstallFlowService', () => {
  let service: InstallFlowService;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRegistry).forEach((k) => delete mockRegistry[k]);
    service = createInstallFlowService();
  });

  describe('install', () => {
    it('installs a valid widget', async () => {
      mockInstall.mockResolvedValue({
        htmlContent: '<div>Test</div>',
        manifest: { id: 'test-widget', name: 'Test', version: '1.0.0' },
      });

      const result = await service.install('user1', 'w1');

      expect(result.success).toBe(true);
      expect(result.widgetId).toBe('test-widget');
      expect(mockRegisterWidget).toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith(
        'marketplace.widget.installed',
        expect.objectContaining({ widgetId: 'test-widget' }),
      );
    });

    it('rejects widget with invalid manifest', async () => {
      const { WidgetManifestSchema } = await import('@sn/types');
      (WidgetManifestSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        success: false,
        error: { issues: [{ message: 'Missing id field' }] },
      });

      mockInstall.mockResolvedValue({
        htmlContent: '<div>Bad</div>',
        manifest: {},
      });

      const result = await service.install('user1', 'w1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid manifest');
      expect(mockRegisterWidget).not.toHaveBeenCalled();
    });

    it('returns error on API failure', async () => {
      mockInstall.mockRejectedValue(new Error('Not found'));

      const result = await service.install('user1', 'w1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });
  });

  describe('uninstall', () => {
    it('requires explicit confirmation', async () => {
      const result = await service.uninstall('user1', 'w1', { confirmed: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('confirmation');
      expect(mockUninstall).not.toHaveBeenCalled();
    });

    it('uninstalls when confirmed', async () => {
      mockUninstall.mockResolvedValue(undefined);

      const result = await service.uninstall('user1', 'w1', { confirmed: true });

      expect(result.success).toBe(true);
      expect(mockEmit).toHaveBeenCalledWith(
        'marketplace.widget.uninstalled',
        expect.objectContaining({ widgetId: 'w1' }),
      );
      expect(mockUnregisterWidget).toHaveBeenCalledWith('w1');
    });

    it('leaves widget intact on cancel', async () => {
      const result = await service.uninstall('user1', 'w1', { confirmed: false });

      expect(result.success).toBe(false);
      expect(mockUnregisterWidget).not.toHaveBeenCalled();
      expect(mockUninstall).not.toHaveBeenCalled();
    });
  });

  describe('isInstalled', () => {
    it('returns true for installed widget', () => {
      mockRegistry['test-widget'] = {};
      expect(service.isInstalled('test-widget')).toBe(true);
    });

    it('returns false for uninstalled widget', () => {
      expect(service.isInstalled('nonexistent')).toBe(false);
    });
  });
});
