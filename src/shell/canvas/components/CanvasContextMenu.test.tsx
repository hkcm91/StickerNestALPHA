/**
 * CanvasContextMenu component tests.
 *
 * @module shell/canvas/components
 */

import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { bus } from '../../../kernel/bus';

import { CanvasContextMenu } from './CanvasContextMenu';

describe('CanvasContextMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing by default', () => {
    render(
      <CanvasContextMenu selectedIds={new Set()} interactionMode="edit" />,
    );
    expect(screen.queryByTestId('canvas-context-menu')).toBeNull();
  });

  it('appears when context menu bus event is emitted in edit mode', () => {
    render(
      <CanvasContextMenu selectedIds={new Set()} interactionMode="edit" />,
    );

    act(() => {
      bus.emit('canvas.contextmenu.requested', { x: 100, y: 200 });
    });

    expect(screen.getByTestId('canvas-context-menu')).toBeTruthy();
  });

  it('does not appear in preview mode', () => {
    render(
      <CanvasContextMenu selectedIds={new Set()} interactionMode="preview" />,
    );

    act(() => {
      bus.emit('canvas.contextmenu.requested', { x: 100, y: 200 });
    });

    expect(screen.queryByTestId('canvas-context-menu')).toBeNull();
  });

  it('shows canvas menu (paste, select all) when no entity selected', () => {
    render(
      <CanvasContextMenu selectedIds={new Set()} interactionMode="edit" />,
    );

    act(() => {
      bus.emit('canvas.contextmenu.requested', { x: 100, y: 200 });
    });

    expect(screen.getByTestId('context-menu-item-paste')).toBeTruthy();
    expect(screen.getByTestId('context-menu-item-selectAll')).toBeTruthy();
    // Should not show entity-specific items
    expect(screen.queryByTestId('context-menu-item-delete')).toBeNull();
  });

  it('shows entity menu when entity is targeted', () => {
    render(
      <CanvasContextMenu
        selectedIds={new Set(['entity-1'])}
        interactionMode="edit"
      />,
    );

    act(() => {
      bus.emit('canvas.contextmenu.requested', {
        x: 100,
        y: 200,
        entityId: 'entity-1',
      });
    });

    expect(screen.getByTestId('context-menu-item-cut')).toBeTruthy();
    expect(screen.getByTestId('context-menu-item-copy')).toBeTruthy();
    expect(screen.getByTestId('context-menu-item-duplicate')).toBeTruthy();
    expect(screen.getByTestId('context-menu-item-delete')).toBeTruthy();
  });

  it('shows group option when multiple entities are selected', () => {
    render(
      <CanvasContextMenu
        selectedIds={new Set(['a', 'b'])}
        interactionMode="edit"
      />,
    );

    act(() => {
      bus.emit('canvas.contextmenu.requested', {
        x: 100,
        y: 200,
        entityId: 'a',
      });
    });

    expect(screen.getByTestId('context-menu-item-group')).toBeTruthy();
  });

  it('closes on Escape key', () => {
    render(
      <CanvasContextMenu selectedIds={new Set()} interactionMode="edit" />,
    );

    act(() => {
      bus.emit('canvas.contextmenu.requested', { x: 100, y: 200 });
    });

    expect(screen.getByTestId('canvas-context-menu')).toBeTruthy();

    // Advance past the setTimeout(10ms) that registers listeners
    act(() => {
      vi.advanceTimersByTime(20);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(screen.queryByTestId('canvas-context-menu')).toBeNull();
  });

  it('shows "Send to friend" for widget entities', () => {
    const getEntityInfo = (id: string) => ({
      id,
      type: 'widget',
      widgetId: 'test-widget-123',
    });

    render(
      <CanvasContextMenu
        selectedIds={new Set(['widget-entity-1'])}
        interactionMode="edit"
        getEntityInfo={getEntityInfo}
      />,
    );

    act(() => {
      bus.emit('canvas.contextmenu.requested', {
        x: 100,
        y: 200,
        entityId: 'widget-entity-1',
      });
    });

    expect(screen.getByTestId('context-menu-item-sendToFriend')).toBeTruthy();
  });

  it('does not show "Send to friend" for non-widget entities', () => {
    const getEntityInfo = (id: string) => ({
      id,
      type: 'sticker',
    });

    render(
      <CanvasContextMenu
        selectedIds={new Set(['sticker-entity-1'])}
        interactionMode="edit"
        getEntityInfo={getEntityInfo}
      />,
    );

    act(() => {
      bus.emit('canvas.contextmenu.requested', {
        x: 100,
        y: 200,
        entityId: 'sticker-entity-1',
      });
    });

    expect(screen.queryByTestId('context-menu-item-sendToFriend')).toBeNull();
  });

  it('emits bus event when "Send to friend" is clicked', () => {
    const emitSpy = vi.spyOn(bus, 'emit');
    const getEntityInfo = (id: string) => ({
      id,
      type: 'widget',
      widgetId: 'test-widget-123',
    });

    render(
      <CanvasContextMenu
        selectedIds={new Set(['widget-entity-1'])}
        interactionMode="edit"
        getEntityInfo={getEntityInfo}
      />,
    );

    act(() => {
      bus.emit('canvas.contextmenu.requested', {
        x: 100,
        y: 200,
        entityId: 'widget-entity-1',
      });
    });

    // Advance past the setTimeout(10ms)
    act(() => {
      vi.advanceTimersByTime(20);
    });

    const sendItem = screen.getByTestId('context-menu-item-sendToFriend');
    act(() => {
      sendItem.click();
    });

    expect(emitSpy).toHaveBeenCalledWith('shell.sendWidget.requested', {
      widgetId: 'test-widget-123',
      entityId: 'widget-entity-1',
    });

    emitSpy.mockRestore();
  });

  it('uses glass surface styling with backdrop blur', () => {
    render(
      <CanvasContextMenu selectedIds={new Set()} interactionMode="edit" />,
    );

    act(() => {
      bus.emit('canvas.contextmenu.requested', { x: 50, y: 75 });
    });

    const menu = screen.getByTestId('canvas-context-menu');
    // Menu should have the sn-menu-in animation
    expect(menu.style.animation).toContain('sn-menu-in');
  });
});
