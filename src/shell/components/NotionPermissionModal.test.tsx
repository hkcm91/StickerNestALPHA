/**
 * NotionPermissionModal — Tests
 * @module shell/components
 */

import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Collect bus subscribe handlers
const busHandlers: Record<string, ((event: unknown) => void)[]> = {};
const mockEmit = vi.fn();
const mockSubscribe = vi.fn((eventType: string, handler: (event: unknown) => void) => {
  if (!busHandlers[eventType]) busHandlers[eventType] = [];
  busHandlers[eventType].push(handler);
  return vi.fn();
});

vi.mock('../../kernel/bus', () => ({
  bus: {
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
    emit: (...args: unknown[]) => mockEmit(...args),
  },
}));

vi.mock('../../kernel/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { success: true, data: { results: [] } }, error: null })),
    },
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'integration-1' } })),
          })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

import { NotionPermissionModal } from './NotionPermissionModal';

describe('NotionPermissionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(busHandlers).forEach((key) => delete busHandlers[key]);
  });

  it('renders nothing when no permission request is active', () => {
    const { container } = render(<NotionPermissionModal />);
    expect(container.innerHTML).toBe('');
  });

  it('subscribes to widget.notion.permissionRequired on mount', () => {
    render(<NotionPermissionModal />);
    expect(mockSubscribe).toHaveBeenCalledWith(
      'widget.notion.permissionRequired',
      expect.any(Function),
    );
  });

  it('shows modal when permission request event fires', () => {
    render(<NotionPermissionModal />);

    const handler = busHandlers['widget.notion.permissionRequired']?.[0];
    if (handler) {
      act(() => {
        handler({
          payload: {
            widgetId: 'w-1',
            widgetName: 'My Widget',
            instanceId: 'inst-1',
          },
        });
      });
      expect(screen.getByTestId('notion-permission-modal')).toBeTruthy();
      expect(screen.getByText('Notion Access')).toBeTruthy();
      expect(screen.getByText(/My Widget/)).toBeTruthy();
    }
  });

  it('shows loading state for databases', () => {
    render(<NotionPermissionModal />);

    const handler = busHandlers['widget.notion.permissionRequired']?.[0];
    if (handler) {
      act(() => {
        handler({
          payload: {
            widgetId: 'w-1',
            widgetName: 'Test',
            instanceId: 'inst-1',
          },
        });
      });
      expect(screen.getByText('Loading databases...')).toBeTruthy();
    }
  });

  it('emits permissionDenied when Deny is clicked', () => {
    render(<NotionPermissionModal />);

    const handler = busHandlers['widget.notion.permissionRequired']?.[0];
    if (handler) {
      act(() => {
        handler({
          payload: {
            widgetId: 'w-1',
            widgetName: 'Test',
            instanceId: 'inst-1',
          },
        });
      });

      act(() => {
        screen.getByText('Deny').click();
      });

      expect(mockEmit).toHaveBeenCalledWith('widget.notion.permissionDenied', {
        widgetId: 'w-1',
        instanceId: 'inst-1',
      });
    }
  });

  it('hides modal after Deny is clicked', () => {
    render(<NotionPermissionModal />);

    const handler = busHandlers['widget.notion.permissionRequired']?.[0];
    if (handler) {
      act(() => {
        handler({
          payload: {
            widgetId: 'w-1',
            widgetName: 'Test',
            instanceId: 'inst-1',
          },
        });
      });

      act(() => {
        screen.getByText('Deny').click();
      });

      expect(screen.queryByTestId('notion-permission-modal')).toBeNull();
    }
  });
});
