/**
 * Pathfinder-Tool Module - Test Suite
 *
 * @module canvas-tools/pathfinder-tool
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Tool } from '../registry';

import { createPathfinderTool } from './pathfinder-tool';

describe('Pathfinder-Tool', () => {
  let tool: Tool;
  const mockSceneGraph = {
    getEntity: vi.fn(),
  } as any;
  const mockGetMode = vi.fn(() => 'edit' as const);

  beforeEach(() => {
    tool = createPathfinderTool(mockSceneGraph, mockGetMode);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create an instance', () => {
      expect(tool).toBeDefined();
      expect(tool.name).toBe('pathfinder');
    });
  });
});
