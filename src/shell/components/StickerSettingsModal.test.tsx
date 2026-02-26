/**
 * StickerSettingsModal component tests.
 *
 * @module shell/components
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StickerSettingsModal } from './StickerSettingsModal';

// Mock the widgetStore
vi.mock('../../kernel/stores/widget', () => ({
  useWidgetStore: vi.fn((selector) => {
    const mockState = {
      registry: {
        'widget-1': {
          widgetId: 'widget-1',
          manifest: { name: 'Test Widget', version: '1.0.0' },
          htmlContent: '',
          isBuiltIn: true,
          installedAt: '2024-01-01',
        },
        'widget-2': {
          widgetId: 'widget-2',
          manifest: { name: 'Custom Widget', version: '1.0.0' },
          htmlContent: '',
          isBuiltIn: false,
          installedAt: '2024-01-01',
        },
      },
    };
    return selector(mockState);
  }),
}));

describe('StickerSettingsModal', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <StickerSettingsModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByText('Sticker Settings')).toBeNull();
  });

  it('renders modal with title when isOpen is true', () => {
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Sticker Settings')).toBeTruthy();
  });

  it('displays all form fields', () => {
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Alt Text/i)).toBeTruthy();
    expect(screen.getByLabelText(/Hover Effect/i)).toBeTruthy();
    expect(screen.getByLabelText(/Lock aspect ratio/i)).toBeTruthy();
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with settings when form is submitted', () => {
    const onConfirm = vi.fn();
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    // Fill in alt text
    const altTextInput = screen.getByLabelText(/Alt Text/i);
    fireEvent.change(altTextInput, { target: { value: 'Test sticker' } });

    // Select hover effect
    const hoverSelect = screen.getByLabelText(/Hover Effect/i);
    fireEvent.change(hoverSelect, { target: { value: 'scale' } });

    // Submit form
    fireEvent.click(screen.getByText('Create Sticker'));

    expect(onConfirm).toHaveBeenCalledWith({
      altText: 'Test sticker',
      hoverEffect: 'scale',
      aspectLocked: true,
      clickActionType: 'none',
      clickUrl: '',
      clickUrlNewTab: true,
      clickWidgetId: '',
      clickEventType: '',
      clickEventPayload: '{}',
    });
  });

  it('shows asset preview when assetUrl is provided', () => {
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        assetUrl="https://example.com/sticker.png"
        assetType="image"
      />,
    );

    const img = screen.getByAltText('Sticker preview');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/sticker.png');
  });

  it('shows video preview for video assets', () => {
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        assetUrl="https://example.com/sticker.mp4"
        assetType="video"
      />,
    );

    const video = document.querySelector('video');
    expect(video).toBeTruthy();
    expect(video?.getAttribute('src')).toBe('https://example.com/sticker.mp4');
  });

  it('validates JSON payload and shows error for invalid JSON', () => {
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    // Select 'emit-event' action type to show event fields
    const actionSelect = screen.getByLabelText(/Action Type/i);
    fireEvent.change(actionSelect, { target: { value: 'emit-event' } });

    // Enter invalid JSON
    const payloadTextarea = screen.getByLabelText(/Event Payload/i);
    fireEvent.change(payloadTextarea, { target: { value: '{invalid json}' } });

    expect(screen.getByText('Invalid JSON format')).toBeTruthy();
  });

  it('uses initial settings when provided', () => {
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        initialSettings={{
          altText: 'Initial alt text',
          hoverEffect: 'glow',
          aspectLocked: false,
          clickActionType: 'open-url',
          clickUrl: 'https://example.com',
        }}
      />,
    );

    const altTextInput = screen.getByLabelText(/Alt Text/i) as HTMLInputElement;
    expect(altTextInput.value).toBe('Initial alt text');

    const hoverSelect = screen.getByLabelText(/Hover Effect/i) as HTMLSelectElement;
    expect(hoverSelect.value).toBe('glow');

    const aspectCheckbox = screen.getByLabelText(/Lock aspect ratio/i) as HTMLInputElement;
    expect(aspectCheckbox.checked).toBe(false);

    const actionSelect = screen.getByLabelText(/Action Type/i) as HTMLSelectElement;
    expect(actionSelect.value).toBe('open-url');

    const urlInput = screen.getByLabelText(/^URL$/i) as HTMLInputElement;
    expect(urlInput.value).toBe('https://example.com');
  });

  it('toggles aspect lock checkbox', () => {
    const onConfirm = vi.fn();
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const checkbox = screen.getByLabelText(/Lock aspect ratio/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true); // Default is true

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    fireEvent.click(screen.getByText('Create Sticker'));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ aspectLocked: false }),
    );
  });

  it('shows URL fields when open-url action is selected', () => {
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    // URL fields should not be visible initially
    expect(screen.queryByLabelText(/^URL$/i)).toBeNull();

    // Select 'open-url' action type
    const actionSelect = screen.getByLabelText(/Action Type/i);
    fireEvent.change(actionSelect, { target: { value: 'open-url' } });

    // URL fields should now be visible
    expect(screen.getByLabelText(/^URL$/i)).toBeTruthy();
    expect(screen.getByLabelText(/Open in new tab/i)).toBeTruthy();
  });

  it('shows widget picker when launch-widget action is selected', () => {
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    // Widget picker should not be visible initially
    expect(screen.queryByLabelText(/Widget to Launch/i)).toBeNull();

    // Select 'launch-widget' action type
    const actionSelect = screen.getByLabelText(/Action Type/i);
    fireEvent.change(actionSelect, { target: { value: 'launch-widget' } });

    // Widget picker should now be visible with mocked widgets
    const widgetSelect = screen.getByLabelText(/Widget to Launch/i);
    expect(widgetSelect).toBeTruthy();
    expect(screen.getByText('Test Widget (Built-in)')).toBeTruthy();
    expect(screen.getByText('Custom Widget')).toBeTruthy();
  });

  it('shows event fields when emit-event action is selected', () => {
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    // Event fields should not be visible initially
    expect(screen.queryByLabelText(/Event Type/i)).toBeNull();

    // Select 'emit-event' action type
    const actionSelect = screen.getByLabelText(/Action Type/i);
    fireEvent.change(actionSelect, { target: { value: 'emit-event' } });

    // Event fields should now be visible
    expect(screen.getByLabelText(/Event Type/i)).toBeTruthy();
    expect(screen.getByLabelText(/Event Payload/i)).toBeTruthy();
  });

  it('validates URL and shows error for invalid URL', () => {
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    // Select 'open-url' action type
    const actionSelect = screen.getByLabelText(/Action Type/i);
    fireEvent.change(actionSelect, { target: { value: 'open-url' } });

    // Enter invalid URL
    const urlInput = screen.getByLabelText(/^URL$/i);
    fireEvent.change(urlInput, { target: { value: 'not-a-valid-url' } });

    expect(screen.getByText('Please enter a valid URL')).toBeTruthy();
  });

  it('submits with open-url action type', () => {
    const onConfirm = vi.fn();
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    // Select 'open-url' action type
    const actionSelect = screen.getByLabelText(/Action Type/i);
    fireEvent.change(actionSelect, { target: { value: 'open-url' } });

    // Enter valid URL
    const urlInput = screen.getByLabelText(/^URL$/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

    // Submit form
    fireEvent.click(screen.getByText('Create Sticker'));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        clickActionType: 'open-url',
        clickUrl: 'https://example.com',
        clickUrlNewTab: true,
      }),
    );
  });

  it('submits with launch-widget action type', () => {
    const onConfirm = vi.fn();
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    // Select 'launch-widget' action type
    const actionSelect = screen.getByLabelText(/Action Type/i);
    fireEvent.change(actionSelect, { target: { value: 'launch-widget' } });

    // Select a widget
    const widgetSelect = screen.getByLabelText(/Widget to Launch/i);
    fireEvent.change(widgetSelect, { target: { value: 'widget-1' } });

    // Submit form
    fireEvent.click(screen.getByText('Create Sticker'));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        clickActionType: 'launch-widget',
        clickWidgetId: 'widget-1',
      }),
    );
  });

  it('does not submit open-url without URL', () => {
    const onConfirm = vi.fn();
    render(
      <StickerSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    // Select 'open-url' action type
    const actionSelect = screen.getByLabelText(/Action Type/i);
    fireEvent.change(actionSelect, { target: { value: 'open-url' } });

    // Submit form without entering URL
    fireEvent.click(screen.getByText('Create Sticker'));

    // Should show error and not call onConfirm
    expect(screen.getByText('URL is required for Open URL action')).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
