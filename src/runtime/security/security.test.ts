import { describe, it } from 'vitest';

describe('CSP', () => {
  it.todo('generates correct CSP meta tag for default sandbox');
  it.todo('blocks connect-src by default');
  it.todo('allows inline scripts and styles');
  it.todo('allows data: and blob: for images');
  it.todo('allows data: for fonts');
});

describe('RateLimiter', () => {
  it.todo('allows events under the rate limit');
  it.todo('throttles events exceeding rate limit');
  it.todo('resets count after window expires');
  it.todo('emits widget:rate-limited event when throttling');
  it.todo('uses per-widget limits when set');
  it.todo('default limit is 100 events/second');
  it.todo('silently drops throttled events');
  it.todo('destroy cleans up all timers');
});

describe('SandboxPolicy', () => {
  it.todo('SANDBOX_POLICY includes allow-scripts and allow-forms');
  it.todo('SANDBOX_POLICY does NOT include allow-same-origin');
  it.todo('validateSandboxPolicy rejects allow-same-origin');
  it.todo('validateSandboxPolicy rejects allow-top-navigation');
  it.todo('validateSandboxPolicy rejects allow-popups');
  it.todo('validateSandboxPolicy rejects allow-pointer-lock');
  it.todo('validateSandboxPolicy accepts the default policy');
});
