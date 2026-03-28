/**
 * Bridge Message Validator — Tests
 *
 * Validates that the Zod schemas correctly accept valid messages
 * and reject malformed/spoofed messages.
 *
 * @module runtime/bridge
 * @layer L3
 */

import { describe, it, expect } from 'vitest';

import { validateWidgetMessage, validateHostMessage } from './message-validator';

// ---------------------------------------------------------------------------
// Widget → Host Message Validation
// ---------------------------------------------------------------------------

describe('validateWidgetMessage', () => {
  it('accepts READY message', () => {
    const result = validateWidgetMessage({ type: 'READY' });
    expect(result).toEqual({ type: 'READY' });
  });

  it('accepts REGISTER message with manifest', () => {
    const result = validateWidgetMessage({
      type: 'REGISTER',
      manifest: { id: 'test', name: 'Test Widget' },
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe('REGISTER');
  });

  it('accepts EMIT message', () => {
    const result = validateWidgetMessage({
      type: 'EMIT',
      eventType: 'widget.test.event',
      payload: { value: 42 },
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe('EMIT');
  });

  it('accepts SET_STATE message', () => {
    const result = validateWidgetMessage({
      type: 'SET_STATE',
      key: 'counter',
      value: 10,
    });
    expect(result).not.toBeNull();
  });

  it('accepts GET_STATE message', () => {
    const result = validateWidgetMessage({
      type: 'GET_STATE',
      key: 'counter',
    });
    expect(result).not.toBeNull();
  });

  it('accepts LOG message', () => {
    const result = validateWidgetMessage({
      type: 'LOG',
      level: 'error',
      message: 'Something broke',
    });
    expect(result).not.toBeNull();
  });

  it('accepts INTEGRATION_QUERY message', () => {
    const result = validateWidgetMessage({
      type: 'INTEGRATION_QUERY',
      requestId: 'req-1',
      name: 'notion',
      params: { query: 'test' },
    });
    expect(result).not.toBeNull();
  });

  it('accepts CROSS_CANVAS_EMIT message', () => {
    const result = validateWidgetMessage({
      type: 'CROSS_CANVAS_EMIT',
      channel: 'updates',
      payload: { data: 'test' },
    });
    expect(result).not.toBeNull();
  });

  it('accepts CREATE_ENTITY message', () => {
    const result = validateWidgetMessage({
      type: 'CREATE_ENTITY',
      requestId: 'req-1',
      entity: { type: 'text', content: 'Hello' },
    });
    expect(result).not.toBeNull();
  });

  it('accepts DS_CREATE message', () => {
    const result = validateWidgetMessage({
      type: 'DS_CREATE',
      requestId: 'req-1',
      dsType: 'table',
      scope: 'canvas',
    });
    expect(result).not.toBeNull();
  });

  it('accepts GALLERY_LIST message', () => {
    const result = validateWidgetMessage({
      type: 'GALLERY_LIST',
      requestId: 'req-1',
      limit: 20,
      offset: 0,
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe('GALLERY_LIST');
  });

  it('accepts GALLERY_UPLOAD message', () => {
    const result = validateWidgetMessage({
      type: 'GALLERY_UPLOAD',
      requestId: 'req-1',
      imageUrl: 'https://example.com/image.png',
      name: 'test-image',
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe('GALLERY_UPLOAD');
  });

  it('accepts GALLERY_DELETE message', () => {
    const result = validateWidgetMessage({
      type: 'GALLERY_DELETE',
      requestId: 'req-1',
      assetId: 'asset-123',
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe('GALLERY_DELETE');
  });

  it('accepts GALLERY_GET message', () => {
    const result = validateWidgetMessage({
      type: 'GALLERY_GET',
      requestId: 'req-1',
      assetId: 'asset-123',
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe('GALLERY_GET');
  });

  // Rejection cases

  it('rejects null input', () => {
    expect(validateWidgetMessage(null)).toBeNull();
  });

  it('rejects undefined input', () => {
    expect(validateWidgetMessage(undefined)).toBeNull();
  });

  it('rejects empty object', () => {
    expect(validateWidgetMessage({})).toBeNull();
  });

  it('rejects unknown message type', () => {
    expect(validateWidgetMessage({ type: 'HACK_THE_PLANET' })).toBeNull();
  });

  it('rejects EMIT without eventType', () => {
    expect(validateWidgetMessage({ type: 'EMIT', payload: {} })).toBeNull();
  });

  it('rejects SET_STATE without key', () => {
    expect(validateWidgetMessage({ type: 'SET_STATE', value: 10 })).toBeNull();
  });

  it('rejects LOG with invalid level', () => {
    expect(validateWidgetMessage({ type: 'LOG', level: 'debug', message: 'test' })).toBeNull();
  });

  it('rejects array input', () => {
    expect(validateWidgetMessage([{ type: 'READY' }])).toBeNull();
  });

  it('rejects string input', () => {
    expect(validateWidgetMessage('READY')).toBeNull();
  });

  it('rejects numeric input', () => {
    expect(validateWidgetMessage(42)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Host → Widget Message Validation
// ---------------------------------------------------------------------------

describe('validateHostMessage', () => {
  it('accepts INIT message', () => {
    const result = validateHostMessage({
      type: 'INIT',
      widgetId: 'sn.builtin.test',
      instanceId: 'inst-1',
      config: { theme: 'dark' },
      theme: {
        '--sn-bg': '#fff',
        '--sn-surface': '#f5f5f5',
        '--sn-accent': '#4a90d9',
        '--sn-text': '#1a1a1a',
        '--sn-text-muted': '#888',
        '--sn-border': '#e0e0e0',
        '--sn-radius': '8px',
        '--sn-font-family': 'system-ui',
      },
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe('INIT');
  });

  it('accepts EVENT message', () => {
    const result = validateHostMessage({
      type: 'EVENT',
      event: { type: 'widget.data.updated', payload: { value: 1 } },
    });
    expect(result).not.toBeNull();
  });

  it('accepts RESIZE message', () => {
    const result = validateHostMessage({
      type: 'RESIZE',
      width: 400,
      height: 300,
    });
    expect(result).not.toBeNull();
  });

  it('accepts STATE_RESPONSE message', () => {
    const result = validateHostMessage({
      type: 'STATE_RESPONSE',
      key: 'counter',
      value: 42,
    });
    expect(result).not.toBeNull();
  });

  it('accepts THEME_UPDATE message', () => {
    const result = validateHostMessage({
      type: 'THEME_UPDATE',
      theme: {
        '--sn-bg': '#000',
        '--sn-surface': '#111',
        '--sn-accent': '#0066ff',
        '--sn-text': '#fff',
        '--sn-text-muted': '#888',
        '--sn-border': '#333',
        '--sn-radius': '4px',
        '--sn-font-family': 'monospace',
      },
    });
    expect(result).not.toBeNull();
  });

  it('accepts DESTROY message', () => {
    expect(validateHostMessage({ type: 'DESTROY' })).not.toBeNull();
  });

  // Rejection cases

  it('rejects null input', () => {
    expect(validateHostMessage(null)).toBeNull();
  });

  it('rejects unknown message type', () => {
    expect(validateHostMessage({ type: 'EXECUTE_CODE' })).toBeNull();
  });

  it('rejects INIT without theme', () => {
    expect(validateHostMessage({
      type: 'INIT',
      widgetId: 'test',
      instanceId: 'inst',
      config: {},
    })).toBeNull();
  });

  it('rejects INIT with incomplete theme', () => {
    expect(validateHostMessage({
      type: 'INIT',
      widgetId: 'test',
      instanceId: 'inst',
      config: {},
      theme: { '--sn-bg': '#fff' }, // Missing required tokens
    })).toBeNull();
  });

  it('rejects RESIZE with string dimensions', () => {
    expect(validateHostMessage({
      type: 'RESIZE',
      width: '400',
      height: '300',
    })).toBeNull();
  });
});
