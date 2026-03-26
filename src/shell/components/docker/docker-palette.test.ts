/**
 * docker-palette — Tests
 * @module shell/components/docker
 */

import { describe, expect, it } from 'vitest';

import {
  palette,
  hexToRgb,
  HEX,
  MIN_WIDTH,
  MIN_HEIGHT,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DOCKED_WIDTH,
  SNAP_THRESHOLD,
  UNDOCK_DRAG_THRESHOLD,
  DOCK_TRANSITION,
  HOVER_TRANSITION,
  SPRING,
  STAGGER_MS,
  STORM_RGB,
  EMBER_RGB,
  GLASS_BG,
  GLASS_BLUR,
  GLASS_BORDER,
  GLASS_SHADOW,
  GLASS_INSET,
} from './docker-palette';

describe('docker-palette', () => {
  describe('hexToRgb', () => {
    it('converts storm hex to correct RGB tuple', () => {
      expect(hexToRgb('#4E7B8E')).toEqual([78, 123, 142]);
    });

    it('converts ember hex to correct RGB tuple', () => {
      expect(hexToRgb('#E8806C')).toEqual([232, 128, 108]);
    });

    it('converts black hex', () => {
      expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    });

    it('converts white hex', () => {
      expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
    });
  });

  describe('layout constants', () => {
    it('has MIN_WIDTH defined', () => {
      expect(MIN_WIDTH).toBe(220);
    });

    it('has MIN_HEIGHT defined', () => {
      expect(MIN_HEIGHT).toBe(160);
    });

    it('has DEFAULT_WIDTH defined', () => {
      expect(DEFAULT_WIDTH).toBe(320);
    });

    it('has DEFAULT_HEIGHT defined', () => {
      expect(DEFAULT_HEIGHT).toBe(400);
    });

    it('has DOCKED_WIDTH defined', () => {
      expect(DOCKED_WIDTH).toBe(320);
    });

    it('has SNAP_THRESHOLD defined', () => {
      expect(SNAP_THRESHOLD).toBe(60);
    });

    it('has UNDOCK_DRAG_THRESHOLD defined', () => {
      expect(UNDOCK_DRAG_THRESHOLD).toBe(8);
    });
  });

  describe('animation constants', () => {
    it('DOCK_TRANSITION contains spring bezier', () => {
      expect(DOCK_TRANSITION).toContain('cubic-bezier');
      expect(DOCK_TRANSITION).toContain('400ms');
    });

    it('HOVER_TRANSITION contains 200ms timing', () => {
      expect(HOVER_TRANSITION).toContain('200ms');
    });

    it('SPRING is a cubic-bezier string', () => {
      expect(SPRING).toContain('cubic-bezier');
    });

    it('STAGGER_MS is a number', () => {
      expect(typeof STAGGER_MS).toBe('number');
      expect(STAGGER_MS).toBe(70);
    });
  });

  describe('color constants', () => {
    it('STORM_RGB has correct values', () => {
      expect(STORM_RGB).toEqual({ r: 78, g: 123, b: 142 });
    });

    it('EMBER_RGB has correct values', () => {
      expect(EMBER_RGB).toEqual({ r: 232, g: 128, b: 108 });
    });

    it('HEX contains storm and ember', () => {
      expect(HEX.storm).toBe('#4E7B8E');
      expect(HEX.ember).toBe('#E8806C');
    });
  });

  describe('palette', () => {
    it('has storm color defined', () => {
      expect(palette.storm).toContain('--sn-storm');
    });

    it('has text color defined', () => {
      expect(palette.text).toContain('--sn-text');
    });

    it('has surface glass defined', () => {
      expect(palette.surfaceGlass).toContain('--sn-surface-glass');
    });
  });

  describe('glass surface styles', () => {
    it('GLASS_BG contains gradient and surface-glass var', () => {
      expect(GLASS_BG).toContain('linear-gradient');
      expect(GLASS_BG).toContain('--sn-surface-glass');
    });

    it('GLASS_BLUR contains blur and saturate', () => {
      expect(GLASS_BLUR).toContain('blur');
      expect(GLASS_BLUR).toContain('saturate');
    });

    it('GLASS_BORDER uses STORM_RGB values', () => {
      expect(GLASS_BORDER).toContain('78');
      expect(GLASS_BORDER).toContain('123');
      expect(GLASS_BORDER).toContain('142');
    });

    it('GLASS_SHADOW is a multi-part shadow string', () => {
      expect(GLASS_SHADOW).toContain('rgba');
      expect(GLASS_SHADOW).toContain('0 2px 8px');
      expect(GLASS_SHADOW).toContain('0 8px 32px');
    });

    it('GLASS_INSET contains inset', () => {
      expect(GLASS_INSET).toContain('inset');
    });
  });
});
