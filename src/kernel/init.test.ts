/**
 * Kernel Init — Test Suite
 * @module kernel/init
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock auth module
vi.mock('./auth', () => ({
  initAuthListener: vi.fn(() => ({ unsubscribe: vi.fn() })),
}));

// Mock all store setup functions
vi.mock('./stores/auth', () => ({
  setupAuthBusSubscriptions: vi.fn(),
  useAuthStore: { getState: vi.fn(() => ({ reset: vi.fn() })) },
}));
vi.mock('./stores/workspace', () => ({
  setupWorkspaceBusSubscriptions: vi.fn(),
}));
vi.mock('./stores/canvas', () => ({
  setupCanvasBusSubscriptions: vi.fn(),
}));
vi.mock('./stores/history', () => ({
  setupHistoryBusSubscriptions: vi.fn(),
}));
vi.mock('./stores/widget', () => ({
  setupWidgetBusSubscriptions: vi.fn(),
}));
vi.mock('./stores/social', () => ({
  setupSocialBusSubscriptions: vi.fn(),
}));
vi.mock('./stores/ui', () => ({
  setupUIBusSubscriptions: vi.fn(),
}));

const { initKernel, teardownKernel, isKernelInitialized } = await import('./init');
const { initAuthListener } = await import('./auth');
const { setupAuthBusSubscriptions } = await import('./stores/auth');
const { setupWorkspaceBusSubscriptions } = await import('./stores/workspace');
const { setupCanvasBusSubscriptions } = await import('./stores/canvas');
const { setupHistoryBusSubscriptions } = await import('./stores/history');
const { setupWidgetBusSubscriptions } = await import('./stores/widget');
const { setupSocialBusSubscriptions } = await import('./stores/social');
const { setupUIBusSubscriptions } = await import('./stores/ui');

describe('Kernel Init', () => {
  beforeEach(() => {
    teardownKernel();
    vi.clearAllMocks();
  });

  it('should not be initialized before initKernel is called', () => {
    expect(isKernelInitialized()).toBe(false);
  });

  it('should initialize all store bus subscriptions', () => {
    initKernel();

    expect(setupAuthBusSubscriptions).toHaveBeenCalledOnce();
    expect(setupWorkspaceBusSubscriptions).toHaveBeenCalledOnce();
    expect(setupCanvasBusSubscriptions).toHaveBeenCalledOnce();
    expect(setupHistoryBusSubscriptions).toHaveBeenCalledOnce();
    expect(setupWidgetBusSubscriptions).toHaveBeenCalledOnce();
    expect(setupSocialBusSubscriptions).toHaveBeenCalledOnce();
    expect(setupUIBusSubscriptions).toHaveBeenCalledOnce();
  });

  it('should initialize auth listener', () => {
    initKernel();

    expect(initAuthListener).toHaveBeenCalledOnce();
  });

  it('should mark kernel as initialized', () => {
    initKernel();

    expect(isKernelInitialized()).toBe(true);
  });

  it('should not re-initialize on second call', () => {
    initKernel();
    initKernel();

    expect(setupAuthBusSubscriptions).toHaveBeenCalledOnce();
    expect(initAuthListener).toHaveBeenCalledOnce();
  });

  it('should allow teardown and re-initialization', () => {
    initKernel();
    expect(isKernelInitialized()).toBe(true);

    teardownKernel();
    expect(isKernelInitialized()).toBe(false);

    initKernel();
    expect(isKernelInitialized()).toBe(true);
    expect(setupAuthBusSubscriptions).toHaveBeenCalledTimes(2);
  });
});
