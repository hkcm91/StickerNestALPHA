/**
 * Built-in Widget HTML Templates for MCP Artifact Rendering
 *
 * Copied from src/runtime/widgets/built-in-html.ts (mcp-dev is a
 * separate package and cannot import from the main app).
 *
 * Includes core widgets for artifact demos. Commerce and game widgets
 * can be added later as needed.
 */

export const WIDGET_HTML_TEMPLATES: Record<string, string> = {
  'wgt-clock': `
    <div id="clock" style="display:flex;align-items:center;justify-content:center;height:100%;font-family:var(--sn-font-family,system-ui);font-size:2em;color:var(--sn-text,#EDEBE6);">
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
    <div style="padding:12px;height:100%;background:var(--sn-surface,#16161B);font-family:var(--sn-font-family,system-ui);font-size:14px;">
      <div contenteditable="true" style="outline:none;height:100%;color:var(--sn-text,#EDEBE6);">Type here...</div>
    </div>
    <script>
      StickerNest.register({ id: 'wgt-note', name: 'Sticky Note', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,

  'wgt-counter': `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-family:var(--sn-font-family,system-ui);gap:12px;">
      <span id="count" style="font-size:3em;font-weight:bold;color:var(--sn-text,#EDEBE6);">0</span>
      <div style="display:flex;gap:8px;">
        <button id="dec" style="padding:8px 16px;border:1px solid var(--sn-border,rgba(255,255,255,0.10));border-radius:var(--sn-radius,12px);background:var(--sn-surface,#16161B);cursor:pointer;font-size:1.2em;color:var(--sn-text,#EDEBE6);">-</button>
        <button id="inc" style="padding:8px 16px;border:1px solid var(--sn-border,rgba(255,255,255,0.10));border-radius:var(--sn-radius,12px);background:var(--sn-surface,#16161B);cursor:pointer;font-size:1.2em;color:var(--sn-text,#EDEBE6);">+</button>
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

  'wgt-timer': `
    <div id="timer-root" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-family:var(--sn-font-family,system-ui);gap:16px;color:var(--sn-text,#EDEBE6);">
      <div id="display" style="font-size:3em;font-weight:bold;font-variant-numeric:tabular-nums;">00:00</div>
      <div style="display:flex;gap:8px;">
        <button id="start" style="padding:8px 20px;border:none;border-radius:var(--sn-radius,12px);background:var(--sn-accent,#4E7B8E);color:#fff;cursor:pointer;font-size:14px;font-weight:600;">Start</button>
        <button id="reset" style="padding:8px 20px;border:1px solid var(--sn-border,rgba(255,255,255,0.10));border-radius:var(--sn-radius,12px);background:transparent;color:var(--sn-text,#EDEBE6);cursor:pointer;font-size:14px;">Reset</button>
      </div>
    </div>
    <script>
      var seconds = 0, interval = null, running = false;
      var display = document.getElementById('display');
      var startBtn = document.getElementById('start');
      function pad(n) { return n < 10 ? '0' + n : '' + n; }
      function render() { display.textContent = pad(Math.floor(seconds/60)) + ':' + pad(seconds%60); }
      startBtn.onclick = function() {
        if (running) { clearInterval(interval); startBtn.textContent = 'Start'; running = false; }
        else { interval = setInterval(function() { seconds++; render(); }, 1000); startBtn.textContent = 'Pause'; running = true; }
      };
      document.getElementById('reset').onclick = function() {
        clearInterval(interval); seconds = 0; running = false; startBtn.textContent = 'Start'; render();
      };
      render();
      StickerNest.register({ id: 'wgt-timer', name: 'Timer', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,

  'wgt-markdown': `
    <div id="md-root" style="padding:16px;height:100%;font-family:var(--sn-font-family,system-ui);color:var(--sn-text,#EDEBE6);overflow:auto;">
      <div id="content" style="line-height:1.6;"></div>
    </div>
    <script>
      var content = document.getElementById('content');
      // Simple markdown renderer
      function renderMd(md) {
        return md
          .replace(/^### (.+)$/gm, '<h3 style="margin:12px 0 8px;font-size:1.1em;">$1</h3>')
          .replace(/^## (.+)$/gm, '<h2 style="margin:16px 0 8px;font-size:1.3em;">$1</h2>')
          .replace(/^# (.+)$/gm, '<h1 style="margin:20px 0 10px;font-size:1.5em;">$1</h1>')
          .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
          .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
          .replace(/\`(.+?)\`/g, '<code style="background:var(--sn-surface-raised,#1E1E24);padding:2px 6px;border-radius:4px;font-size:0.9em;">$1</code>')
          .replace(/^- (.+)$/gm, '<li style="margin:4px 0;">$1</li>')
          .replace(/\\n/g, '<br>');
      }
      StickerNest.getConfig().then(function(cfg) {
        content.innerHTML = renderMd(cfg.content || '# Hello\\n\\nEdit the widget config to set markdown content.');
      });
      StickerNest.register({ id: 'wgt-markdown', name: 'Markdown Viewer', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,

  'wgt-image': `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;background:var(--sn-surface,#16161B);overflow:hidden;">
      <img id="img" style="max-width:100%;max-height:100%;object-fit:contain;" />
      <div id="placeholder" style="color:var(--sn-text-muted,#8A8796);font-family:var(--sn-font-family,system-ui);font-size:14px;">No image set</div>
    </div>
    <script>
      var img = document.getElementById('img');
      var placeholder = document.getElementById('placeholder');
      StickerNest.getConfig().then(function(cfg) {
        if (cfg.src) { img.src = cfg.src; img.alt = cfg.alt || 'Image'; placeholder.style.display = 'none'; }
        else { img.style.display = 'none'; }
      });
      StickerNest.register({ id: 'wgt-image', name: 'Image Viewer', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,
};

/** Template names available for widget_create_html */
export const TEMPLATE_NAMES = Object.keys(WIDGET_HTML_TEMPLATES);
