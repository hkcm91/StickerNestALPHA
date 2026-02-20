/**
 * Ring Buffer — Test Suite
 * @module kernel/bus/ring-buffer
 */

import { describe, expect, it } from 'vitest';

import { createRingBuffer } from './ring-buffer';

describe('RingBuffer', () => {
  describe('creation', () => {
    it('should create a buffer with the specified capacity', () => {
      const buf = createRingBuffer<number>(10);
      expect(buf.capacity).toBe(10);
      expect(buf.size).toBe(0);
    });

    it('should throw if capacity is less than 1', () => {
      expect(() => createRingBuffer(0)).toThrow('capacity must be at least 1');
      expect(() => createRingBuffer(-5)).toThrow('capacity must be at least 1');
    });
  });

  describe('push and retrieve', () => {
    it('should push items and retrieve them in order', () => {
      const buf = createRingBuffer<number>(5);
      buf.push(1);
      buf.push(2);
      buf.push(3);

      expect(buf.getAll()).toEqual([1, 2, 3]);
      expect(buf.size).toBe(3);
    });

    it('should fill to capacity without overflow', () => {
      const buf = createRingBuffer<number>(3);
      buf.push(1);
      buf.push(2);
      buf.push(3);

      expect(buf.getAll()).toEqual([1, 2, 3]);
      expect(buf.size).toBe(3);
    });
  });

  describe('capacity overflow', () => {
    it('should overwrite oldest items when capacity is exceeded', () => {
      const buf = createRingBuffer<number>(3);
      buf.push(1);
      buf.push(2);
      buf.push(3);
      buf.push(4); // overwrites 1

      expect(buf.getAll()).toEqual([2, 3, 4]);
      expect(buf.size).toBe(3);
    });

    it('should handle multiple overflow wraps', () => {
      const buf = createRingBuffer<number>(3);
      for (let i = 1; i <= 10; i++) {
        buf.push(i);
      }

      expect(buf.getAll()).toEqual([8, 9, 10]);
      expect(buf.size).toBe(3);
    });
  });

  describe('getLast', () => {
    it('should return the last N items', () => {
      const buf = createRingBuffer<number>(10);
      buf.push(1);
      buf.push(2);
      buf.push(3);
      buf.push(4);
      buf.push(5);

      expect(buf.getLast(3)).toEqual([3, 4, 5]);
    });

    it('should return all items if N exceeds size', () => {
      const buf = createRingBuffer<number>(10);
      buf.push(1);
      buf.push(2);

      expect(buf.getLast(5)).toEqual([1, 2]);
    });

    it('should return empty array for getLast(0)', () => {
      const buf = createRingBuffer<number>(10);
      buf.push(1);

      expect(buf.getLast(0)).toEqual([]);
    });

    it('should work correctly after overflow', () => {
      const buf = createRingBuffer<number>(3);
      buf.push(1);
      buf.push(2);
      buf.push(3);
      buf.push(4);
      buf.push(5);

      expect(buf.getLast(2)).toEqual([4, 5]);
    });
  });

  describe('clear', () => {
    it('should reset size to 0', () => {
      const buf = createRingBuffer<number>(5);
      buf.push(1);
      buf.push(2);
      buf.push(3);

      buf.clear();

      expect(buf.size).toBe(0);
      expect(buf.getAll()).toEqual([]);
    });

    it('should allow pushing after clear', () => {
      const buf = createRingBuffer<number>(3);
      buf.push(1);
      buf.push(2);
      buf.clear();
      buf.push(10);

      expect(buf.getAll()).toEqual([10]);
      expect(buf.size).toBe(1);
    });
  });

  describe('empty buffer', () => {
    it('should return empty array from getAll on empty buffer', () => {
      const buf = createRingBuffer<number>(5);
      expect(buf.getAll()).toEqual([]);
    });

    it('should return empty array from getLast on empty buffer', () => {
      const buf = createRingBuffer<number>(5);
      expect(buf.getLast(3)).toEqual([]);
    });
  });

  describe('capacity of 1', () => {
    it('should work with capacity of 1', () => {
      const buf = createRingBuffer<string>(1);
      buf.push('a');
      expect(buf.getAll()).toEqual(['a']);

      buf.push('b');
      expect(buf.getAll()).toEqual(['b']);
      expect(buf.size).toBe(1);
    });
  });
});
