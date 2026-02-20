import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createEventInspector } from '../inspector/inspector';

import { createPreviewManager, PREVIEW_DEBOUNCE_MS, DEFAULT_PREVIEW_THEME } from './preview-manager';

describe('createPreviewManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts without ready props', () => {
    const inspector = createEventInspector();
    const pm = createPreviewManager(inspector);
    expect(pm.getWidgetFrameProps()).toBeNull();
    expect(pm.isReady()).toBe(false);
  });

  it('produces WidgetFrameProps after debounced update', () => {
    const inspector = createEventInspector();
    const pm = createPreviewManager(inspector);

    pm.update('<div>Test</div>');
    // Before debounce fires, still null
    expect(pm.getWidgetFrameProps()).toBeNull();

    vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);
    const props = pm.getWidgetFrameProps();
    expect(props).not.toBeNull();
    expect(props!.widgetHtml).toBe('<div>Test</div>');
    expect(props!.widgetId).toBe('lab-preview');
    expect(props!.visible).toBe(true);
  });

  it('uses default theme tokens', () => {
    const inspector = createEventInspector();
    const pm = createPreviewManager(inspector);

    pm.update('<div>Test</div>');
    vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);

    const props = pm.getWidgetFrameProps();
    expect(props!.theme).toEqual(DEFAULT_PREVIEW_THEME);
  });

  it('updates theme tokens', () => {
    const inspector = createEventInspector();
    const pm = createPreviewManager(inspector);
    const customTheme = {
      ...DEFAULT_PREVIEW_THEME,
      '--sn-bg': '#000000',
    };

    pm.update('<div>Test</div>', {}, customTheme);
    vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);

    const props = pm.getWidgetFrameProps();
    expect(props!.theme['--sn-bg']).toBe('#000000');
  });

  it('logs theme update to inspector', () => {
    const inspector = createEventInspector();
    const pm = createPreviewManager(inspector);
    const customTheme = { ...DEFAULT_PREVIEW_THEME, '--sn-accent': '#ff0000' };

    pm.update('<div>Test</div>', {}, customTheme);

    const entries = inspector.getEntries();
    const themeEntry = entries.find((e) => e.eventType === 'preview.theme.updated');
    expect(themeEntry).toBeTruthy();
    expect(themeEntry!.direction).toBe('received');
  });

  it('debounces rapid updates', () => {
    const inspector = createEventInspector();
    const pm = createPreviewManager(inspector);

    pm.update('<div>1</div>');
    pm.update('<div>2</div>');
    pm.update('<div>3</div>');
    vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);

    const props = pm.getWidgetFrameProps();
    expect(props!.widgetHtml).toBe('<div>3</div>');
  });

  it('sets and gets preview mode', () => {
    const inspector = createEventInspector();
    const pm = createPreviewManager(inspector);

    expect(pm.getMode()).toBe('2d-isolated');
    pm.setMode('2d-canvas');
    expect(pm.getMode()).toBe('2d-canvas');
    pm.setMode('3d-spatial');
    expect(pm.getMode()).toBe('3d-spatial');
  });

  it('destroy stops producing props', () => {
    const inspector = createEventInspector();
    const pm = createPreviewManager(inspector);

    pm.update('<div>Test</div>');
    vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);
    expect(pm.isReady()).toBe(true);

    pm.destroy();
    expect(pm.isReady()).toBe(false);
    expect(pm.getWidgetFrameProps()).toBeNull();
  });

  it('generates unique instanceId on each rebuild', () => {
    const inspector = createEventInspector();
    const pm = createPreviewManager(inspector);

    pm.update('<div>v1</div>');
    vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);
    const id1 = pm.getWidgetFrameProps()!.instanceId;

    pm.update('<div>v2</div>');
    vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS + 10);
    const id2 = pm.getWidgetFrameProps()!.instanceId;

    expect(id1).not.toBe(id2);
  });
});
