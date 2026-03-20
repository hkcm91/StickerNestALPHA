/**
 * 2D ↔ 3D projection tests
 * @module canvas/core/transforms/syncTransform.test
 */

import { describe, it, expect } from 'vitest';

import type { Transform2D, Transform3D } from '@sn/types';

import { project2Dto3D, project3Dto2D } from './syncTransform';

describe('project2Dto3D', () => {
  it('projects origin correctly', () => {
    const t2d: Transform2D = {
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      rotation: 0,
      scale: 1,
    };
    const t3d = project2Dto3D(t2d);
    expect(t3d.position.x).toBeCloseTo(0);
    expect(t3d.position.y).toBeCloseTo(0);
    expect(t3d.position.z).toBeCloseTo(0);
    expect(t3d.scale).toEqual({ x: 1, y: 1, z: 1 });
  });

  it('maps 2D position to 3D x and -z', () => {
    const t2d: Transform2D = {
      position: { x: 200, y: 300 },
      size: { width: 100, height: 100 },
      rotation: 0,
      scale: 1,
    };
    const t3d = project2Dto3D(t2d);
    expect(t3d.position.x).toBe(2);
    expect(t3d.position.z).toBe(-3);
    expect(t3d.position.y).toBe(0);
  });

  it('uses identity quaternion for rotation', () => {
    const t2d: Transform2D = {
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      rotation: 45,
      scale: 1,
    };
    const t3d = project2Dto3D(t2d);
    expect(t3d.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });
});

describe('project3Dto2D', () => {
  it('projects origin correctly', () => {
    const t3d: Transform3D = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    };
    const t2d = project3Dto2D(t3d);
    expect(t2d.position.x).toBeCloseTo(0);
    expect(t2d.position.y).toBeCloseTo(0);
    expect(t2d.size).toEqual({ width: 100, height: 100 });
  });

  it('maps 3D position back to 2D', () => {
    const t3d: Transform3D = {
      position: { x: 2, y: 0.5, z: -3 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    };
    const t2d = project3Dto2D(t3d);
    expect(t2d.position.x).toBe(200);
    expect(t2d.position.y).toBe(300); // -(-3) * 100
  });

  it('round-trips 2D → 3D → 2D preserving position', () => {
    const original: Transform2D = {
      position: { x: 150, y: 250 },
      size: { width: 200, height: 300 },
      rotation: 0,
      scale: 1,
    };
    const t3d = project2Dto3D(original);
    const roundTripped = project3Dto2D(t3d);
    expect(roundTripped.position.x).toBeCloseTo(original.position.x);
    expect(roundTripped.position.y).toBeCloseTo(original.position.y);
    expect(roundTripped.size.width).toBeCloseTo(original.size.width);
    expect(roundTripped.size.height).toBeCloseTo(original.size.height);
  });
});
