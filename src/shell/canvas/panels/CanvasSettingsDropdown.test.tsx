/**
 * CanvasSettingsDropdown component tests.
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
    // @ts-expect-error - Assigning to read-only property for test purposes
    ref.current = anchor;
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

      expect(screen.getByText('Background')).toBeTruthy();
      expect(screen.getByText('Canvas Size')).toBeTruthy();
      expect(screen.getByText('Canvas Position')).toBeTruthy();
      expect(screen.getByText('Border Radius')).toBeTruthy();
    });
  });

  describe('Background Type Selector', () => {
    it('renders three background type buttons', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      expect(screen.getByText('Solid')).toBeTruthy();
      expect(screen.getByText('Gradient')).toBeTruthy();
      expect(screen.getByText('Image')).toBeTruthy();
    });

    it('shows solid color controls by default', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      expect(screen.getByText('Color')).toBeTruthy();
    });

    it('switches to gradient controls when Gradient is clicked', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      fireEvent.click(screen.getByText('Gradient'));

      expect(screen.getByText('Type')).toBeTruthy();
      expect(screen.getByText('Linear')).toBeTruthy();
      expect(screen.getByText('Radial')).toBeTruthy();
      expect(screen.getByText('Color Stops')).toBeTruthy();
    });

    it('switches to image controls when Image is clicked', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      fireEvent.click(screen.getByText('Image'));

      expect(screen.getByText('Click to upload or drag image')).toBeTruthy();
    });
  });

  describe('Solid Background Controls', () => {
    it('renders color input with default white color', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      // There are two inputs: the hidden color picker and the text input
      const colorInputs = screen.getAllByDisplayValue('#ffffff');
      expect(colorInputs.length).toBeGreaterThanOrEqual(1);
    });

    it('emits background change when color is updated', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      // Get the text input (type="text", not the hidden color input)
      const colorInputs = screen.getAllByDisplayValue('#ffffff');
      const textInput = colorInputs.find((el) => el.getAttribute('type') === 'text');
      expect(textInput).toBeTruthy();
      fireEvent.change(textInput!, { target: { value: '#ff0000' } });

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasDocumentEvents.BACKGROUND_CHANGED,
        expect.objectContaining({
          background: expect.objectContaining({
            type: 'solid',
            color: '#ff0000',
          }),
        }),
      );
    });
  });

  describe('Gradient Controls', () => {
    it('shows gradient angle control for linear gradients', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      fireEvent.click(screen.getByText('Gradient'));

      expect(screen.getByText(/Angle:/)).toBeTruthy();
    });

    it('hides gradient angle control for radial gradients', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      fireEvent.click(screen.getByText('Gradient'));
      fireEvent.click(screen.getByText('Radial'));

      expect(screen.queryByText(/Angle:/)).toBeNull();
    });

    it('renders gradient stops with default values', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      fireEvent.click(screen.getByText('Gradient'));

      // Should have 2 default stops
      const stopInputs = screen.getAllByDisplayValue(/^#/);
      expect(stopInputs.length).toBeGreaterThanOrEqual(2);
    });

    it('can add a gradient stop', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      fireEvent.click(screen.getByText('Gradient'));
      fireEvent.click(screen.getByText('+ Add Color Stop'));

      // Should now have 3 stop color inputs
      const colorInputs = screen.getAllByDisplayValue(/^#/);
      expect(colorInputs.length).toBeGreaterThanOrEqual(3);
    });

    it('emits gradient background change', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      fireEvent.click(screen.getByText('Gradient'));

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasDocumentEvents.BACKGROUND_CHANGED,
        expect.objectContaining({
          background: expect.objectContaining({
            type: 'gradient',
            gradientType: 'linear',
            stops: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('Image Controls', () => {
    it('shows upload area when no image is set', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      fireEvent.click(screen.getByText('Image'));

      expect(screen.getByText('Click to upload or drag image')).toBeTruthy();
    });

    it('shows image mode buttons when viewportConfig has image background', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          viewportConfig={{
            background: {
              type: 'image',
              url: 'https://example.com/bg.jpg',
              mode: 'cover',
              opacity: 1,
            },
          }}
        />,
      );

      expect(screen.getByText('Display Mode')).toBeTruthy();
      expect(screen.getByText('Cover')).toBeTruthy();
      expect(screen.getByText('Contain')).toBeTruthy();
      expect(screen.getByText('Tile')).toBeTruthy();
    });
  });

  describe('Opacity Control', () => {
    it('renders opacity slider', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      expect(screen.getByText(/Opacity:/)).toBeTruthy();
    });

    it('shows opacity as percentage', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      expect(screen.getByText('Opacity: 100%')).toBeTruthy();
    });

    it('updates opacity when slider is changed', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      const opacityRange = screen.getByDisplayValue('1');
      fireEvent.change(opacityRange, { target: { value: '0.5' } });

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasDocumentEvents.BACKGROUND_CHANGED,
        expect.objectContaining({
          background: expect.objectContaining({
            opacity: 0.5,
          }),
        }),
      );
    });
  });

  describe('Canvas Size Controls', () => {
    it('renders preset selector', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      expect(screen.getByText('Preset')).toBeTruthy();
    });

    it('renders width and height inputs', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      expect(screen.getByText('Width')).toBeTruthy();
      expect(screen.getByText('Height')).toBeTruthy();
    });

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
            background: { type: 'solid', color: '#ffffff', opacity: 1 },
          }}
        />,
      );

      expect(screen.getByDisplayValue('1920')).toBeTruthy();
      expect(screen.getByDisplayValue('1080')).toBeTruthy();
    });

    it('emits viewport change when preset is selected', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      const presetSelect = screen
        .getAllByRole('combobox')
        .find((el) =>
          Array.from((el as HTMLSelectElement).options).some((opt) =>
            opt.value.includes('Desktop')
          )
        );
      expect(presetSelect).toBeTruthy();
      fireEvent.change(presetSelect!, { target: { value: 'Desktop (1920×1080)' } });

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasDocumentEvents.VIEWPORT_CHANGED,
        expect.objectContaining({
          viewport: { width: 1920, height: 1080 },
        }),
      );
    });

    it('emits viewport change when width is updated', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
        />,
      );

      const widthInputs = screen.getAllByPlaceholderText('Infinite');
      fireEvent.change(widthInputs[0], { target: { value: '800' } });

      expect(bus.emit).toHaveBeenCalledWith(
        CanvasDocumentEvents.VIEWPORT_CHANGED,
        expect.objectContaining({
          viewport: expect.objectContaining({ width: 800 }),
        }),
      );
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

      // Both range and number inputs show the value
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

      // Find the range input for border radius (it's the last one)
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

  describe('State Sync with viewportConfig', () => {
    it('syncs solid background from viewportConfig', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          viewportConfig={{
            background: {
              type: 'solid',
              color: '#ff0000',
              opacity: 0.8,
            },
          }}
        />,
      );

      // Both color picker and text input show the value
      const colorInputs = screen.getAllByDisplayValue('#ff0000');
      expect(colorInputs.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Opacity: 80%')).toBeTruthy();
    });

    it('syncs gradient background from viewportConfig', () => {
      const anchorRef = createAnchorRef();
      render(
        <CanvasSettingsDropdown
          isOpen={true}
          onClose={vi.fn()}
          anchorRef={anchorRef}
          viewportConfig={{
            background: {
              type: 'gradient',
              gradientType: 'radial',
              stops: [
                { offset: 0, color: '#ff0000' },
                { offset: 1, color: '#0000ff' },
              ],
              angle: 45,
              opacity: 1,
            },
          }}
        />,
      );

      // Should be in gradient mode
      expect(screen.getByText('Type')).toBeTruthy();
      // Radial should be selected (no angle control)
      expect(screen.queryByText(/Angle:/)).toBeNull();
    });
  });
});


