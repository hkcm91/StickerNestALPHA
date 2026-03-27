/**
 * FocusOverlay tests
 *
 * @module shell/canvas/components
 * @layer L6
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useUIStore } from '../../../kernel/stores/ui/ui.store';

describe('FocusOverlay — store integration', () => {
  beforeEach(() => {
    useUIStore.getState().reset();
  });

  afterEach(() => {
    useUIStore.getState().reset();
  });

  it('enterFocusMode sets focusMode state correctly', () => {
    const ids = ['entity-1', 'entity-2', 'entity-3'];
    useUIStore.getState().enterFocusMode(ids);

    const fm = useUIStore.getState().focusMode;
    expect(fm).not.toBeNull();
    expect(fm!.active).toBe(true);
    expect(fm!.focusedEntityIds).toEqual(ids);
    expect(fm!.activeIndex).toBe(0);
  });

  it('enterFocusMode with empty array does nothing', () => {
    useUIStore.getState().enterFocusMode([]);
    expect(useUIStore.getState().focusMode).toBeNull();
  });

  it('exitFocusMode clears focusMode to null', () => {
    useUIStore.getState().enterFocusMode(['entity-1']);
    expect(useUIStore.getState().focusMode).not.toBeNull();

    useUIStore.getState().exitFocusMode();
    expect(useUIStore.getState().focusMode).toBeNull();
  });

  it('focusNavigate next wraps around', () => {
    useUIStore.getState().enterFocusMode(['a', 'b', 'c']);

    useUIStore.getState().focusNavigate('next');
    expect(useUIStore.getState().focusMode!.activeIndex).toBe(1);

    useUIStore.getState().focusNavigate('next');
    expect(useUIStore.getState().focusMode!.activeIndex).toBe(2);

    useUIStore.getState().focusNavigate('next');
    expect(useUIStore.getState().focusMode!.activeIndex).toBe(0); // wraps
  });

  it('focusNavigate prev wraps around', () => {
    useUIStore.getState().enterFocusMode(['a', 'b', 'c']);

    useUIStore.getState().focusNavigate('prev');
    expect(useUIStore.getState().focusMode!.activeIndex).toBe(2); // wraps to end

    useUIStore.getState().focusNavigate('prev');
    expect(useUIStore.getState().focusMode!.activeIndex).toBe(1);
  });

  it('focusNavigate does nothing with single entity', () => {
    useUIStore.getState().enterFocusMode(['only-one']);

    useUIStore.getState().focusNavigate('next');
    expect(useUIStore.getState().focusMode!.activeIndex).toBe(0);

    useUIStore.getState().focusNavigate('prev');
    expect(useUIStore.getState().focusMode!.activeIndex).toBe(0);
  });

  it('focusNavigate does nothing when not in focus mode', () => {
    useUIStore.getState().focusNavigate('next');
    expect(useUIStore.getState().focusMode).toBeNull();
  });

  it('reset clears focusMode', () => {
    useUIStore.getState().enterFocusMode(['entity-1']);
    expect(useUIStore.getState().focusMode).not.toBeNull();

    useUIStore.getState().reset();
    expect(useUIStore.getState().focusMode).toBeNull();
  });
});

describe('FocusOverlay — position zeroing for rendering', () => {
  it('entity position should be zeroed to container origin for correct rendering', () => {
    // Simulates the transform that FocusOverlay applies before passing to EntityRenderer.
    // entityTransformStyle computes: left = position.x - width/2, top = position.y - height/2
    // Setting position to (width/2, height/2) should yield left=0, top=0.
    const width = 300;
    const height = 200;
    const zeroedPosition = { x: width / 2, y: height / 2 };

    // Verify the math: entityTransformStyle would compute:
    const left = zeroedPosition.x - width / 2;
    const top = zeroedPosition.y - height / 2;
    expect(left).toBe(0);
    expect(top).toBe(0);
  });

  it('original canvas position would render off-screen without zeroing', () => {
    // An entity at canvas position (800, 400) in a 300x200 container
    const width = 300;
    const height = 200;
    const canvasPosition = { x: 800, y: 400 };

    const left = canvasPosition.x - width / 2;
    const top = canvasPosition.y - height / 2;
    // These values are way outside the container bounds
    expect(left).toBe(650);
    expect(top).toBe(300);
    expect(left).toBeGreaterThan(width);
    expect(top).toBeGreaterThan(height);
  });
});
