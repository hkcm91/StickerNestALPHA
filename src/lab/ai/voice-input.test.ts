import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createVoiceInput } from './voice-input';

// Mock SpeechRecognition
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  stopped = false;

  start() { this.started = true; }
  stop() { this.stopped = true; this.onend?.(); }
  abort() { this.stopped = true; }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return false; }
}

let mockInstance: MockSpeechRecognition;

beforeEach(() => {
  mockInstance = new MockSpeechRecognition();
  (globalThis as Record<string, unknown>).SpeechRecognition = vi.fn(() => mockInstance);
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).SpeechRecognition;
});

describe('createVoiceInput', () => {
  it('isSupported() returns true when SpeechRecognition exists', () => {
    const voice = createVoiceInput();
    expect(voice.isSupported()).toBe(true);
  });

  it('isSupported() returns false when SpeechRecognition is missing', () => {
    delete (globalThis as Record<string, unknown>).SpeechRecognition;
    const voice = createVoiceInput();
    expect(voice.isSupported()).toBe(false);
  });

  it('start() begins listening', () => {
    const voice = createVoiceInput();
    voice.start();
    expect(voice.isListening()).toBe(true);
    expect(mockInstance.started).toBe(true);
  });

  it('stop() stops listening', () => {
    const voice = createVoiceInput();
    voice.start();
    voice.stop();
    expect(voice.isListening()).toBe(false);
  });

  it('onTranscript fires for final results', () => {
    const voice = createVoiceInput();
    const cb = vi.fn();
    voice.onTranscript(cb);
    voice.start();

    // Simulate a result event
    mockInstance.onresult?.({
      resultIndex: 0,
      results: {
        length: 1,
        item: () => ({
          isFinal: true,
          length: 1,
          item: () => ({ transcript: 'make a timer', confidence: 0.95 }),
          0: { transcript: 'make a timer', confidence: 0.95 },
        }),
        0: {
          isFinal: true,
          length: 1,
          item: () => ({ transcript: 'make a timer', confidence: 0.95 }),
          0: { transcript: 'make a timer', confidence: 0.95 },
        },
      },
    });

    expect(cb).toHaveBeenCalledWith('make a timer', true);
  });

  it('onError fires on recognition error', () => {
    const voice = createVoiceInput();
    const cb = vi.fn();
    voice.onError(cb);
    voice.start();

    mockInstance.onerror?.({ error: 'not-allowed', message: 'Permission denied' });
    expect(cb).toHaveBeenCalledWith('Permission denied');
  });

  it('unsubscribe works for onTranscript', () => {
    const voice = createVoiceInput();
    const cb = vi.fn();
    const unsub = voice.onTranscript(cb);
    unsub();
    voice.start();

    mockInstance.onresult?.({
      resultIndex: 0,
      results: {
        length: 1,
        item: () => ({ isFinal: true, length: 1, item: () => ({ transcript: 'x', confidence: 1 }), 0: { transcript: 'x', confidence: 1 } }),
        0: { isFinal: true, length: 1, item: () => ({ transcript: 'x', confidence: 1 }), 0: { transcript: 'x', confidence: 1 } },
      },
    });

    expect(cb).not.toHaveBeenCalled();
  });

  it('destroy() cleans up', () => {
    const voice = createVoiceInput();
    voice.start();
    voice.destroy();
    expect(voice.isListening()).toBe(false);
  });
});
