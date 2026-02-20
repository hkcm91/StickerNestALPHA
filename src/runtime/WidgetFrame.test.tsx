import { describe, it } from 'vitest';

describe('WidgetFrame', () => {
  // Sandbox enforcement
  it.todo('renders iframe with sandbox="allow-scripts allow-forms"');
  it.todo('does NOT include allow-same-origin in sandbox');
  it.todo('uses srcdoc, not src');

  // Memoization
  it.todo('memoizes srcdoc — same reference on re-render with same props');
  it.todo('rebuilds srcdoc when widgetHtml changes');
  it.todo('does NOT rebuild srcdoc when config or theme changes');

  // Rendering
  it.todo('uses display:none when visible=false, not conditional render');
  it.todo('uses instanceId as React key');

  // Lifecycle
  it.todo('widget signals READY within 500ms of iframe load');
  it.todo('widget crash shows per-instance error state, bus continues');

  // Security
  it.todo('origin spoofing attempt on bridge silently rejected');
  it.todo('strict CSP enforced via meta tag in srcdoc');

  // Theming
  it.todo('theme token injection reaches widget onThemeChange handler');
  it.todo('theme updates delivered via postMessage, not srcdoc rebuild');

  // State
  it.todo('setState/getState round-trip persists correctly');
  it.todo('state write at exactly 1MB accepted');
  it.todo('state write exceeding 1MB rejected with error');

  // Resize
  it.todo('widget receives resize events via bridge');
  it.todo('widgets do not control their own container dimensions');
});
