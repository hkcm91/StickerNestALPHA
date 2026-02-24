/**
 * Layout Mode Tests
 * @module canvas/core/layout
 */

import { describe, it, expect, beforeEach } from 'vitest';

import type { BoundingBox2D } from '@sn/types';

import type { ConstraintContext } from './layout-mode';

import {
  // Freeform
  freeformLayout,
  createFreeformLayout,
  findNearestSnap,
  // Bento
  bentoLayout,
  createBentoLayout,
  DEFAULT_BENTO_CONFIG,
  bentoPositionToCell,
  bentoCellToPosition,
  // Desktop
  desktopLayout,
  createDesktopLayout,
  getCascadedPosition,
  detectDockingZone,
  // Registry
  registerLayoutMode,
  getLayoutMode,
  hasLayoutMode,
  unregisterLayoutMode,
  getRegisteredLayoutModes,
  clearLayoutModes,
  initializeDefaultLayoutModes,
  getDefaultLayoutMode,
} from './index';

const createContext = (overrides: Partial<ConstraintContext> = {}): ConstraintContext => ({
  entityId: 'test-entity',
  currentBounds: { x: 0, y: 0, width: 100, height: 100 },
  viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
  ...overrides,
});

describe('Freeform Layout', () => {
  describe('applyMoveConstraints', () => {
    it('should return position unchanged without grid snapping', () => {
      const ctx = createContext();
      const result = freeformLayout.applyMoveConstraints({ x: 123, y: 456 }, ctx);

      expect(result.value).toEqual({ x: 123, y: 456 });
      expect(result.wasConstrained).toBe(false);
    });

    it('should snap to grid when enabled', () => {
      const ctx = createContext({
        gridConfig: { cellWidth: 50, cellHeight: 50, snapToGrid: true },
      });
      const result = freeformLayout.applyMoveConstraints({ x: 123, y: 178 }, ctx);

      expect(result.value).toEqual({ x: 100, y: 200 });
      expect(result.wasConstrained).toBe(true);
      expect(result.activeSnaps?.length).toBeGreaterThan(0);
    });

    it('should not snap when grid snapping disabled', () => {
      const ctx = createContext({
        gridConfig: { cellWidth: 50, cellHeight: 50, snapToGrid: false },
      });
      const result = freeformLayout.applyMoveConstraints({ x: 123, y: 178 }, ctx);

      expect(result.value).toEqual({ x: 123, y: 178 });
      expect(result.wasConstrained).toBe(false);
    });
  });

  describe('applyResizeConstraints', () => {
    it('should enforce minimum size', () => {
      const ctx = createContext();
      const result = freeformLayout.applyResizeConstraints({ width: 5, height: 5 }, ctx);

      expect(result.value.width).toBe(20);
      expect(result.value.height).toBe(20);
      expect(result.wasConstrained).toBe(true);
    });

    it('should allow valid sizes', () => {
      const ctx = createContext();
      const result = freeformLayout.applyResizeConstraints({ width: 200, height: 150 }, ctx);

      expect(result.value).toEqual({ width: 200, height: 150 });
      expect(result.wasConstrained).toBe(false);
    });
  });

  describe('getSnapPoints', () => {
    it('should return empty array without grid config', () => {
      const ctx = createContext();
      const points = freeformLayout.getSnapPoints!(ctx);

      expect(points).toEqual([]);
    });

    it('should return grid snap points when grid enabled', () => {
      const ctx = createContext({
        gridConfig: { cellWidth: 100, cellHeight: 100, snapToGrid: true },
      });
      const points = freeformLayout.getSnapPoints!(ctx);

      expect(points.length).toBeGreaterThan(0);
      expect(points.some(p => p.type === 'grid')).toBe(true);
    });

    it('should return entity snap points when other entities present', () => {
      const ctx = createContext({
        otherEntities: [{ x: 200, y: 200, width: 100, height: 100 }],
      });
      const points = freeformLayout.getSnapPoints!(ctx);

      expect(points.length).toBeGreaterThan(0);
      expect(points.some(p => p.type === 'edge')).toBe(true);
      expect(points.some(p => p.type === 'center')).toBe(true);
    });
  });

  describe('isValidPosition', () => {
    it('should always return true for freeform', () => {
      const ctx = createContext();
      expect(freeformLayout.isValidPosition!({ x: -1000, y: 5000 }, ctx)).toBe(true);
    });
  });

  describe('createFreeformLayout', () => {
    it('should create custom freeform layout', () => {
      const custom = createFreeformLayout({ minWidth: 50, minHeight: 50 });
      const ctx = createContext();
      const result = custom.applyResizeConstraints({ width: 30, height: 30 }, ctx);

      expect(result.value.width).toBe(50);
      expect(result.value.height).toBe(50);
    });
  });

  describe('findNearestSnap', () => {
    it('should find nearest snap point within threshold', () => {
      const snaps = [
        { value: 100, axis: 'x' as const, type: 'grid' as const },
        { value: 200, axis: 'x' as const, type: 'grid' as const },
      ];
      const nearest = findNearestSnap(105, 'x', snaps, 10);

      expect(nearest).not.toBeNull();
      expect(nearest!.value).toBe(100);
    });

    it('should return null if no snap within threshold', () => {
      const snaps = [
        { value: 100, axis: 'x' as const, type: 'grid' as const },
      ];
      const nearest = findNearestSnap(150, 'x', snaps, 10);

      expect(nearest).toBeNull();
    });

    it('should ignore snaps on different axis', () => {
      const snaps = [
        { value: 100, axis: 'y' as const, type: 'grid' as const },
      ];
      const nearest = findNearestSnap(100, 'x', snaps, 10);

      expect(nearest).toBeNull();
    });
  });
});

describe('Bento Layout', () => {
  describe('applyMoveConstraints', () => {
    it('should snap position to nearest cell', () => {
      const ctx = createContext();
      const result = bentoLayout.applyMoveConstraints({ x: 50, y: 75 }, ctx);

      // Should snap to cell (0, 0) with padding
      expect(result.value.x).toBe(DEFAULT_BENTO_CONFIG.padding);
      expect(result.value.y).toBe(DEFAULT_BENTO_CONFIG.padding);
      expect(result.wasConstrained).toBe(true);
    });

    it('should not report constraint when already aligned', () => {
      const ctx = createContext();
      const aligned = { x: DEFAULT_BENTO_CONFIG.padding, y: DEFAULT_BENTO_CONFIG.padding };
      const result = bentoLayout.applyMoveConstraints(aligned, ctx);

      expect(result.value).toEqual(aligned);
      expect(result.wasConstrained).toBe(false);
    });
  });

  describe('applyResizeConstraints', () => {
    it('should snap size to cell span', () => {
      const ctx = createContext();
      const result = bentoLayout.applyResizeConstraints({ width: 150, height: 175 }, ctx);

      // Should snap to 1x2 or 2x2 depending on rounding
      expect(result.wasConstrained).toBe(true);
      // Size should be a multiple of cell size + gaps
      expect(result.value.width % DEFAULT_BENTO_CONFIG.cellWidth).toBeLessThanOrEqual(
        DEFAULT_BENTO_CONFIG.gap * 2
      );
    });
  });

  describe('isValidPosition', () => {
    it('should return true for aligned position', () => {
      const ctx = createContext();
      const aligned = { x: DEFAULT_BENTO_CONFIG.padding, y: DEFAULT_BENTO_CONFIG.padding };

      expect(bentoLayout.isValidPosition!(aligned, ctx)).toBe(true);
    });

    it('should return false for unaligned position', () => {
      const ctx = createContext();

      expect(bentoLayout.isValidPosition!({ x: 17, y: 23 }, ctx)).toBe(false);
    });
  });

  describe('bentoPositionToCell', () => {
    it('should convert position to cell coordinates', () => {
      const cell = bentoPositionToCell({ x: 150, y: 250 }, DEFAULT_BENTO_CONFIG);

      expect(cell.col).toBeGreaterThanOrEqual(0);
      expect(cell.row).toBeGreaterThanOrEqual(0);
    });
  });

  describe('bentoCellToPosition', () => {
    it('should convert cell to canvas position', () => {
      const pos = bentoCellToPosition(0, 0, DEFAULT_BENTO_CONFIG);

      expect(pos.x).toBe(DEFAULT_BENTO_CONFIG.padding);
      expect(pos.y).toBe(DEFAULT_BENTO_CONFIG.padding);
    });

    it('should handle non-zero cells', () => {
      const pos = bentoCellToPosition(1, 1, DEFAULT_BENTO_CONFIG);
      const expected = {
        x: DEFAULT_BENTO_CONFIG.padding + DEFAULT_BENTO_CONFIG.cellWidth + DEFAULT_BENTO_CONFIG.gap,
        y: DEFAULT_BENTO_CONFIG.padding + DEFAULT_BENTO_CONFIG.cellHeight + DEFAULT_BENTO_CONFIG.gap,
      };

      expect(pos).toEqual(expected);
    });
  });

  describe('createBentoLayout', () => {
    it('should create custom bento layout', () => {
      const custom = createBentoLayout({ cellWidth: 50, cellHeight: 50, padding: 10 });
      const ctx = createContext();
      const result = custom.applyMoveConstraints({ x: 15, y: 15 }, ctx);

      // Should snap to custom grid
      expect(result.value.x).toBe(10); // padding
    });
  });
});

describe('Desktop Layout', () => {
  describe('applyMoveConstraints', () => {
    it('should snap to other entity edges', () => {
      const ctx = createContext({
        otherEntities: [{ x: 200, y: 100, width: 100, height: 100 }],
      });
      // Try to place near the left edge of other entity
      const result = desktopLayout.applyMoveConstraints({ x: 195, y: 50 }, ctx);

      expect(result.value.x).toBe(200);
      expect(result.wasConstrained).toBe(true);
    });

    it('should not snap without other entities', () => {
      const ctx = createContext();
      const result = desktopLayout.applyMoveConstraints({ x: 123, y: 456 }, ctx);

      expect(result.value).toEqual({ x: 123, y: 456 });
      expect(result.wasConstrained).toBe(false);
    });
  });

  describe('applyResizeConstraints', () => {
    it('should enforce minimum size', () => {
      const ctx = createContext();
      const result = desktopLayout.applyResizeConstraints({ width: 50, height: 50 }, ctx);

      expect(result.value.width).toBe(200);
      expect(result.value.height).toBe(150);
      expect(result.wasConstrained).toBe(true);
    });

    it('should enforce maximum size', () => {
      const ctx = createContext();
      const result = desktopLayout.applyResizeConstraints({ width: 2000, height: 1500 }, ctx);

      expect(result.value.width).toBe(1600);
      expect(result.value.height).toBe(1200);
      expect(result.wasConstrained).toBe(true);
    });
  });

  describe('getCascadedPosition', () => {
    it('should return base position for first window', () => {
      const pos = getCascadedPosition([]);

      expect(pos).toEqual({ x: 50, y: 50 });
    });

    it('should offset from last window', () => {
      const windows: BoundingBox2D[] = [
        { x: 50, y: 50, width: 200, height: 150 },
      ];
      const pos = getCascadedPosition(windows);

      expect(pos.x).toBe(80); // 50 + 30 (default offset)
      expect(pos.y).toBe(80);
    });
  });

  describe('detectDockingZone', () => {
    const viewport: BoundingBox2D = { x: 0, y: 0, width: 1000, height: 800 };

    it('should detect left zone', () => {
      const zone = detectDockingZone({ x: 10, y: 400 }, viewport, 50);
      expect(zone).toBe('left');
    });

    it('should detect right zone', () => {
      const zone = detectDockingZone({ x: 980, y: 400 }, viewport, 50);
      expect(zone).toBe('right');
    });

    it('should detect top zone', () => {
      const zone = detectDockingZone({ x: 500, y: 10 }, viewport, 50);
      expect(zone).toBe('top');
    });

    it('should detect bottom zone', () => {
      const zone = detectDockingZone({ x: 500, y: 780 }, viewport, 50);
      expect(zone).toBe('bottom');
    });

    it('should return none in center', () => {
      const zone = detectDockingZone({ x: 500, y: 400 }, viewport, 50);
      expect(zone).toBe('none');
    });
  });

  describe('createDesktopLayout', () => {
    it('should create custom desktop layout', () => {
      const custom = createDesktopLayout({ minWidth: 100, minHeight: 100 });
      const ctx = createContext();
      const result = custom.applyResizeConstraints({ width: 50, height: 50 }, ctx);

      expect(result.value.width).toBe(100);
      expect(result.value.height).toBe(100);
    });
  });
});

describe('Layout Registry', () => {
  beforeEach(() => {
    initializeDefaultLayoutModes();
  });

  describe('registerLayoutMode', () => {
    it('should register a new layout mode', () => {
      const customMode = {
        ...freeformLayout,
        name: 'custom',
        displayName: 'Custom',
      };

      registerLayoutMode(customMode);

      expect(hasLayoutMode('custom')).toBe(true);
    });

    it('should throw if mode already registered', () => {
      expect(() => registerLayoutMode(freeformLayout)).toThrow();
    });
  });

  describe('getLayoutMode', () => {
    it('should return registered mode', () => {
      const mode = getLayoutMode('freeform');

      expect(mode).toBeDefined();
      expect(mode!.name).toBe('freeform');
    });

    it('should return undefined for unknown mode', () => {
      const mode = getLayoutMode('nonexistent');

      expect(mode).toBeUndefined();
    });
  });

  describe('hasLayoutMode', () => {
    it('should return true for registered modes', () => {
      expect(hasLayoutMode('freeform')).toBe(true);
      expect(hasLayoutMode('bento')).toBe(true);
      expect(hasLayoutMode('desktop')).toBe(true);
    });

    it('should return false for unregistered modes', () => {
      expect(hasLayoutMode('unknown')).toBe(false);
    });
  });

  describe('unregisterLayoutMode', () => {
    it('should remove registered mode', () => {
      expect(hasLayoutMode('freeform')).toBe(true);
      unregisterLayoutMode('freeform');
      expect(hasLayoutMode('freeform')).toBe(false);
    });

    it('should return false for unregistered mode', () => {
      expect(unregisterLayoutMode('nonexistent')).toBe(false);
    });
  });

  describe('getRegisteredLayoutModes', () => {
    it('should return all mode names', () => {
      const modes = getRegisteredLayoutModes();

      expect(modes).toContain('freeform');
      expect(modes).toContain('bento');
      expect(modes).toContain('desktop');
    });
  });

  describe('clearLayoutModes', () => {
    it('should remove all modes', () => {
      clearLayoutModes();

      expect(getRegisteredLayoutModes()).toEqual([]);
    });
  });

  describe('getDefaultLayoutMode', () => {
    it('should return freeform', () => {
      const mode = getDefaultLayoutMode();

      expect(mode.name).toBe('freeform');
    });
  });

  describe('initializeDefaultLayoutModes', () => {
    it('should restore default modes after clear', () => {
      clearLayoutModes();
      expect(getRegisteredLayoutModes()).toEqual([]);

      initializeDefaultLayoutModes();

      expect(hasLayoutMode('freeform')).toBe(true);
      expect(hasLayoutMode('bento')).toBe(true);
      expect(hasLayoutMode('desktop')).toBe(true);
    });
  });
});
