/**
 * Built-in Widget HTML Templates
 *
 * Single-file HTML sources for built-in widgets keyed by widget ID.
 * These use the same SDK interface as third-party sandboxed widgets.
 *
 * @module runtime/widgets
 * @layer L3
 */

export const BUILT_IN_WIDGET_HTML: Record<string, string> = {
  'wgt-clock': `
    <div id="clock" style="display:flex;align-items:center;justify-content:center;height:100%;font-family:system-ui;font-size:2em;color:var(--sn-text,#1a1a2e);">
      <span id="time">--:--:--</span>
    </div>
    <script>
      function updateClock() {
        document.getElementById('time').textContent = new Date().toLocaleTimeString();
      }
      setInterval(updateClock, 1000);
      updateClock();
      StickerNest.register({ id: 'wgt-clock', name: 'Clock', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,

  'wgt-note': `
    <div style="padding:12px;height:100%;background:var(--sn-surface,#fffde7);font-family:system-ui;font-size:14px;">
      <div contenteditable="true" style="outline:none;height:100%;color:var(--sn-text,#1a1a2e);">Type here...</div>
    </div>
    <script>
      StickerNest.register({ id: 'wgt-note', name: 'Sticky Note', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,

  'wgt-counter': `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-family:system-ui;gap:12px;">
      <span id="count" style="font-size:3em;font-weight:bold;color:var(--sn-text,#1a1a2e);">0</span>
      <div style="display:flex;gap:8px;">
        <button id="dec" style="padding:8px 16px;border:1px solid var(--sn-border,#e0e0e0);border-radius:6px;background:var(--sn-surface,#fff);cursor:pointer;font-size:1.2em;">-</button>
        <button id="inc" style="padding:8px 16px;border:1px solid var(--sn-border,#e0e0e0);border-radius:6px;background:var(--sn-surface,#fff);cursor:pointer;font-size:1.2em;">+</button>
      </div>
    </div>
    <script>
      var count = 0;
      var el = document.getElementById('count');
      document.getElementById('inc').onclick = function() { count++; el.textContent = count; };
      document.getElementById('dec').onclick = function() { count--; el.textContent = count; };
      StickerNest.register({ id: 'wgt-counter', name: 'Counter', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,
};
