/**
 * Pathfinder Widget - Test Suite
 *
 * Tests for the Pathfinder widget component, schema, and events.
 *
 * @module runtime/widgets/pathfinder
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import { PATHFINDER_EVENTS } from './pathfinder.events';
import {
  pathfinderConfigSchema,
  pathfinderDefaultConfig,
} from './pathfinder.schema';
import { PathfinderWidget, pathfinderManifest } from './pathfinder.widget';

// Mock the hooks
vi.mock('../../hooks', () => ({
  useEmit: vi.fn(() => vi.fn()),
  useSubscribe: vi.fn(),
  useWidgetState: vi.fn(() => [{}, vi.fn()]),
}));

describe('Pathfinder Widget', () => {
  const defaultProps = {
    instanceId: 'test-instance-123',
    config: pathfinderDefaultConfig,
    theme: {
      '--sn-bg': '#ffffff',
      '--sn-surface': '#f9fafb',
      '--sn-accent': '#3b82f6',
      '--sn-text': '#111827',
      '--sn-text-muted': '#6b7280',
      '--sn-border': '#e5e7eb',
      '--sn-radius': '8px',
      '--sn-font-family': 'system-ui',
    },
    viewport: { width: 300, height: 200 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the widget', async () => {
      render(<PathfinderWidget {...defaultProps} />);

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('pathfinder-widget')).toBeInTheDocument();
      });
    });

    it('should display the widget title', async () => {
      render(<PathfinderWidget {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Pathfinder')).toBeInTheDocument();
      });
    });

    it('should show pathfinder operation buttons', async () => {
      render(<PathfinderWidget {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('Union')).toBeInTheDocument();
        expect(screen.getByTitle('Subtract')).toBeInTheDocument();
        expect(screen.getByTitle('Intersect')).toBeInTheDocument();
        expect(screen.getByTitle('Exclude')).toBeInTheDocument();
        expect(screen.getByTitle('Divide')).toBeInTheDocument();
      });
    });
  });

  describe('Manifest', () => {
    it('should have required manifest fields', () => {
      expect(pathfinderManifest.id).toBe('sn.builtin.pathfinder');
      expect(pathfinderManifest.name).toBe('Pathfinder');
      expect(pathfinderManifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(pathfinderManifest.category).toBe('utilities');
    });

    it('should declare emit events', () => {
      expect(pathfinderManifest.events.emits).toContain(PATHFINDER_EVENTS.emits.READY);
      expect(pathfinderManifest.events.emits).toContain(PATHFINDER_EVENTS.emits.UNION);
    });
  });
});

describe('Pathfinder Config Schema', () => {
  describe('Validation', () => {
    it('should accept valid config', () => {
      const validConfig = {
        title: 'My Widget',
        accentColor: '#ff5500',
        showDebugInfo: true,
        refreshInterval: 60,
      };

      const result = pathfinderConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });
  });
});

describe('Pathfinder Events', () => {
  it('should have consistent event naming', () => {
    const allEvents = [
      ...Object.values(PATHFINDER_EVENTS.emits),
      ...Object.values(PATHFINDER_EVENTS.subscribes),
    ];

    allEvents.forEach((event) => {
      // Allow canvas.* and widget.pathfinder.*
      expect(event).toMatch(/^(widget\.pathfinder\.|canvas\.).+$/);
    });
  });
});
