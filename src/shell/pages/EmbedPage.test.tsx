/**
 * EmbedPage tests
 * @module shell/pages
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useUIStore } from '../../kernel/stores/ui/ui.store';

// Mock supabase client
vi.mock('../../kernel/supabase/client', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
    },
    __mockFrom: mockFrom,
  };
});

// Mock canvas core
vi.mock('../../canvas/core', () => ({
  initCanvasCore: vi.fn(() => ({
    sceneGraph: { addEntity: vi.fn(), entities: [] },
  })),
  teardownCanvasCore: vi.fn(),
}));

// Mock CanvasWorkspace and useSceneGraph
vi.mock('../canvas', () => ({
  CanvasWorkspace: ({ dashboardSlug }: { dashboardSlug: string }) => (
    <div data-testid="canvas-workspace">{dashboardSlug}</div>
  ),
  useSceneGraph: () => [],
}));

// Mock built-in widget HTML
vi.mock('../../runtime/widgets', () => ({
  BUILT_IN_WIDGET_HTML: {},
}));

import { supabase } from '../../kernel/supabase/client';

import { EmbedPage } from './EmbedPage';

function renderEmbedPage(slug = 'test-canvas') {
  return render(
    <MemoryRouter initialEntries={[`/embed/${slug}`]}>
      <Routes>
        <Route path="/embed/:slug" element={<EmbedPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EmbedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ theme: 'midnight-aurora' });
  });

  it('shows loading state initially', () => {
    // Make the query never resolve
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => new Promise(() => {}),
          }),
        }),
      }),
    });
    renderEmbedPage();
    expect(screen.getByTestId('embed-loading')).toBeTruthy();
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('shows not-found state when canvas does not exist', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      }),
    });
    renderEmbedPage('nonexistent');
    await waitFor(() => {
      expect(screen.getByTestId('embed-not-found')).toBeTruthy();
    });
    expect(screen.getByText('Canvas not found')).toBeTruthy();
  });

  it('sets canvas interaction mode to preview on mount', () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => new Promise(() => {}),
          }),
        }),
      }),
    });
    renderEmbedPage();
    expect(useUIStore.getState().canvasInteractionMode).toBe('preview');
  });

  it('renders canvas workspace when canvas is found', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'canvases') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'canvas-1',
                      name: 'Test Canvas',
                      slug: 'test-canvas',
                      metadata: {},
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      // entities table
      return {
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
    });

    renderEmbedPage('test-canvas');
    await waitFor(() => {
      expect(screen.getByTestId('embed-canvas')).toBeTruthy();
    });
    expect(screen.getByTestId('canvas-workspace')).toBeTruthy();
  });
});
