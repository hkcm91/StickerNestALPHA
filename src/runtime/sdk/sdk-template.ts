/**
 * Widget SDK Template
 *
 * The StickerNest global object injected into every widget iframe.
 * This is the API surface that widget authors interact with.
 * Runs inside the sandboxed iframe, not in the host.
 *
 * @module runtime/sdk
 * @layer L3
 * @see .claude/rules/L3-runtime.md
 */

/**
 * The StickerNest SDK interface available to widgets as `window.StickerNest`.
 */
export interface StickerNestSDK {
  /** Returns the stable instance ID for this widget instance */
  getInstanceId(): string;
  /** Returns the widget ID */
  getWidgetId(): string;
  /** Emit an event to the host bus via bridge */
  emit(type: string, payload: unknown): void;
  /** Subscribe to events from the host bus */
  subscribe(type: string, handler: (payload: unknown) => void): void;
  /** Unsubscribe from events */
  unsubscribe(type: string, handler: (payload: unknown) => void): void;
  /** Save per-instance state (1MB limit) */
  setState(key: string, value: unknown): void;
  /** Retrieve per-instance state */
  getState(key: string): Promise<unknown>;
  /** Save cross-canvas user state (10MB total) */
  setUserState(key: string, value: unknown): void;
  /** Retrieve cross-canvas user state */
  getUserState(key: string): Promise<unknown>;
  /** Get user-configured values for this instance */
  getConfig(): Record<string, unknown>;
  /** Register widget manifest (must be called before ready) */
  register(manifest: unknown): void;
  /** Signal initialization complete (must be called within 500ms) */
  ready(): void;
  /** Receive theme token updates */
  onThemeChange(handler: (tokens: Record<string, string>) => void): void;
  /** Receive viewport resize events */
  onResize(handler: (width: number, height: number) => void): void;
  /** Proxied external data read */
  integration(name: string): {
    query(params: unknown): Promise<unknown>;
    mutate(params: unknown): Promise<unknown>;
  };
  /** Cross-canvas event emission */
  emitCrossCanvas(channel: string, payload: unknown): void;
  /** Cross-canvas event subscription */
  subscribeCrossCanvas(channel: string, handler: (payload: unknown) => void): void;
  /** Cross-canvas event unsubscription */
  unsubscribeCrossCanvas(channel: string): void;
}

/**
 * Generates the SDK template JavaScript source for injection into srcdoc.
 *
 * @returns The SDK source code as a string
 */
export function generateSDKTemplate(): string {
  // This returns a self-contained JavaScript string that creates
  // window.StickerNest when evaluated inside a widget iframe.
  return `(function() {
  'use strict';

  var _config = {};
  var _manifest = null;
  var _registered = false;
  var _ready = false;
  var _instanceId = '';
  var _widgetId = '';
  var _eventHandlers = {};
  var _themeHandlers = [];
  var _resizeHandlers = [];
  var _crossCanvasHandlers = {};
  var _pendingRequests = {};
  var _requestCounter = 0;
  var REQUEST_TIMEOUT_MS = 10000;

  function postToHost(message) {
    window.parent.postMessage(message, '*');
  }

  function addPendingRequest(key, resolve, reject) {
    var timer = setTimeout(function() {
      if (_pendingRequests[key]) {
        delete _pendingRequests[key];
        reject(new Error('Request timed out after ' + REQUEST_TIMEOUT_MS + 'ms'));
      }
    }, REQUEST_TIMEOUT_MS);
    _pendingRequests[key] = { resolve: resolve, reject: reject, timer: timer };
  }

  function resolvePending(key, value) {
    var pending = _pendingRequests[key];
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolve(value);
      delete _pendingRequests[key];
    }
  }

  function rejectPending(key, error) {
    var pending = _pendingRequests[key];
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      delete _pendingRequests[key];
    }
  }

  // Listen for messages from the host
  window.addEventListener('message', function(event) {
    var data = event.data;
    if (!data || typeof data.type !== 'string') return;

    switch (data.type) {
      case 'INIT':
        _config = data.config || {};
        _instanceId = data.instanceId || '';
        _widgetId = data.widgetId || '';
        if (data.theme) {
          for (var i = 0; i < _themeHandlers.length; i++) {
            try { _themeHandlers[i](data.theme); } catch(e) { console.error('[StickerNest SDK] Theme handler error:', e); }
          }
        }
        break;

      case 'EVENT':
        if (data.event && data.event.type) {
          var handlers = _eventHandlers[data.event.type];
          if (handlers) {
            for (var j = 0; j < handlers.length; j++) {
              try { handlers[j](data.event.payload); } catch(e) { console.error('[StickerNest SDK] Event handler error:', e); }
            }
          }
        }
        break;

      case 'CONFIG_UPDATE':
        _config = data.config || {};
        break;

      case 'THEME_UPDATE':
        if (data.theme) {
          for (var k = 0; k < _themeHandlers.length; k++) {
            try { _themeHandlers[k](data.theme); } catch(e) { console.error('[StickerNest SDK] Theme handler error:', e); }
          }
        }
        break;

      case 'RESIZE':
        for (var r = 0; r < _resizeHandlers.length; r++) {
          try { _resizeHandlers[r](data.width, data.height); } catch(e) { console.error('[StickerNest SDK] Resize handler error:', e); }
        }
        break;

      case 'STATE_RESPONSE':
        var stateKey = 'state:' + data.key;
        var userStateKey = 'userState:' + data.key;
        if (_pendingRequests[stateKey]) {
          resolvePending(stateKey, data.value);
        } else {
          resolvePending(userStateKey, data.value);
        }
        break;

      case 'STATE_REJECTED':
        console.warn('[StickerNest SDK] State rejected for key "' + data.key + '": ' + data.reason);
        break;

      case 'INTEGRATION_RESPONSE':
        var integrationKey = 'integration_' + data.requestId;
        if (data.error) {
          rejectPending(integrationKey, new Error(data.error));
        } else {
          resolvePending(integrationKey, data.result);
        }
        break;

      case 'CROSS_CANVAS_EVENT':
        var ccHandlers = _crossCanvasHandlers[data.channel];
        if (ccHandlers) {
          for (var cc = 0; cc < ccHandlers.length; cc++) {
            try { ccHandlers[cc](data.payload); } catch(e) { console.error('[StickerNest SDK] Cross-canvas handler error:', e); }
          }
        }
        break;

      case 'DESTROY':
        _eventHandlers = {};
        _themeHandlers = [];
        _resizeHandlers = [];
        _crossCanvasHandlers = {};
        // Clear all pending request timers before discarding
        var pendingKeys = Object.keys(_pendingRequests);
        for (var pk = 0; pk < pendingKeys.length; pk++) {
          var entry = _pendingRequests[pendingKeys[pk]];
          if (entry && entry.timer) { clearTimeout(entry.timer); }
        }
        _pendingRequests = {};
        break;
    }
  });

  window.StickerNest = {
    /** Returns the stable instance ID for this widget instance */
    getInstanceId: function() { return _instanceId; },
    /** Returns the widget ID */
    getWidgetId: function() { return _widgetId; },

    emit: function(type, payload) {
      postToHost({ type: 'EMIT', eventType: type, payload: payload });
    },

    subscribe: function(type, handler) {
      var isFirstHandler = !_eventHandlers[type] || _eventHandlers[type].length === 0;
      if (!_eventHandlers[type]) {
        _eventHandlers[type] = [];
      }
      _eventHandlers[type].push(handler);
      // Notify host on first subscription to this event type
      if (isFirstHandler) {
        postToHost({ type: 'SUBSCRIBE', eventType: type });
      }
    },

    unsubscribe: function(type, handler) {
      var handlers = _eventHandlers[type];
      if (handlers) {
        var idx = handlers.indexOf(handler);
        if (idx !== -1) {
          handlers.splice(idx, 1);
        }
        if (handlers.length === 0) {
          delete _eventHandlers[type];
          // Notify host when no handlers remain for this event type
          postToHost({ type: 'UNSUBSCRIBE', eventType: type });
        }
      }
    },

    setState: function(key, value) {
      postToHost({ type: 'SET_STATE', key: key, value: value });
    },

    getState: function(key) {
      return new Promise(function(resolve, reject) {
        addPendingRequest('state:' + key, resolve, reject);
        postToHost({ type: 'GET_STATE', key: key });
      });
    },

    setUserState: function(key, value) {
      postToHost({ type: 'SET_USER_STATE', key: key, value: value });
    },

    getUserState: function(key) {
      return new Promise(function(resolve, reject) {
        addPendingRequest('userState:' + key, resolve, reject);
        postToHost({ type: 'GET_USER_STATE', key: key });
      });
    },

    getConfig: function() {
      return Object.assign({}, _config);
    },

    register: function(manifest) {
      if (_ready) {
        throw new Error('StickerNest.register() must be called before StickerNest.ready()');
      }
      _manifest = manifest;
      _registered = true;
      postToHost({ type: 'REGISTER', manifest: manifest });
    },

    ready: function() {
      if (_ready) return;
      _ready = true;
      postToHost({ type: 'READY' });
    },

    onThemeChange: function(handler) {
      _themeHandlers.push(handler);
    },

    onResize: function(handler) {
      _resizeHandlers.push(handler);
    },

    integration: function(name) {
      return {
        query: function(params) {
          return new Promise(function(resolve, reject) {
            var requestId = 'req_' + (++_requestCounter);
            addPendingRequest('integration_' + requestId, resolve, reject);
            postToHost({ type: 'INTEGRATION_QUERY', requestId: requestId, name: name, params: params });
          });
        },
        mutate: function(params) {
          return new Promise(function(resolve, reject) {
            var requestId = 'req_' + (++_requestCounter);
            addPendingRequest('integration_' + requestId, resolve, reject);
            postToHost({ type: 'INTEGRATION_MUTATE', requestId: requestId, name: name, params: params });
          });
        }
      };
    },

    emitCrossCanvas: function(channel, payload) {
      postToHost({ type: 'CROSS_CANVAS_EMIT', channel: channel, payload: payload });
    },

    subscribeCrossCanvas: function(channel, handler) {
      if (!_crossCanvasHandlers[channel]) {
        _crossCanvasHandlers[channel] = [];
        // Tell the host to subscribe to this channel
        postToHost({ type: 'CROSS_CANVAS_SUBSCRIBE', channel: channel });
      }
      _crossCanvasHandlers[channel].push(handler);
    },

    unsubscribeCrossCanvas: function(channel) {
      delete _crossCanvasHandlers[channel];
      postToHost({ type: 'CROSS_CANVAS_UNSUBSCRIBE', channel: channel });
    }
  };
})();`;
}
