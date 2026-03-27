/**
 * Minimal StickerNest SDK Stub
 *
 * Injected into widget iframes inside artifacts so widgets can call
 * StickerNest.register(), ready(), emit(), subscribe(), etc.
 * This is a lightweight in-memory version — no real bridge to a host.
 */

export function generateSdkStub(config?: Record<string, unknown>, theme?: Record<string, string>): string {
  const configJson = JSON.stringify(config ?? {});
  const themeJson = JSON.stringify(theme ?? {});

  return `
<script>
(function() {
  var _manifest = null;
  var _state = {};
  var _subscribers = {};
  var _themeHandlers = [];
  var _resizeHandlers = [];
  var _config = ${configJson};
  var _theme = ${themeJson};

  window.StickerNest = {
    register: function(manifest) {
      _manifest = manifest;
    },

    ready: function() {
      document.dispatchEvent(new CustomEvent('sn:ready', { detail: _manifest }));
      // Apply theme tokens as CSS custom properties
      var root = document.documentElement;
      for (var key in _theme) {
        if (_theme.hasOwnProperty(key)) {
          root.style.setProperty(key, _theme[key]);
        }
      }
      // Notify theme handlers
      _themeHandlers.forEach(function(h) { try { h(_theme); } catch(e) {} });
    },

    emit: function(type, payload) {
      // Post to parent for potential future bridge
      try {
        window.parent.postMessage({ source: 'sn-widget', type: 'EMIT', eventType: type, payload: payload }, '*');
      } catch(e) {}
      // Also dispatch locally for widgets that subscribe to their own events
      var handlers = _subscribers[type] || [];
      handlers.forEach(function(h) { try { h(payload); } catch(e) {} });
    },

    subscribe: function(type, handler) {
      if (!_subscribers[type]) _subscribers[type] = [];
      _subscribers[type].push(handler);
      return function unsubscribe() {
        _subscribers[type] = (_subscribers[type] || []).filter(function(h) { return h !== handler; });
      };
    },

    setState: function(key, value) {
      _state[key] = value;
      return Promise.resolve();
    },

    getState: function(key) {
      return Promise.resolve(_state[key]);
    },

    setUserState: function(key, value) {
      _state['__user__' + key] = value;
      return Promise.resolve();
    },

    getUserState: function(key) {
      return Promise.resolve(_state['__user__' + key]);
    },

    getConfig: function() {
      return Promise.resolve(_config);
    },

    onThemeChange: function(handler) {
      _themeHandlers.push(handler);
      // Immediately call with current theme
      try { handler(_theme); } catch(e) {}
    },

    onResize: function(handler) {
      _resizeHandlers.push(handler);
      // Call with initial size
      try {
        handler({ width: window.innerWidth, height: window.innerHeight });
      } catch(e) {}
      window.addEventListener('resize', function() {
        try { handler({ width: window.innerWidth, height: window.innerHeight }); } catch(e) {}
      });
    },

    integration: function(name) {
      return {
        query: function(params) {
          console.warn('[StickerNest SDK Stub] integration(' + name + ').query() is not available in artifact mode');
          return Promise.resolve(null);
        },
        mutate: function(params) {
          console.warn('[StickerNest SDK Stub] integration(' + name + ').mutate() is not available in artifact mode');
          return Promise.resolve(null);
        }
      };
    },

    emitCrossCanvas: function(channel, payload) {
      console.warn('[StickerNest SDK Stub] emitCrossCanvas() is not available in artifact mode');
    },

    subscribeCrossCanvas: function(channel, handler) {
      console.warn('[StickerNest SDK Stub] subscribeCrossCanvas() is not available in artifact mode');
      return function() {};
    },

    unsubscribeCrossCanvas: function(channel) {}
  };
})();
</script>`;
}
