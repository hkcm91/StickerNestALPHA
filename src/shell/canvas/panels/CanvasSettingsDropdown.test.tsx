/**
 * CanvasSettingsDropdown component tests.
 * Background controls have moved to PropertiesPanel.
 *
 * @module shell/canvas/panels
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CanvasDocumentEvents } from '@sn/types';

import { bus } from '../../../kernel/bus';

import { CanvasSettingsDropdown } from './CanvasSettingsDropdown';

// Mock the bus
vi.mock('../../../kernel/bus', () => ({
  bus: {
    emit: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

describe('CanvasSettingsDropdown', () => {
  const createAnchorRef = () => {
    const ref = createRef<HTMLButtonElement>();
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    (ref as { current: HTMLButtonElement | null }).current = anchor;
    return ref;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={false}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      expect(screen.queryByTestId('canvas-settings-dropdown')).toBeNull();
    });

    it('renders dropdown when isOpen is true', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      expect(screen.getByTestId('canvas-settings-dropdown')).toBeTruthy();
    });

    it('renders all section titles', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      expect(screen.getByText('Canvas Size')).toBeTruthy();
      expect(screen.getByText('Canvas Position')).toBeTruthy();
      expect(screen.getByText('Border Radius')).toBeTruthy();
    });
  });

  describe('Canvas Size Controls', () => {
    it('shows current viewport dimensions', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          viewportConfig={{
            width: 1920,
            height: 1080,
            sizeMode: 'bounded',
            background: { type: 'solid', color: '#ffffff', opacity: 1 },
          }}
        />,
      );

      expect(screen.getByDisplayValue('1920')).toBeTruthy();
      expect(screen.getByDisplayValue('1080')).toBeTruthy();
    });
  });

  describe('Border Radius Control', () => {
    it('renders border radius slider', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      expect(screen.getByText('Border Radius')).toBeTruthy();
    });

    it('shows initial border radius value', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          borderRadius={12}
        />,
      );

      const inputs = screen.getAllByDisplayValue('12');
      expect(inputs.length).toBeGreaterThanOrEqual(1);
    });

    it('emits border radius change when slider is updated', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      const rangeInputs = screen.getAllByRole('slider');
      const borderRadiusSlider = rangeInputs[rangeInputs.length - 1];
      fireEvent.change(borderRadiusSlider, { target: { value: '16' } });

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasDocumentEvents.BORDER_RADIUS_CHANGED,
        expect.objectContaining({
          borderRadius: 16,
        }),
      );
    });
  });

  describe('Canvas Position Controls', () => {
    it('emits canvas position change when horizontal position is updated', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      const horizontalSelect = screen
        .getAllByRole('combobox')
        .find((el) =>
          Array.from((el as HTMLSelectElement).options).some((opt) =>
            opt.value === 'left' && opt.text === 'Left'
          )
        );
      expect(horizontalSelect).toBeTruthy();

      fireEvent.change(horizontalSelect!, { target: { value: 'left' } });

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasDocumentEvents.CANVAS_POSITION_CHANGED,
        expect.objectContaining({
          position: expect.objectContaining({ horizontal: 'left' }),
        }),
      );
    });

    it('emits canvas position change when top spacing is updated', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      const topSpacingSlider = screen
        .getAllByRole('slider')
        .find((el) => (el as HTMLInputElement).value === '40');
      expect(topSpacingSlider).toBeTruthy();
      fireEvent.change(topSpacingSlider as HTMLInputElement, { target: { value: '56' } });

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasDocumentEvents.CANVAS_POSITION_CHANGED,
        expect.objectContaining({
          position: expect.objectContaining({ topOffset: 56 }),
        }),
      );
    });
  });

  describe('Close Behavior', () => {
    it('calls onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={onClose}
          anchorRef={anchorRef}
        />,
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking outside', () => {
      const onClose = vi.fn();
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={onClose}
          anchorRef={anchorRef}
        />,
      );

      fireEvent.mouseDown(document.body);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside dropdown', () => {
      const onClose = vi.fn();
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={onClose}
          anchorRef={anchorRef}
        />,
      );

      fireEvent.mouseDown(screen.getByTestId('canvas-settings-dropdown'));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Canvas Info Section', () => {
    it('renders Canvas Info section when canvasName is provided', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          canvasName="My Canvas"
          canvasSlug="my-canvas"
        />,
      );

      expect(screen.getByTestId('canvas-info-section')).toBeTruthy();
      expect(screen.getByTestId('canvas-name-input')).toBeTruthy();
      expect((screen.getByTestId('canvas-name-input') as HTMLInputElement).value).toBe('My Canvas');
    });

    it('does not render Canvas Info section when canvasName is not provided', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      expect(screen.queryByTestId('canvas-info-section')).toBeNull();
    });

    it('calls onRename when name input is blurred with a new value', () => {
      const onRename = vi.fn();
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          canvasName="Old Name"
          canvasSlug="old-name"
          onRename={onRename}
        />,
      );

      const input = screen.getByTestId('canvas-name-input');
      fireEvent.change(input, { target: { value: 'New Name' } });
      fireEvent.blur(input);

      expect(onRename).toHaveBeenCalledWith('New Name');
    });

    it('does not call onRename when name has not changed', () => {
      const onRename = vi.fn();
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          canvasName="Same Name"
          canvasSlug="same-name"
          onRename={onRename}
        />,
      );

      const input = screen.getByTestId('canvas-name-input');
      fireEvent.blur(input);

      expect(onRename).not.toHaveBeenCalled();
    });

    it('renders visibility toggle with Private active by default', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          canvasName="Test"
          canvasSlug="test"
          isPublic={false}
        />,
      );

      expect(screen.getByTestId('visibility-private')).toBeTruthy();
      expect(screen.getByTestId('visibility-public')).toBeTruthy();
    });

    it('calls onVisibilityChange when Public button is clicked', () => {
      const onVisibilityChange = vi.fn();
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          canvasName="Test"
          canvasSlug="test"
          isPublic={false}
          onVisibilityChange={onVisibilityChange}
        />,
      );

      fireEvent.click(screen.getByTestId('visibility-public'));
      expect(onVisibilityChange).toHaveBeenCalledWith(true);
    });

    it('shows slug input only when isPublic is true', () => {
      const anchorRef = createAnchorRef();
      const { rerender } = render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          canvasName="Test"
          canvasSlug="test"
          isPublic={false}
        />,
      );

      expect(screen.queryByTestId('canvas-slug-input')).toBeNull();

      rerender(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          canvasName="Test"
          canvasSlug="test"
          isPublic={true}
        />,
      );

      expect(screen.getByTestId('canvas-slug-input')).toBeTruthy();
    });

    it('calls onSlugChange when slug input is blurred with valid new value', () => {
      const onSlugChange = vi.fn();
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          canvasName="Test"
          canvasSlug="old-slug"
          isPublic={true}
          onSlugChange={onSlugChange}
        />,
      );

      const input = screen.getByTestId('canvas-slug-input');
      fireEvent.change(input, { target: { value: 'new-slug' } });
      fireEvent.blur(input);

      expect(onSlugChange).toHaveBeenCalledWith('new-slug');
    });

    it('shows slug error for too-short slug', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          canvasName="Test"
          canvasSlug="ab"
          isPublic={true}
        />,
      );

      const input = screen.getByTestId('canvas-slug-input');
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.blur(input);

      expect(screen.getByTestId('slug-error')).toBeTruthy();
    });
  });
});
