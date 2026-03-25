/**
 * CanvasPage integration tests
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUIStore } from '../../kernel/stores/ui/ui.store';

vi.mock('../../kernel/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() })),
    auth: { getSession: vi.fn(), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../../canvas/core', async () => {
  const actual = await vi.importActual<typeof import('../../canvas/core')>('../../canvas/core');

  return {
    ...actual,
    initCanvasCore: vi.fn(() => ({
      sceneGraph: {
        entityCount: 0,
        getEntitiesByZOrder: () => [],
      },
    })),
    teardownCanvasCore: vi.fn(),
  };
});

vi.mock('../../canvas/panels/init', () => ({
  initCanvasPanels: vi.fn(),
  teardownCanvasPanels: vi.fn(),
}));

vi.mock('../../canvas/tools', () => ({
  initCanvasTools: vi.fn(),
  teardownCanvasTools: vi.fn(),
}));

vi.mock('../canvas/seedDemoEntities', () => ({
  seedDemoEntities: vi.fn(),
  seedCommerceCanvas: vi.fn(),
  seedClaudeLabCanvas: vi.fn(),
}));

vi.mock('../../runtime', () => ({
  WidgetFrame: () => <div data-testid="widget-frame" />,
  InlineWidgetFrame: () => <div data-testid="inline-widget-frame" />,
}));

vi.mock('../../runtime/widgets', () => ({
  BUILT_IN_WIDGET_HTML: {},
  BUILT_IN_WIDGET_COMPONENTS: {},
}));

vi.mock('../layout', () => ({
  ShellLayout: (props: {
    topbar?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="shell-layout">
      {props.topbar}
      <div data-testid="shell-main">{props.children}</div>
    </div>
  ),
}));

vi.mock('../../kernel/stores/docker', async () => {
  const actual = await vi.importActual<typeof import('../../kernel/stores/docker')>(
    '../../kernel/stores/docker',
  );

  const mockStoreState = {
    dockers: {},
    addDocker: vi.fn(),
    updateDocker: vi.fn(),
    removeDocker: vi.fn(),
  };

  return {
    ...actual,
    useDockerStore: Object.assign(
      vi.fn(() => mockStoreState),
      { getState: () => mockStoreState },
    ),
  };
});

vi.mock('../canvas', async () => {
  const actual = await vi.importActual<typeof import('../canvas')>('../canvas');

  return {
    ...actual,
    CanvasWorkspace: (props: { background?: { type?: string } }) => (
      <div
        data-testid="canvas-workspace"
        data-bg-type={props.background?.type ?? 'none'}
        style={{ width: '100%', height: '100%' }}
      />
    ),
    useSceneGraph: vi.fn(() => []),
    usePersistence: vi.fn(() => ({
      status: 'saved' as const,
      lastSavedAt: null,
      save: vi.fn(),
      load: vi.fn(() => false),
    })),
  };
});

describe('CanvasPage', () => {
  beforeEach(() => {
    useUIStore.getState().reset();
    localStorage.clear();
  });

  it('applies preset size and border radius from canvas settings to workspace wrapper', async () => {
    const { CanvasPage } = await import('./pages');

    render(
      <MemoryRouter initialEntries={['/canvas/my-test-canvas']}>
        <Routes>
          <Route path="/canvas/:canvasSlug" element={<CanvasPage />} />
        </Routes>
      </MemoryRouter>,
    );

    if (screen.getByTestId('page-canvas').getAttribute('data-mode') !== 'edit') {
      fireEvent.click(screen.getByTestId('mode-toggle'));
    }

    fireEvent.click(screen.getByTestId('canvas-settings-btn'));

    const presetSelect = screen
      .getAllByRole('combobox')
      .find((el) =>
        Array.from((el as HTMLSelectElement).options).some((opt) =>
          opt.value.includes('Desktop')
        )
      ) as HTMLSelectElement;

    expect(presetSelect).toBeTruthy();
    fireEvent.change(presetSelect, { target: { value: 'Desktop HD (1920×1080)' } });

    const workspace = screen.getByTestId('canvas-workspace');
    const workspaceWrapper = workspace.parentElement as HTMLElement;

    await waitFor(() => {
      expect(workspaceWrapper.style.width).toBe('1920px');
      expect(workspaceWrapper.style.height).toBe('1080px');
    });

    const sliders = screen.getAllByRole('slider');
    const borderRadiusSlider = sliders[sliders.length - 1];
    fireEvent.change(borderRadiusSlider, { target: { value: '16' } });

    await waitFor(() => {
      expect(workspaceWrapper.style.borderRadius).toBe('16px');
    });
  });

  it('centers canvas by default and adds top spacing below navigation', async () => {
    const { CanvasPage } = await import('./pages');

    render(
      <MemoryRouter initialEntries={['/canvas/my-test-canvas']}>
        <Routes>
          <Route path="/canvas/:canvasSlug" element={<CanvasPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const workspace = screen.getByTestId('canvas-workspace');
    const workspaceWrapper = workspace.parentElement as HTMLElement;
    const layoutWrapper = workspaceWrapper.parentElement as HTMLElement;

    expect(layoutWrapper.style.justifyContent).toBe('center');
    expect(layoutWrapper.style.alignItems).toBe('center');
    expect(layoutWrapper.style.padding).toBe('40px 24px 24px');
  });

  it('seeds commerce demo canvas on /canvas/alice-art-shop when missing commerce widgets', async () => {
    const { CanvasPage } = await import('./pages');
    const { seedCommerceCanvas } = await import('../canvas/seedDemoEntities');

    render(
      <MemoryRouter initialEntries={['/canvas/alice-art-shop']}>
        <Routes>
          <Route path="/canvas/:canvasSlug" element={<CanvasPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(seedCommerceCanvas).toHaveBeenCalledTimes(1);
  });
});
