/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createViewport } from '../viewport/viewport';
import type { ViewportState } from '../viewport/viewport';

import { createSpacePanController } from './space-pan';

// Mock DOM element for the target
type MockHandler = (event: unknown) => void;

function createMockElement() {
  const listeners = new Map<string, Set<MockHandler>>();

  return {
    addEventListener(type: string, handler: MockHandler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(handler);
    },
    removeEventListener(type: string, handler: MockHandler) {
      listeners.get(type)?.delete(handler);
    },
    dispatch(type: string, event: Partial<PointerEvent>) {
      const full = { preventDefault: () => {}, stopPropagation: () => {}, ...event };
      const handlers = listeners.get(type);
      if (handlers) {
        for (const h of handlers) h(full);
      }
    },
  };
}

describe('SpacePanController', () => {
  let vp: ViewportState;
  let target: ReturnType<typeof createMockElement>;

  beforeEach(() => {
    vp = createViewport(1920, 1080);
    target = createMockElement();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is not active by default', () => {
    const ctrl = createSpacePanController({
      target: target as any,
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
    });

    expect(ctrl.isActive()).toBe(false);
  });

  it('activates on Space keydown', () => {
    const ctrl = createSpacePanController({
      target: target as any,
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
    });
    ctrl.attach();

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(ctrl.isActive()).toBe(true);

    ctrl.detach();
  });

  it('deactivates on Space keyup', () => {
    const ctrl = createSpacePanController({
      target: target as any,
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
    });
    ctrl.attach();

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(ctrl.isActive()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    expect(ctrl.isActive()).toBe(false);

    ctrl.detach();
  });

  it('pans viewport on pointer drag while Space held', () => {
    const ctrl = createSpacePanController({
      target: target as any,
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
    });
    ctrl.attach();

    // Activate space pan
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

    // Start drag
    target.dispatch('pointerdown', { clientX: 100, clientY: 100 });

    // Move 50px right, 30px down at zoom=1 → offset delta (+50, +30)
    target.dispatch('pointermove', { clientX: 150, clientY: 130 });

    expect(vp.offset.x).toBeCloseTo(50, 1);
    expect(vp.offset.y).toBeCloseTo(30, 1);

    ctrl.detach();
  });

  it('scales pan delta by zoom level', () => {
    vp = { ...vp, zoom: 2 };
    const ctrl = createSpacePanController({
      target: target as any,
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
    });
    ctrl.attach();

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    target.dispatch('pointerdown', { clientX: 100, clientY: 100 });
    target.dispatch('pointermove', { clientX: 200, clientY: 100 });

    // 100px screen delta / zoom 2 = 50 canvas offset
    expect(vp.offset.x).toBeCloseTo(50, 1);

    ctrl.detach();
  });

  it('does not pan when Space is not held', () => {
    const ctrl = createSpacePanController({
      target: target as any,
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
    });
    ctrl.attach();

    target.dispatch('pointerdown', { clientX: 100, clientY: 100 });
    target.dispatch('pointermove', { clientX: 200, clientY: 200 });

    expect(vp.offset.x).toBe(0);
    expect(vp.offset.y).toBe(0);

    ctrl.detach();
  });

  it('ignores Space when an input is focused', () => {
    const ctrl = createSpacePanController({
      target: target as any,
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
    });
    ctrl.attach();

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', { code: 'Space' });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);

    expect(ctrl.isActive()).toBe(false);

    document.body.removeChild(input);
    ctrl.detach();
  });

  it('detach cleans up and deactivates', () => {
    const ctrl = createSpacePanController({
      target: target as any,
      getViewport: () => vp,
      setViewport: (next) => { vp = next; },
    });
    ctrl.attach();

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(ctrl.isActive()).toBe(true);

    ctrl.detach();
    expect(ctrl.isActive()).toBe(false);
  });
});
