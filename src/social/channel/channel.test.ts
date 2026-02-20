import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing channel
const mockRealtimeChannel = {
  on: vi.fn().mockReturnThis(),
  send: vi.fn(),
  subscribe: vi.fn((cb?: (status: string) => void) => {
    if (cb) cb('SUBSCRIBED');
    return mockRealtimeChannel;
  }),
  unsubscribe: vi.fn(),
};

vi.mock('../../kernel/supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockRealtimeChannel),
    removeChannel: vi.fn().mockResolvedValue('ok'),
  },
}));

import { supabase } from '../../kernel/supabase';

import { createCanvasChannel } from './channel';

beforeEach(() => {
  vi.clearAllMocks();
  mockRealtimeChannel.subscribe.mockImplementation((cb?: (status: string) => void) => {
    if (cb) cb('SUBSCRIBED');
    return mockRealtimeChannel;
  });
});

describe('CanvasChannel', () => {
  it('creates a channel with naming convention canvas:{canvasId}', () => {
    createCanvasChannel('abc-123');
    expect(supabase.channel).toHaveBeenCalledWith('canvas:abc-123');
  });

  it('exposes the canvasId on the instance', () => {
    const channel = createCanvasChannel('my-canvas');
    expect(channel.canvasId).toBe('my-canvas');
  });

  it('exposes the underlying RealtimeChannel', () => {
    const channel = createCanvasChannel('my-canvas');
    expect(channel.channel).toBe(mockRealtimeChannel);
  });

  it('join() calls subscribe on the underlying channel', async () => {
    const channel = createCanvasChannel('my-canvas');
    await channel.join();
    expect(mockRealtimeChannel.subscribe).toHaveBeenCalled();
  });

  it('isConnected() returns true after successful join', async () => {
    const channel = createCanvasChannel('my-canvas');
    expect(channel.isConnected()).toBe(false);
    await channel.join();
    expect(channel.isConnected()).toBe(true);
  });

  it('join() rejects on channel error', async () => {
    mockRealtimeChannel.subscribe.mockImplementation((cb?: (status: string) => void) => {
      if (cb) cb('CHANNEL_ERROR');
      return mockRealtimeChannel;
    });

    const channel = createCanvasChannel('my-canvas');
    await expect(channel.join()).rejects.toThrow('Channel subscription failed: CHANNEL_ERROR');
    expect(channel.isConnected()).toBe(false);
  });

  it('join() rejects on timeout', async () => {
    mockRealtimeChannel.subscribe.mockImplementation((cb?: (status: string) => void) => {
      if (cb) cb('TIMED_OUT');
      return mockRealtimeChannel;
    });

    const channel = createCanvasChannel('my-canvas');
    await expect(channel.join()).rejects.toThrow('Channel subscription failed: TIMED_OUT');
    expect(channel.isConnected()).toBe(false);
  });

  it('leave() calls removeChannel and sets connected to false', async () => {
    const channel = createCanvasChannel('my-canvas');
    await channel.join();
    expect(channel.isConnected()).toBe(true);

    await channel.leave();
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockRealtimeChannel);
    expect(channel.isConnected()).toBe(false);
  });

  it('broadcast() sends message via the underlying channel', () => {
    const channel = createCanvasChannel('my-canvas');
    channel.broadcast('cursor', { x: 10, y: 20 });

    expect(mockRealtimeChannel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'cursor',
      payload: { x: 10, y: 20 },
    });
  });

  it('onBroadcast() registers a listener on the underlying channel', () => {
    const channel = createCanvasChannel('my-canvas');
    const callback = vi.fn();
    channel.onBroadcast('cursor', callback);

    expect(mockRealtimeChannel.on).toHaveBeenCalledWith(
      'broadcast',
      { event: 'cursor' },
      expect.any(Function),
    );
  });

  it('onBroadcast() callback receives the payload from the message', () => {
    const channel = createCanvasChannel('my-canvas');
    const callback = vi.fn();
    channel.onBroadcast('cursor', callback);

    // Get the callback that was passed to channel.on() and simulate a message
    const onCall = mockRealtimeChannel.on.mock.calls[0];
    const registeredCallback = onCall[2] as (msg: { payload: unknown }) => void;
    registeredCallback({ payload: { userId: 'u1', x: 100, y: 200 } });

    expect(callback).toHaveBeenCalledWith({ userId: 'u1', x: 100, y: 200 });
  });

  it('isConnected() returns false after CLOSED status', async () => {
    let subscribeCb: ((status: string) => void) | undefined;
    mockRealtimeChannel.subscribe.mockImplementation((cb?: (status: string) => void) => {
      subscribeCb = cb;
      if (cb) cb('SUBSCRIBED');
      return mockRealtimeChannel;
    });

    const channel = createCanvasChannel('my-canvas');
    await channel.join();
    expect(channel.isConnected()).toBe(true);

    // Simulate the channel being closed after connection
    subscribeCb!('CLOSED');
    expect(channel.isConnected()).toBe(false);
  });
});
