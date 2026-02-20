import { describe, it } from 'vitest';

describe('WidgetBridge', () => {
  // Host → Widget messages
  it.todo('sends INIT with widgetId, instanceId, config, and theme');
  it.todo('sends EVENT with serialized bus event');
  it.todo('sends CONFIG_UPDATE with new config');
  it.todo('sends THEME_UPDATE with new theme tokens');
  it.todo('sends RESIZE with width and height');
  it.todo('sends STATE_RESPONSE with requested state');
  it.todo('sends DESTROY signal');

  // Widget → Host messages
  it.todo('handles READY and flushes event queue');
  it.todo('handles EMIT and forwards to event bus');
  it.todo('handles SET_STATE and persists state');
  it.todo('handles GET_STATE and responds with state');
  it.todo('handles RESIZE_REQUEST and validates bounds');
  it.todo('handles LOG and prefixes with widget ID');
  it.todo('handles REGISTER and validates manifest');

  // Validation
  it.todo('rejects malformed WidgetMessage');
  it.todo('rejects message from unknown source (origin verification)');
  it.todo('rejects SET_STATE exceeding 1MB');

  // Queue
  it.todo('queues events sent before READY');
  it.todo('flushes queue in order on READY');
  it.todo('drops oldest when queue exceeds 1000');
  it.todo('delivers directly after READY (no queue)');
});

describe('MessageQueue', () => {
  it.todo('enqueues messages up to MAX_QUEUE_SIZE');
  it.todo('drops oldest message on overflow');
  it.todo('flushes all messages in order');
  it.todo('size() returns current count');
  it.todo('clear() empties the queue');
});

describe('MessageValidator', () => {
  it.todo('validates all HostMessage types');
  it.todo('validates all WidgetMessage types');
  it.todo('returns null for malformed messages');
  it.todo('returns null for unknown message types');
});
