import { describe, it } from 'vitest';

describe('StickerNest SDK Template', () => {
  it.todo('emit() posts EMIT message to parent');
  it.todo('subscribe() registers handler for event type');
  it.todo('unsubscribe() removes specific handler');
  it.todo('setState() posts SET_STATE to parent');
  it.todo('getState() sends GET_STATE and awaits STATE_RESPONSE');
  it.todo('setUserState() posts SET_USER_STATE to parent');
  it.todo('getUserState() sends GET_USER_STATE and awaits response');
  it.todo('getConfig() returns config from last INIT');
  it.todo('register() posts REGISTER with manifest — must be before ready()');
  it.todo('ready() signals READY to host — must be within 500ms');
  it.todo('onThemeChange() receives theme tokens on load and on change');
  it.todo('onResize() receives viewport dimensions');
  it.todo('integration().query() proxies external data read via host');
  it.todo('integration().mutate() proxies external data write via host');
  it.todo('register() before ready() succeeds; reverse order errors');
});

describe('SDK Builder', () => {
  it.todo('builds complete srcdoc HTML with SDK injection');
  it.todo('includes CSP meta tag in srcdoc');
  it.todo('includes widget code after SDK');
  it.todo('includes base styles (margin:0, box-sizing)');
  it.todo('widget code has access to StickerNest global');
});
