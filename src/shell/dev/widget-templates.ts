/**
 * Widget HTML Templates — pure data, no React
 * Extracted from TestHarness.tsx
 *
 * @module shell/dev
 * @layer L6
 */

import type { ThemeTokens } from '../../runtime/bridge/message-types';

// ============================================================================
// Test Widget HTML Templates
// ============================================================================

export const COUNTER_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Counter Widget</title></head>
<body style="margin:0;padding:10px;font-family:sans-serif;">
  <div id="app">
    <h4 style="margin:0 0 10px">Counter</h4>
    <button id="dec">-</button>
    <span id="count" style="margin:0 10px;font-size:20px">0</span>
    <button id="inc">+</button>
  </div>
  <script>
    let count = 0;
    const update = () => document.getElementById('count').textContent = count;
    document.getElementById('inc').onclick = () => { count++; update(); window.StickerNest?.emit('counter.changed', { count, delta: 1 }); };
    document.getElementById('dec').onclick = () => { count--; update(); window.StickerNest?.emit('counter.changed', { count, delta: -1 }); };
    window.StickerNest?.subscribe('counter.set', (payload) => { count = payload.value; update(); });
    window.StickerNest?.register({ id: 'counter-widget', name: 'Counter', version: '1.0.0' });
    window.StickerNest?.ready();
  </script>
</body>
</html>
`;

export const DISPLAY_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Display Widget</title></head>
<body style="margin:0;padding:10px;font-family:sans-serif;background:#f0f0f0;">
  <div id="app">
    <h4 style="margin:0 0 10px">Display</h4>
    <div id="value" style="font-size:24px;font-weight:bold">--</div>
    <div id="log" style="font-size:10px;max-height:60px;overflow:auto;margin-top:5px"></div>
  </div>
  <script>
    const log = (msg) => { document.getElementById('log').innerHTML += msg + '<br>'; };
    window.StickerNest?.subscribe('counter.changed', (payload) => {
      document.getElementById('value').textContent = payload.count;
      log('Received: ' + payload.count);
    });
    window.StickerNest?.subscribe('display.ping', () => {
      window.StickerNest?.emit('display.pong', { timestamp: Date.now() });
      log('Pong sent');
    });
    window.StickerNest?.register({ id: 'display-widget', name: 'Display', version: '1.0.0' });
    window.StickerNest?.ready();
  </script>
</body>
</html>
`;

export const CLOCK_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Clock Widget</title></head>
<body style="margin:0;padding:10px;font-family:monospace;background:#222;color:#0f0;">
  <div id="time" style="font-size:18px">00:00:00</div>
  <script>
    const update = () => {
      const now = new Date();
      document.getElementById('time').textContent = now.toLocaleTimeString();
      window.StickerNest?.emit('clock.tick', { time: now.toISOString() });
    };
    setInterval(update, 1000);
    update();
    window.StickerNest?.register({ id: 'clock-widget', name: 'Clock', version: '1.0.0' });
    window.StickerNest?.ready();
  </script>
</body>
</html>
`;

export const TEXT_TOOL_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Text Properties</title></head>
<body style="margin:0;padding:6px;font-family:sans-serif;background:#2a2a2a;color:#eee;font-size:11px;">
  <div id="app">
    <div style="margin-bottom:6px;color:#888;font-size:9px;">CHARACTER</div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <select id="fontSize" style="padding:3px;background:#444;color:#fff;border:1px solid #555;flex:1;">
        <option value="10">10</option>
        <option value="12">12</option>
        <option value="14">14</option>
        <option value="16" selected>16</option>
        <option value="18">18</option>
        <option value="20">20</option>
        <option value="24">24</option>
        <option value="32">32</option>
        <option value="48">48</option>
        <option value="72">72</option>
      </select>
      <span style="color:#666;font-size:9px;">px</span>
    </div>
    <div style="display:flex;gap:2px;margin-bottom:8px;">
      <button id="bold" style="font-weight:bold;width:26px;height:24px;background:#444;color:#fff;border:1px solid #555;cursor:pointer;">B</button>
      <button id="italic" style="font-style:italic;width:26px;height:24px;background:#444;color:#fff;border:1px solid #555;cursor:pointer;">I</button>
      <button id="underline" style="text-decoration:underline;width:26px;height:24px;background:#444;color:#fff;border:1px solid #555;cursor:pointer;">U</button>
    </div>
    <div style="display:flex;gap:4px;align-items:center;margin-bottom:6px;">
      <span style="color:#888;font-size:9px;">COLOR</span>
      <div id="colorSwatch" style="width:20px;height:20px;background:#000;border:1px solid #555;"></div>
      <span id="colorHex" style="color:#888;font-size:9px;">#000000</span>
    </div>
    <div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
      <div style="color:#888;font-size:9px;margin-bottom:4px;">SELECTION</div>
      <div id="selectionInfo" style="color:#aaa;font-size:10px;">No text selected</div>
    </div>
  </div>
  <script>
    let state = { text: '', fontSize: 16, bold: false, italic: false, underline: false, color: '#000000' };

    const updateUI = () => {
      document.getElementById('fontSize').value = state.fontSize;
      document.getElementById('bold').style.background = state.bold ? '#0066cc' : '#444';
      document.getElementById('italic').style.background = state.italic ? '#0066cc' : '#444';
      document.getElementById('underline').style.background = state.underline ? '#0066cc' : '#444';
      document.getElementById('colorSwatch').style.background = state.color;
      document.getElementById('colorHex').textContent = state.color;
    };

    const emitChange = () => {
      window.StickerNest?.emit('text.props.changed', { fontSize: state.fontSize, bold: state.bold, italic: state.italic, underline: state.underline, color: state.color });
    };

    document.getElementById('fontSize').onchange = (e) => { state.fontSize = parseInt(e.target.value); updateUI(); emitChange(); };
    document.getElementById('bold').onclick = () => { state.bold = !state.bold; updateUI(); emitChange(); };
    document.getElementById('italic').onclick = () => { state.italic = !state.italic; updateUI(); emitChange(); };
    document.getElementById('underline').onclick = () => { state.underline = !state.underline; updateUI(); emitChange(); };

    // Subscribe to selection sync from canvas
    window.StickerNest?.subscribe('text.selection.sync', (payload) => {
      if (payload.fontSize !== undefined) state.fontSize = payload.fontSize;
      if (payload.bold !== undefined) state.bold = payload.bold;
      if (payload.italic !== undefined) state.italic = payload.italic;
      if (payload.underline !== undefined) state.underline = payload.underline;
      if (payload.color !== undefined) state.color = payload.color;
      document.getElementById('selectionInfo').textContent = payload.text ? '"' + payload.text.substring(0, 20) + (payload.text.length > 20 ? '...' : '') + '"' : 'No text selected';
      updateUI();
    });

    // Subscribe to color changes from color picker
    window.StickerNest?.subscribe('text.color.set', (payload) => {
      state.color = payload.color;
      updateUI();
      emitChange();
    });

    // Subscribe to deselection
    window.StickerNest?.subscribe('text.deselected', () => {
      document.getElementById('selectionInfo').textContent = 'No text selected';
    });

    window.StickerNest?.register({ id: 'text-tool-widget', name: 'Text Properties', version: '1.0.0' });
    window.StickerNest?.ready();
    updateUI();
  </script>
</body>
</html>
`;

export const COLOR_PICKER_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Color Picker Widget</title></head>
<body style="margin:0;padding:8px;font-family:sans-serif;background:#f5f5f5;">
  <div id="app">
    <div style="margin-bottom:8px;">
      <label style="font-size:12px;font-weight:bold;">Target:</label>
      <div style="display:flex;gap:4px;margin-top:4px;">
        <button id="targetCanvas" style="flex:1;padding:4px;background:#4CAF50;color:#fff;border:none;cursor:pointer;">Canvas BG</button>
        <button id="targetText" style="flex:1;padding:4px;background:#666;color:#fff;border:none;cursor:pointer;">Text Color</button>
      </div>
    </div>
    <div style="margin-bottom:8px;">
      <input type="color" id="colorPicker" value="#ff6600" style="width:100%;height:40px;cursor:pointer;border:none;" />
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
      <div class="preset" style="width:20px;height:20px;background:#ff0000;cursor:pointer;border:1px solid #999;" data-color="#ff0000"></div>
      <div class="preset" style="width:20px;height:20px;background:#00ff00;cursor:pointer;border:1px solid #999;" data-color="#00ff00"></div>
      <div class="preset" style="width:20px;height:20px;background:#0000ff;cursor:pointer;border:1px solid #999;" data-color="#0000ff"></div>
      <div class="preset" style="width:20px;height:20px;background:#ffff00;cursor:pointer;border:1px solid #999;" data-color="#ffff00"></div>
      <div class="preset" style="width:20px;height:20px;background:#ff00ff;cursor:pointer;border:1px solid #999;" data-color="#ff00ff"></div>
      <div class="preset" style="width:20px;height:20px;background:#00ffff;cursor:pointer;border:1px solid #999;" data-color="#00ffff"></div>
      <div class="preset" style="width:20px;height:20px;background:#000000;cursor:pointer;border:1px solid #999;" data-color="#000000"></div>
      <div class="preset" style="width:20px;height:20px;background:#ffffff;cursor:pointer;border:1px solid #999;" data-color="#ffffff"></div>
    </div>
    <div id="current" style="padding:4px;font-size:10px;text-align:center;border:1px solid #ccc;background:#fff;">
      Color: <span id="colorValue">#ff6600</span> → <span id="targetValue">Canvas BG</span>
    </div>
    <div id="log" style="font-size:9px;color:#666;margin-top:4px;max-height:30px;overflow:auto;"></div>
  </div>
  <script>
    let currentColor = '#ff6600';
    let target = 'canvas'; // 'canvas' or 'text'
    const log = (msg) => { document.getElementById('log').innerHTML = msg + '<br>' + document.getElementById('log').innerHTML; };

    const updateDisplay = () => {
      document.getElementById('colorValue').textContent = currentColor;
      document.getElementById('targetValue').textContent = target === 'canvas' ? 'Canvas BG' : 'Text Color';
      document.getElementById('targetCanvas').style.background = target === 'canvas' ? '#4CAF50' : '#666';
      document.getElementById('targetText').style.background = target === 'text' ? '#2196F3' : '#666';
    };

    const emitColor = () => {
      if (target === 'canvas') {
        window.StickerNest?.emit('canvas.bgcolor.set', { color: currentColor });
        log('Emit canvas bg: ' + currentColor);
      } else {
        window.StickerNest?.emit('text.color.set', { color: currentColor });
        log('Emit text color: ' + currentColor);
      }
    };

    document.getElementById('targetCanvas').onclick = () => { target = 'canvas'; updateDisplay(); };
    document.getElementById('targetText').onclick = () => { target = 'text'; updateDisplay(); };

    document.getElementById('colorPicker').oninput = (e) => {
      currentColor = e.target.value;
      updateDisplay();
      emitColor();
    };

    document.querySelectorAll('.preset').forEach(el => {
      el.onclick = () => {
        currentColor = el.dataset.color;
        document.getElementById('colorPicker').value = currentColor;
        updateDisplay();
        emitColor();
      };
    });

    // Subscribe to request current color
    window.StickerNest?.subscribe('color.get', () => {
      window.StickerNest?.emit('color.current', { color: currentColor, target });
    });

    window.StickerNest?.register({ id: 'color-picker-widget', name: 'Color Picker', version: '1.0.0' });
    window.StickerNest?.ready();
    updateDisplay();
  </script>
</body>
</html>
`;

export const SHAPE_PROPS_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Shape Properties</title></head>
<body style="margin:0;padding:6px;font-family:sans-serif;background:#2a2a2a;color:#eee;font-size:11px;">
  <div id="app">
    <div style="margin-bottom:6px;color:#888;font-size:9px;">SHAPE</div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:40px;">Fill</span>
      <input type="color" id="fill" value="#4CAF50" style="width:30px;height:20px;border:none;cursor:pointer;" />
      <span id="fillHex" style="color:#666;font-size:9px;flex:1;">#4CAF50</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:40px;">Stroke</span>
      <input type="color" id="stroke" value="#333333" style="width:30px;height:20px;border:none;cursor:pointer;" />
      <span id="strokeHex" style="color:#666;font-size:9px;flex:1;">#333333</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:40px;">Width</span>
      <input type="range" id="strokeWidth" min="0" max="10" value="2" style="flex:1;" />
      <span id="strokeWidthVal" style="color:#666;font-size:9px;width:20px;">2</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:40px;">Radius</span>
      <input type="range" id="borderRadius" min="0" max="50" value="0" style="flex:1;" />
      <span id="borderRadiusVal" style="color:#666;font-size:9px;width:20px;">0</span>
    </div>
    <div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
      <div style="color:#888;font-size:9px;margin-bottom:4px;">SELECTION</div>
      <div id="selectionInfo" style="color:#aaa;font-size:10px;">No shape selected</div>
    </div>
  </div>
  <script>
    let state = { fill: '#4CAF50', stroke: '#333333', strokeWidth: 2, borderRadius: 0 };

    const updateUI = () => {
      document.getElementById('fill').value = state.fill;
      document.getElementById('fillHex').textContent = state.fill;
      document.getElementById('stroke').value = state.stroke;
      document.getElementById('strokeHex').textContent = state.stroke;
      document.getElementById('strokeWidth').value = state.strokeWidth;
      document.getElementById('strokeWidthVal').textContent = state.strokeWidth;
      document.getElementById('borderRadius').value = state.borderRadius;
      document.getElementById('borderRadiusVal').textContent = state.borderRadius;
    };

    const emitChange = () => {
      window.StickerNest?.emit('shape.props.changed', state);
    };

    document.getElementById('fill').oninput = (e) => { state.fill = e.target.value; updateUI(); emitChange(); };
    document.getElementById('stroke').oninput = (e) => { state.stroke = e.target.value; updateUI(); emitChange(); };
    document.getElementById('strokeWidth').oninput = (e) => { state.strokeWidth = parseInt(e.target.value); updateUI(); emitChange(); };
    document.getElementById('borderRadius').oninput = (e) => { state.borderRadius = parseInt(e.target.value); updateUI(); emitChange(); };

    window.StickerNest?.subscribe('shape.selection.sync', (payload) => {
      if (payload.fill !== undefined) state.fill = payload.fill;
      if (payload.stroke !== undefined) state.stroke = payload.stroke;
      if (payload.strokeWidth !== undefined) state.strokeWidth = payload.strokeWidth;
      if (payload.borderRadius !== undefined) state.borderRadius = payload.borderRadius;
      document.getElementById('selectionInfo').textContent = payload.type ? payload.type + ' selected' : 'No shape selected';
      updateUI();
    });

    window.StickerNest?.subscribe('shape.deselected', () => {
      document.getElementById('selectionInfo').textContent = 'No shape selected';
    });

    window.StickerNest?.register({ id: 'shape-props-widget', name: 'Shape Properties', version: '1.0.0' });
    window.StickerNest?.ready();
    updateUI();
  </script>
</body>
</html>
`;

export const IMAGE_PROPS_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Image Properties</title></head>
<body style="margin:0;padding:6px;font-family:sans-serif;background:#2a2a2a;color:#eee;font-size:11px;">
  <div id="app">
    <div style="margin-bottom:6px;color:#888;font-size:9px;">IMAGE</div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:50px;">Opacity</span>
      <input type="range" id="opacity" min="0" max="100" value="100" style="flex:1;" />
      <span id="opacityVal" style="color:#666;font-size:9px;width:30px;">100%</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:50px;">Brightness</span>
      <input type="range" id="brightness" min="0" max="200" value="100" style="flex:1;" />
      <span id="brightnessVal" style="color:#666;font-size:9px;width:30px;">100%</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:50px;">Blur</span>
      <input type="range" id="blur" min="0" max="20" value="0" style="flex:1;" />
      <span id="blurVal" style="color:#666;font-size:9px;width:30px;">0px</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:50px;">Fit</span>
      <select id="fit" style="flex:1;padding:2px;background:#444;color:#fff;border:1px solid #555;">
        <option value="cover">Cover</option>
        <option value="contain">Contain</option>
        <option value="fill">Fill</option>
      </select>
    </div>
    <div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
      <div style="color:#888;font-size:9px;margin-bottom:4px;">SELECTION</div>
      <div id="selectionInfo" style="color:#aaa;font-size:10px;">No image selected</div>
    </div>
  </div>
  <script>
    let state = { opacity: 100, brightness: 100, blur: 0, fit: 'cover' };

    const updateUI = () => {
      document.getElementById('opacity').value = state.opacity;
      document.getElementById('opacityVal').textContent = state.opacity + '%';
      document.getElementById('brightness').value = state.brightness;
      document.getElementById('brightnessVal').textContent = state.brightness + '%';
      document.getElementById('blur').value = state.blur;
      document.getElementById('blurVal').textContent = state.blur + 'px';
      document.getElementById('fit').value = state.fit;
    };

    const emitChange = () => {
      window.StickerNest?.emit('image.props.changed', state);
    };

    document.getElementById('opacity').oninput = (e) => { state.opacity = parseInt(e.target.value); updateUI(); emitChange(); };
    document.getElementById('brightness').oninput = (e) => { state.brightness = parseInt(e.target.value); updateUI(); emitChange(); };
    document.getElementById('blur').oninput = (e) => { state.blur = parseInt(e.target.value); updateUI(); emitChange(); };
    document.getElementById('fit').onchange = (e) => { state.fit = e.target.value; updateUI(); emitChange(); };

    window.StickerNest?.subscribe('image.selection.sync', (payload) => {
      if (payload.opacity !== undefined) state.opacity = payload.opacity;
      if (payload.brightness !== undefined) state.brightness = payload.brightness;
      if (payload.blur !== undefined) state.blur = payload.blur;
      if (payload.fit !== undefined) state.fit = payload.fit;
      document.getElementById('selectionInfo').textContent = payload.src ? 'Image: ' + payload.src.substring(0, 15) + '...' : 'No image selected';
      updateUI();
    });

    window.StickerNest?.subscribe('image.deselected', () => {
      document.getElementById('selectionInfo').textContent = 'No image selected';
    });

    window.StickerNest?.register({ id: 'image-props-widget', name: 'Image Properties', version: '1.0.0' });
    window.StickerNest?.ready();
    updateUI();
  </script>
</body>
</html>
`;

export const COUNTER_DISPLAY_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Counter Display</title></head>
<body style="margin:0;padding:6px;font-family:sans-serif;background:#1a1a2e;color:#eee;font-size:11px;">
  <div id="app">
    <div style="margin-bottom:6px;color:#888;font-size:9px;">COUNTER CONTROL</div>
    <div style="display:flex;gap:4px;margin-bottom:8px;justify-content:center;">
      <button id="dec" style="width:36px;height:36px;font-size:20px;background:#e74c3c;color:#fff;border:none;cursor:pointer;border-radius:4px;">\u2212</button>
      <div id="value" style="width:60px;height:36px;line-height:36px;text-align:center;font-size:24px;font-weight:bold;background:#16213e;border-radius:4px;">0</div>
      <button id="inc" style="width:36px;height:36px;font-size:20px;background:#27ae60;color:#fff;border:none;cursor:pointer;border-radius:4px;">+</button>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;">
      <button id="reset" style="flex:1;padding:4px;background:#444;color:#fff;border:none;cursor:pointer;font-size:10px;">Reset</button>
      <button id="random" style="flex:1;padding:4px;background:#444;color:#fff;border:none;cursor:pointer;font-size:10px;">Random</button>
    </div>
    <div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
      <div style="color:#888;font-size:9px;margin-bottom:4px;">SELECTION</div>
      <div id="selectionInfo" style="color:#aaa;font-size:10px;">No counter selected</div>
    </div>
  </div>
  <script>
    let value = 0;
    let selectedId = null;

    const updateUI = () => {
      document.getElementById('value').textContent = value;
    };

    const emitChange = () => {
      window.StickerNest?.emit('counter.entity.changed', { value });
    };

    document.getElementById('inc').onclick = () => { value++; updateUI(); emitChange(); };
    document.getElementById('dec').onclick = () => { value--; updateUI(); emitChange(); };
    document.getElementById('reset').onclick = () => { value = 0; updateUI(); emitChange(); };
    document.getElementById('random').onclick = () => { value = Math.floor(Math.random() * 100); updateUI(); emitChange(); };

    window.StickerNest?.subscribe('counter.selection.sync', (payload) => {
      if (payload.value !== undefined) value = payload.value;
      selectedId = payload.id;
      document.getElementById('selectionInfo').textContent = payload.id ? 'Counter #' + payload.id.slice(-4) : 'No counter selected';
      updateUI();
    });

    window.StickerNest?.subscribe('counter.deselected', () => {
      document.getElementById('selectionInfo').textContent = 'No counter selected';
      selectedId = null;
    });

    window.StickerNest?.register({ id: 'counter-display-widget', name: 'Counter Control', version: '1.0.0' });
    window.StickerNest?.ready();
    updateUI();
  </script>
</body>
</html>
`;

// ============================================================================
// Pen Tool Widget Templates
// ============================================================================

export const PEN_PROPS_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Pen Properties</title></head>
<body style="margin:0;padding:6px;font-family:sans-serif;background:#2a2a2a;color:#eee;font-size:11px;">
  <div id="app">
    <div style="margin-bottom:6px;color:#888;font-size:9px;">STROKE</div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:50px;">Color</span>
      <input type="color" id="stroke" value="#333333" style="width:30px;height:20px;border:none;cursor:pointer;" />
      <span id="strokeHex" style="color:#666;font-size:9px;flex:1;">#333333</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:50px;">Width</span>
      <input type="range" id="strokeWidth" min="1" max="20" value="2" style="flex:1;" />
      <span id="strokeWidthVal" style="color:#666;font-size:9px;width:24px;">2px</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:50px;">Smooth</span>
      <input type="range" id="smoothing" min="0" max="100" value="50" style="flex:1;" />
      <span id="smoothingVal" style="color:#666;font-size:9px;width:24px;">0.5</span>
    </div>
    <div style="display:flex;gap:2px;margin-bottom:8px;">
      <div class="preset" style="width:20px;height:20px;background:#ffffff;cursor:pointer;border:1px solid #555;" data-color="#ffffff"></div>
      <div class="preset" style="width:20px;height:20px;background:#ff0000;cursor:pointer;border:1px solid #555;" data-color="#ff0000"></div>
      <div class="preset" style="width:20px;height:20px;background:#00ff00;cursor:pointer;border:1px solid #555;" data-color="#00ff00"></div>
      <div class="preset" style="width:20px;height:20px;background:#0088ff;cursor:pointer;border:1px solid #555;" data-color="#0088ff"></div>
      <div class="preset" style="width:20px;height:20px;background:#ffff00;cursor:pointer;border:1px solid #555;" data-color="#ffff00"></div>
      <div class="preset" style="width:20px;height:20px;background:#ff00ff;cursor:pointer;border:1px solid #555;" data-color="#ff00ff"></div>
      <div class="preset" style="width:20px;height:20px;background:#000000;cursor:pointer;border:1px solid #555;" data-color="#000000"></div>
    </div>
    <div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
      <div style="color:#888;font-size:9px;margin-bottom:4px;">SELECTION</div>
      <div id="selectionInfo" style="color:#aaa;font-size:10px;">No drawing selected</div>
    </div>
  </div>
  <script>
    let state = { stroke: '#333333', strokeWidth: 2, smoothing: 0.5 };

    const updateUI = () => {
      document.getElementById('stroke').value = state.stroke;
      document.getElementById('strokeHex').textContent = state.stroke;
      document.getElementById('strokeWidth').value = state.strokeWidth;
      document.getElementById('strokeWidthVal').textContent = state.strokeWidth + 'px';
      document.getElementById('smoothing').value = Math.round(state.smoothing * 100);
      document.getElementById('smoothingVal').textContent = state.smoothing.toFixed(1);
    };

    const emitChange = () => {
      window.StickerNest?.emit('drawing.props.changed', state);
    };

    document.getElementById('stroke').oninput = (e) => { state.stroke = e.target.value; updateUI(); emitChange(); };
    document.getElementById('strokeWidth').oninput = (e) => { state.strokeWidth = parseInt(e.target.value); updateUI(); emitChange(); };
    document.getElementById('smoothing').oninput = (e) => { state.smoothing = parseInt(e.target.value) / 100; updateUI(); emitChange(); };

    document.querySelectorAll('.preset').forEach(el => {
      el.onclick = () => {
        state.stroke = el.dataset.color;
        document.getElementById('stroke').value = state.stroke;
        updateUI();
        emitChange();
      };
    });

    window.StickerNest?.subscribe('drawing.selection.sync', (payload) => {
      if (payload.stroke !== undefined) state.stroke = payload.stroke;
      if (payload.strokeWidth !== undefined) state.strokeWidth = payload.strokeWidth;
      if (payload.smoothing !== undefined) state.smoothing = payload.smoothing;
      document.getElementById('selectionInfo').textContent = payload.pointCount ? payload.pointCount + ' points selected' : 'No drawing selected';
      updateUI();
    });

    window.StickerNest?.subscribe('drawing.deselected', () => {
      document.getElementById('selectionInfo').textContent = 'No drawing selected';
    });

    window.StickerNest?.register({ id: 'pen-props-widget', name: 'Pen Properties', version: '1.0.0' });
    window.StickerNest?.ready();
    updateUI();
  </script>
</body>
</html>
`;

// ============================================================================
// Game Map Widget Templates
// ============================================================================

export const TILE_PALETTE_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Tile Palette</title></head>
<body style="margin:0;padding:6px;font-family:sans-serif;background:#1e1e2e;color:#eee;font-size:11px;">
  <div id="app">
    <div style="margin-bottom:6px;color:#888;font-size:9px;">TILE PALETTE</div>
    <div id="tiles" style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;margin-bottom:8px;"></div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:40px;">Custom</span>
      <input type="color" id="customColor" value="#4CAF50" style="width:30px;height:20px;border:none;cursor:pointer;" />
      <button id="addCustom" style="flex:1;padding:2px;background:#444;color:#fff;border:none;cursor:pointer;font-size:9px;">Add</button>
    </div>
    <div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
      <div style="color:#888;font-size:9px;margin-bottom:4px;">SELECTED</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <div id="selectedPreview" style="width:24px;height:24px;border:2px solid #fff;border-radius:4px;background:#4CAF50;"></div>
        <span id="selectedName" style="color:#aaa;font-size:10px;">Grass</span>
      </div>
    </div>
  </div>
  <script>
    const defaultTiles = [
      { id: 'grass', color: '#4CAF50', name: 'Grass' },
      { id: 'water', color: '#2196F3', name: 'Water' },
      { id: 'sand', color: '#FFC107', name: 'Sand' },
      { id: 'stone', color: '#9E9E9E', name: 'Stone' },
      { id: 'dirt', color: '#795548', name: 'Dirt' },
      { id: 'snow', color: '#ECEFF1', name: 'Snow' },
      { id: 'lava', color: '#FF5722', name: 'Lava' },
      { id: 'void', color: '#212121', name: 'Void' },
    ];
    let tiles = [...defaultTiles];
    let selected = tiles[0];

    const renderPalette = () => {
      const container = document.getElementById('tiles');
      container.innerHTML = '';
      tiles.forEach(tile => {
        const el = document.createElement('div');
        el.style.cssText = 'width:100%;aspect-ratio:1;background:' + tile.color + ';border:2px solid ' + (selected.id === tile.id ? '#fff' : 'transparent') + ';border-radius:4px;cursor:pointer;';
        el.title = tile.name;
        el.onclick = () => selectTile(tile);
        container.appendChild(el);
      });
    };

    const selectTile = (tile) => {
      selected = tile;
      document.getElementById('selectedPreview').style.background = tile.color;
      document.getElementById('selectedName').textContent = tile.name;
      renderPalette();
      window.StickerNest?.emit('map.tile.selected', { tile });
    };

    document.getElementById('addCustom').onclick = () => {
      const color = document.getElementById('customColor').value;
      const newTile = { id: 'custom-' + Date.now(), color, name: 'Custom' };
      tiles.push(newTile);
      selectTile(newTile);
    };

    window.StickerNest?.subscribe('map.tile.sync', (payload) => {
      if (payload.tile) {
        selected = payload.tile;
        document.getElementById('selectedPreview').style.background = selected.color;
        document.getElementById('selectedName').textContent = selected.name;
        renderPalette();
      }
    });

    window.StickerNest?.register({ id: 'tile-palette-widget', name: 'Tile Palette', version: '1.0.0' });
    window.StickerNest?.ready();
    renderPalette();
  </script>
</body>
</html>
`;

export const MAP_PROPS_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Map Properties</title></head>
<body style="margin:0;padding:6px;font-family:sans-serif;background:#1e1e2e;color:#eee;font-size:11px;">
  <div id="app">
    <div style="margin-bottom:6px;color:#888;font-size:9px;">MAP PROPERTIES</div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:50px;">Columns</span>
      <input type="number" id="cols" min="4" max="32" value="16" style="flex:1;padding:2px;background:#333;color:#fff;border:1px solid #555;width:50px;" />
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:50px;">Rows</span>
      <input type="number" id="rows" min="4" max="32" value="12" style="flex:1;padding:2px;background:#333;color:#fff;border:1px solid #555;width:50px;" />
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:50px;">Cell Size</span>
      <input type="range" id="cellSize" min="16" max="48" value="24" style="flex:1;" />
      <span id="cellSizeVal" style="color:#666;font-size:9px;width:24px;">24</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
        <input type="checkbox" id="showGrid" checked style="margin:0;" />
        <span style="color:#888;font-size:9px;">Show Grid</span>
      </label>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;">
      <button id="clearMap" style="flex:1;padding:4px;background:#e74c3c;color:#fff;border:none;cursor:pointer;font-size:9px;">Clear Map</button>
      <button id="fillMap" style="flex:1;padding:4px;background:#27ae60;color:#fff;border:none;cursor:pointer;font-size:9px;">Fill All</button>
    </div>
    <div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
      <div style="color:#888;font-size:9px;margin-bottom:4px;">INFO</div>
      <div id="mapInfo" style="color:#aaa;font-size:10px;">16 \u00d7 12 = 192 cells</div>
    </div>
  </div>
  <script>
    let state = { cols: 16, rows: 12, cellSize: 24, showGrid: true };

    const updateInfo = () => {
      document.getElementById('mapInfo').textContent = state.cols + ' \u00d7 ' + state.rows + ' = ' + (state.cols * state.rows) + ' cells';
    };

    const emitChange = () => {
      window.StickerNest?.emit('map.props.changed', state);
    };

    document.getElementById('cols').oninput = (e) => { state.cols = parseInt(e.target.value) || 16; updateInfo(); emitChange(); };
    document.getElementById('rows').oninput = (e) => { state.rows = parseInt(e.target.value) || 12; updateInfo(); emitChange(); };
    document.getElementById('cellSize').oninput = (e) => {
      state.cellSize = parseInt(e.target.value);
      document.getElementById('cellSizeVal').textContent = state.cellSize;
      emitChange();
    };
    document.getElementById('showGrid').onchange = (e) => { state.showGrid = e.target.checked; emitChange(); };
    document.getElementById('clearMap').onclick = () => { window.StickerNest?.emit('map.clear', {}); };
    document.getElementById('fillMap').onclick = () => { window.StickerNest?.emit('map.fill', {}); };

    window.StickerNest?.subscribe('map.props.sync', (payload) => {
      if (payload.cols !== undefined) { state.cols = payload.cols; document.getElementById('cols').value = state.cols; }
      if (payload.rows !== undefined) { state.rows = payload.rows; document.getElementById('rows').value = state.rows; }
      if (payload.cellSize !== undefined) { state.cellSize = payload.cellSize; document.getElementById('cellSize').value = state.cellSize; document.getElementById('cellSizeVal').textContent = state.cellSize; }
      if (payload.showGrid !== undefined) { state.showGrid = payload.showGrid; document.getElementById('showGrid').checked = state.showGrid; }
      updateInfo();
    });

    window.StickerNest?.register({ id: 'map-props-widget', name: 'Map Properties', version: '1.0.0' });
    window.StickerNest?.ready();
    updateInfo();
  </script>
</body>
</html>
`;

export const BRUSH_TOOL_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Brush Tool</title></head>
<body style="margin:0;padding:6px;font-family:sans-serif;background:#1e1e2e;color:#eee;font-size:11px;">
  <div id="app">
    <div style="margin-bottom:6px;color:#888;font-size:9px;">BRUSH TOOL</div>
    <div style="display:flex;gap:4px;margin-bottom:8px;">
      <button id="modePaint" style="flex:1;padding:6px;background:#4CAF50;color:#fff;border:2px solid #fff;cursor:pointer;font-size:10px;border-radius:4px;">🖌 Paint</button>
      <button id="modeErase" style="flex:1;padding:6px;background:#444;color:#fff;border:2px solid transparent;cursor:pointer;font-size:10px;border-radius:4px;">🧹 Erase</button>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:50px;">Size</span>
      <input type="range" id="brushSize" min="1" max="5" value="1" style="flex:1;" />
      <span id="brushSizeVal" style="color:#666;font-size:9px;width:20px;">1\u00d71</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;">
      <button id="toolBucket" style="flex:1;padding:4px;background:#444;color:#fff;border:none;cursor:pointer;font-size:9px;">🪣 Fill</button>
      <button id="toolPicker" style="flex:1;padding:4px;background:#444;color:#fff;border:none;cursor:pointer;font-size:9px;">💉 Pick</button>
    </div>
    <div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
      <div style="color:#888;font-size:9px;margin-bottom:4px;">STATS</div>
      <div id="stats" style="color:#aaa;font-size:10px;">Tiles painted: 0</div>
    </div>
  </div>
  <script>
    let state = { mode: 'paint', brushSize: 1, tool: 'brush' };
    let paintCount = 0;

    const updateUI = () => {
      document.getElementById('modePaint').style.border = state.mode === 'paint' ? '2px solid #fff' : '2px solid transparent';
      document.getElementById('modePaint').style.background = state.mode === 'paint' ? '#4CAF50' : '#444';
      document.getElementById('modeErase').style.border = state.mode === 'erase' ? '2px solid #fff' : '2px solid transparent';
      document.getElementById('modeErase').style.background = state.mode === 'erase' ? '#e74c3c' : '#444';
      document.getElementById('brushSizeVal').textContent = state.brushSize + '\u00d7' + state.brushSize;
    };

    const emitChange = () => {
      window.StickerNest?.emit('map.brush.changed', state);
    };

    document.getElementById('modePaint').onclick = () => { state.mode = 'paint'; state.tool = 'brush'; updateUI(); emitChange(); };
    document.getElementById('modeErase').onclick = () => { state.mode = 'erase'; state.tool = 'brush'; updateUI(); emitChange(); };
    document.getElementById('brushSize').oninput = (e) => { state.brushSize = parseInt(e.target.value); updateUI(); emitChange(); };
    document.getElementById('toolBucket').onclick = () => { state.tool = 'bucket'; emitChange(); };
    document.getElementById('toolPicker').onclick = () => { state.tool = 'picker'; emitChange(); };

    window.StickerNest?.subscribe('map.brush.sync', (payload) => {
      if (payload.mode !== undefined) state.mode = payload.mode;
      if (payload.brushSize !== undefined) { state.brushSize = payload.brushSize; document.getElementById('brushSize').value = state.brushSize; }
      if (payload.tool !== undefined) state.tool = payload.tool;
      updateUI();
    });

    window.StickerNest?.subscribe('map.paint.count', (payload) => {
      paintCount = payload.count || 0;
      document.getElementById('stats').textContent = 'Tiles painted: ' + paintCount;
    });

    window.StickerNest?.register({ id: 'brush-tool-widget', name: 'Brush Tool', version: '1.0.0' });
    window.StickerNest?.ready();
    updateUI();
  </script>
</body>
</html>
`;

export const GAME_PLAYER_WIDGET_HTML = `
<html>
<head><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; overflow: hidden; font-family: monospace; }
  canvas { display: block; }
  #hud {
    position: absolute; top: 0; left: 0; right: 0;
    padding: 4px 8px; background: rgba(0,0,0,0.7);
    color: #0f0; font-size: 11px; display: flex; gap: 12px;
    z-index: 10;
  }
  #focus-msg {
    position: absolute; bottom: 8px; left: 0; right: 0;
    text-align: center; color: rgba(255,255,255,0.4); font-size: 10px;
    pointer-events: none; transition: opacity 0.3s;
  }
</style></head>
<body>
  <div id="hud">
    <span id="pos">Pos: 0,0</span>
    <span id="tile">Tile: empty</span>
    <span id="moves">Moves: 0</span>
    <span id="gridinfo">Grid: flat</span>
  </div>
  <canvas id="game"></canvas>
  <div id="focus-msg">Click here then use WASD or Arrow keys to move</div>
<script>
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
var mapData = null;
var gridType = 'flat';
var player = { row: 0, col: 0 };
var moveCount = 0;
var focused = false;
var WALKABLE = { grass: true, sand: true, dirt: true, snow: true, stone: true };
var TILE_COLORS = {
  grass: '#4CAF50', water: '#2196F3', sand: '#FFC107', stone: '#9E9E9E',
  dirt: '#795548', snow: '#ECEFF1', lava: '#FF5722', void: '#212121'
};
var SCALE_Y = { 'iso-classic': 0.57735, 'iso-top': 0.26795, 'iso-steep': 1.0, 'iso-diamond': 0.5 };

function resize() {
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;
  draw();
}

function getTileAt(r, c) {
  if (!mapData || !mapData.tiles) return null;
  if (r < 0 || r >= mapData.rows || c < 0 || c >= mapData.cols) return null;
  return mapData.tiles[r] ? mapData.tiles[r][c] : null;
}

function canWalk(r, c) {
  if (!mapData) return false;
  if (r < 0 || r >= mapData.rows || c < 0 || c >= mapData.cols) return false;
  var tile = getTileAt(r, c);
  if (!tile) return true;
  return !!WALKABLE[tile.id];
}

function isoPos(r, c, tw, th, ox, oy) {
  return {
    x: ox + (c - r) * tw / 2,
    y: oy + (c + r) * th / 2
  };
}

function drawDiamond(cx, cy, tw, th) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - th / 2);
  ctx.lineTo(cx + tw / 2, cy);
  ctx.lineTo(cx, cy + th / 2);
  ctx.lineTo(cx - tw / 2, cy);
  ctx.closePath();
}

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!mapData) {
    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for map data...', canvas.width / 2, canvas.height / 2);
    ctx.fillText('Paint some tiles first!', canvas.width / 2, canvas.height / 2 + 20);
    return;
  }

  var cols = mapData.cols;
  var rows = mapData.rows;

  if (gridType !== 'flat') {
    // Isometric diamond rendering
    var scaleRatio = SCALE_Y[gridType] || 0.5;
    var tw = Math.min(canvas.width / (cols + rows) * 1.8, (canvas.height - 30) / (cols + rows) * 2.5 / scaleRatio);
    var th = tw * scaleRatio;
    var ox = canvas.width / 2;
    var oy = 24 + th;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var tile = getTileAt(r, c);
        var pos = isoPos(r, c, tw, th, ox, oy);
        if (tile) {
          ctx.fillStyle = tile.color || TILE_COLORS[tile.id] || '#333';
        } else {
          ctx.fillStyle = '#2a2a3e';
        }
        drawDiamond(pos.x, pos.y, tw - 1, th - 1);
        ctx.fill();
        // Depth sides
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y + th / 2 - 0.5);
        ctx.lineTo(pos.x + tw / 2 - 0.5, pos.y);
        ctx.lineTo(pos.x + tw / 2 - 0.5, pos.y + 3);
        ctx.lineTo(pos.x, pos.y + th / 2 + 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y + th / 2 - 0.5);
        ctx.lineTo(pos.x - tw / 2 + 0.5, pos.y);
        ctx.lineTo(pos.x - tw / 2 + 0.5, pos.y + 3);
        ctx.lineTo(pos.x, pos.y + th / 2 + 2.5);
        ctx.closePath();
        ctx.fill();
        // X mark on unwalkable tiles
        if (tile && !WALKABLE[tile.id]) {
          ctx.strokeStyle = 'rgba(255,0,0,0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pos.x - tw * 0.2, pos.y - th * 0.15);
          ctx.lineTo(pos.x + tw * 0.2, pos.y + th * 0.15);
          ctx.moveTo(pos.x + tw * 0.2, pos.y - th * 0.15);
          ctx.lineTo(pos.x - tw * 0.2, pos.y + th * 0.15);
          ctx.stroke();
        }
        // Grid outline
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        drawDiamond(pos.x, pos.y, tw - 1, th - 1);
        ctx.stroke();
      }
    }

    // Player in iso mode
    var pp = isoPos(player.row, player.col, tw, th, ox, oy);
    ctx.fillStyle = '#FF4081';
    ctx.shadowColor = '#FF4081';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(pp.x, pp.y - 3, tw * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = Math.max(8, tw * 0.18) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', pp.x, pp.y - 3);
  } else {
    // Flat square rendering (original)
    var cellW = canvas.width / cols;
    var cellH = (canvas.height - 20) / rows;
    var cell = Math.min(cellW, cellH);
    var offsetX = (canvas.width - cols * cell) / 2;
    var offsetY = 20 + (canvas.height - 20 - rows * cell) / 2;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var tile = getTileAt(r, c);
        var x = offsetX + c * cell;
        var y = offsetY + r * cell;
        if (tile) {
          ctx.fillStyle = tile.color || TILE_COLORS[tile.id] || '#333';
        } else {
          ctx.fillStyle = '#2a2a3e';
        }
        ctx.fillRect(x, y, cell - 1, cell - 1);
        if (tile && !WALKABLE[tile.id]) {
          ctx.strokeStyle = 'rgba(255,0,0,0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 2);
          ctx.lineTo(x + cell - 3, y + cell - 3);
          ctx.moveTo(x + cell - 3, y + 2);
          ctx.lineTo(x + 2, y + cell - 3);
          ctx.stroke();
        }
      }
    }

    var px = offsetX + player.col * cell;
    var py = offsetY + player.row * cell;
    var pad = cell * 0.15;
    ctx.fillStyle = '#FF4081';
    ctx.shadowColor = '#FF4081';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(px + cell / 2, py + cell / 2, cell / 2 - pad, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = Math.max(8, cell * 0.4) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', px + cell / 2, py + cell / 2);
  }
}

function updateHud() {
  var tile = getTileAt(player.row, player.col);
  document.getElementById('pos').textContent = 'Pos: ' + player.col + ',' + player.row;
  document.getElementById('tile').textContent = 'Tile: ' + (tile ? tile.name : 'empty');
  document.getElementById('moves').textContent = 'Moves: ' + moveCount;
  document.getElementById('gridinfo').textContent = 'Grid: ' + gridType + ' ' + (mapData ? mapData.cols + 'x' + mapData.rows : '');
}

function movePlayer(dr, dc) {
  var nr = player.row + dr;
  var nc = player.col + dc;
  if (canWalk(nr, nc)) {
    player.row = nr;
    player.col = nc;
    moveCount++;
    updateHud();
    draw();
    if (typeof StickerNest !== 'undefined') {
      var tile = getTileAt(nr, nc);
      StickerNest.emit('player.moved', {
        row: nr, col: nc,
        tileId: tile ? tile.id : null,
        tileName: tile ? tile.name : 'empty',
        moves: moveCount
      });
    }
  }
}

window.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); movePlayer(-1, 0); }
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); movePlayer(1, 0); }
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); movePlayer(0, -1); }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); movePlayer(0, 1); }
});

document.addEventListener('click', function() {
  focused = true;
  document.getElementById('focus-msg').style.opacity = '0';
});
document.addEventListener('blur', function() {
  focused = false;
  document.getElementById('focus-msg').style.opacity = '1';
});

window.addEventListener('resize', resize);
resize();

if (typeof StickerNest !== 'undefined') {
  StickerNest.register({ id: 'game-player', name: 'Game Player', version: '1.0.0' });
  StickerNest.subscribe('map.data', function(data) {
    mapData = data;
    gridType = data.gridType || 'flat';
    if (player.row >= data.rows) player.row = data.rows - 1;
    if (player.col >= data.cols) player.col = data.cols - 1;
    updateHud();
    draw();
  });
  StickerNest.subscribe('map.move', function(data) {
    if (data && typeof data.dr === 'number' && typeof data.dc === 'number') {
      movePlayer(data.dr, data.dc);
    }
  });
  StickerNest.ready();
}
</script>
</body>
</html>
`;

// ============================================================================
// Video Editing Widget Templates
// ============================================================================

export const VIDEO_PLAYER_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Video Player</title></head>
<body style="margin:0;padding:0;font-family:system-ui,sans-serif;background:#111;color:#eee;overflow:hidden;">
<style>
  * { box-sizing: border-box; }
  #container { width:100%; height:100%; display:flex; flex-direction:column; }
  #video-wrap { flex:1; position:relative; background:#000; display:flex; align-items:center; justify-content:center; min-height:0; }
  video { max-width:100%; max-height:100%; object-fit:contain; }
  #no-video { color:#666; font-size:12px; text-align:center; }
  #controls { display:flex; align-items:center; gap:4px; padding:4px 6px; background:#1a1a1a; border-top:1px solid #333; flex-shrink:0; }
  button { background:#333; color:#eee; border:1px solid #555; border-radius:3px; padding:2px 6px; cursor:pointer; font-size:11px; }
  button:hover { background:#444; }
  #time { font-size:10px; color:#aaa; font-family:monospace; white-space:nowrap; }
  #vol { width:50px; height:3px; accent-color:#0af; }
  #rate-sel { background:#333; color:#eee; border:1px solid #555; font-size:10px; border-radius:3px; }
</style>
<div id="container">
  <div id="video-wrap">
    <video id="vid" playsinline></video>
    <div id="no-video">No video loaded.<br>Use panel file picker or drop a file.</div>
  </div>
  <div id="controls">
    <button id="play-btn">Play</button>
    <span id="time">0:00 / 0:00</span>
    <input id="vol" type="range" min="0" max="1" step="0.05" value="1">
    <select id="rate-sel">
      <option value="0.25">0.25x</option>
      <option value="0.5">0.5x</option>
      <option value="1" selected>1x</option>
      <option value="1.5">1.5x</option>
      <option value="2">2x</option>
      <option value="4">4x</option>
    </select>
  </div>
</div>
<script>
(function() {
  var SN = window.StickerNest;
  var vid = document.getElementById('vid');
  var playBtn = document.getElementById('play-btn');
  var timeEl = document.getElementById('time');
  var volEl = document.getElementById('vol');
  var rateEl = document.getElementById('rate-sel');
  var noVideoEl = document.getElementById('no-video');
  var markers = [];
  var cuts = [];
  var speedSegments = [];
  var rafId = null;

  function fmt(s) {
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function emitTransport() {
    var state = vid.paused ? 'paused' : vid.ended ? 'stopped' : 'playing';
    SN.emit('video.transport.state', {
      state: state,
      currentTime: vid.currentTime,
      duration: vid.duration || 0,
      playbackRate: vid.playbackRate
    });
    timeEl.textContent = fmt(vid.currentTime) + ' / ' + fmt(vid.duration || 0);
    playBtn.textContent = vid.paused ? 'Play' : 'Pause';
  }

  function transportLoop() {
    emitTransport();
    // Apply speed segments
    for (var i = 0; i < speedSegments.length; i++) {
      var seg = speedSegments[i];
      if (vid.currentTime >= seg.startTime && vid.currentTime <= seg.endTime) {
        if (vid.playbackRate !== seg.rate) vid.playbackRate = seg.rate;
        return rafId = requestAnimationFrame(transportLoop);
      }
    }
    rafId = requestAnimationFrame(transportLoop);
  }

  function startLoop() { if (!rafId) rafId = requestAnimationFrame(transportLoop); }
  function stopLoop() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } emitTransport(); }

  vid.addEventListener('play', startLoop);
  vid.addEventListener('pause', stopLoop);
  vid.addEventListener('ended', function() { stopLoop(); SN.emit('video.transport.ended', { duration: vid.duration }); });
  vid.addEventListener('seeked', function() { SN.emit('video.transport.seeked', { currentTime: vid.currentTime, source: 'user' }); emitTransport(); });

  vid.addEventListener('loadedmetadata', function() {
    noVideoEl.style.display = 'none';
    vid.style.display = 'block';
    SN.emit('video.source.loaded', { duration: vid.duration, width: vid.videoWidth, height: vid.videoHeight, hasAudio: true });
    emitTransport();
  });

  vid.addEventListener('error', function() {
    SN.emit('video.source.error', { error: 'Failed to load video' });
  });

  playBtn.onclick = function() { vid.paused ? vid.play() : vid.pause(); };
  volEl.oninput = function() { vid.volume = parseFloat(volEl.value); SN.emit('video.transport.state', { volume: vid.volume }); };
  rateEl.onchange = function() {
    vid.playbackRate = parseFloat(rateEl.value);
    SN.emit('video.command.setRate', { rate: vid.playbackRate });
  };

  // Commands from other widgets
  SN.subscribe('video.command.play', function() { vid.play(); });
  SN.subscribe('video.command.pause', function() { vid.pause(); });
  SN.subscribe('video.command.seek', function(d) { if (d && typeof d.time === 'number') { vid.currentTime = d.time; } });
  SN.subscribe('video.command.setRate', function(d) {
    if (d && typeof d.rate === 'number') {
      vid.playbackRate = Math.max(0.25, Math.min(4, d.rate));
      rateEl.value = String(vid.playbackRate);
    }
  });
  SN.subscribe('video.command.setVolume', function(d) {
    if (d && typeof d.volume === 'number') { vid.volume = Math.max(0, Math.min(1, d.volume)); volEl.value = String(vid.volume); }
  });
  SN.subscribe('video.command.loadSource', function(d) {
    if (d && d.dataUrl) { vid.src = d.dataUrl; vid.load(); }
  });

  // Markers
  SN.subscribe('video.command.addMarker', function(d) {
    if (!d) return;
    markers.push({ id: 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2,6), time: d.time, label: d.label || '', color: d.color || '#ff0' });
    SN.emit('video.markers.changed', { markers: markers });
  });
  SN.subscribe('video.command.removeMarker', function(d) {
    if (!d) return;
    markers = markers.filter(function(m) { return m.id !== d.id; });
    SN.emit('video.markers.changed', { markers: markers });
  });

  // Cuts
  SN.subscribe('video.cut.add', function(d) {
    if (!d || typeof d.time !== 'number') return;
    cuts.push({ id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2,6), time: d.time });
    cuts.sort(function(a, b) { return a.time - b.time; });
    emitCutsChanged();
  });
  SN.subscribe('video.cut.remove', function(d) {
    if (!d) return;
    cuts = cuts.filter(function(c) { return c.id !== d.id; });
    emitCutsChanged();
  });
  function emitCutsChanged() {
    var segments = [];
    var sorted = cuts.slice().sort(function(a,b) { return a.time - b.time; });
    var prev = 0;
    for (var i = 0; i < sorted.length; i++) {
      segments.push({ start: prev, end: sorted[i].time, index: i });
      prev = sorted[i].time;
    }
    if (vid.duration) segments.push({ start: prev, end: vid.duration, index: sorted.length });
    SN.emit('video.cuts.changed', { cuts: cuts, segments: segments });
  }

  // Speed segments
  SN.subscribe('video.speed.setSegment', function(d) {
    if (!d) return;
    speedSegments.push({ id: 's-' + Date.now() + '-' + Math.random().toString(36).slice(2,6), startTime: d.startTime, endTime: d.endTime, rate: d.rate });
    SN.emit('video.speed.segments.changed', { segments: speedSegments });
  });
  SN.subscribe('video.speed.removeSegment', function(d) {
    if (!d) return;
    speedSegments = speedSegments.filter(function(s) { return s.id !== d.id; });
    SN.emit('video.speed.segments.changed', { segments: speedSegments });
  });

  // Init from config
  var cfg = SN.getConfig();
  if (cfg && cfg.videoUrl) { vid.src = cfg.videoUrl; vid.load(); }
  else { vid.style.display = 'none'; }

  SN.onThemeChange(function(t) {
    document.body.style.background = t['--sn-bg'] || '#111';
    document.body.style.color = t['--sn-text'] || '#eee';
  });
  SN.onResize(function(size) { /* video auto-fits via CSS */ });
  SN.register({ id: 'video-player', name: 'Video Player', version: '1.0.0' });
  SN.ready();
})();
</script>
</body>
</html>
`;

export const TIMELINE_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Timeline</title></head>
<body style="margin:0;padding:0;font-family:system-ui,sans-serif;background:#1a1a1a;color:#eee;overflow:hidden;">
<style>
  * { box-sizing: border-box; }
  #container { width:100%; height:100%; display:flex; flex-direction:column; }
  canvas { width:100%; flex:1; cursor:pointer; display:block; }
  #info { font-size:9px; color:#888; padding:2px 4px; background:#111; }
</style>
<div id="container">
  <canvas id="tl"></canvas>
  <div id="info">Click to seek | Shift+Click to add marker</div>
</div>
<script>
(function() {
  var SN = window.StickerNest;
  var canvas = document.getElementById('tl');
  var ctx = canvas.getContext('2d');
  var duration = 0, currentTime = 0, playbackRate = 1, isPlaying = false;
  var lastUpdateTime = 0, lastKnownTime = 0;
  var markers = [], cuts = [], speedSegments = [];
  var dragging = false;
  var W = 400, H = 80;

  function resize() {
    var r = canvas.parentElement.getBoundingClientRect();
    W = Math.floor(r.width) || 400;
    H = Math.floor(r.height - 20) || 60;
    canvas.width = W;
    canvas.height = H;
    draw();
  }

  function timeToX(t) { return duration > 0 ? (t / duration) * W : 0; }
  function xToTime(x) { return duration > 0 ? (x / W) * duration : 0; }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, W, H);

    if (duration <= 0) {
      ctx.fillStyle = '#555';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No video loaded', W/2, H/2);
      return;
    }

    // Speed segment regions
    for (var si = 0; si < speedSegments.length; si++) {
      var seg = speedSegments[si];
      var sx = timeToX(seg.startTime);
      var ex = timeToX(seg.endTime);
      ctx.fillStyle = seg.rate < 1 ? 'rgba(0,150,255,0.15)' : 'rgba(255,150,0,0.15)';
      ctx.fillRect(sx, 0, ex - sx, H - 16);
      ctx.fillStyle = '#888';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(seg.rate + 'x', (sx + ex) / 2, 10);
    }

    // Time ruler
    ctx.fillStyle = '#333';
    ctx.fillRect(0, H - 16, W, 16);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    var step = duration < 30 ? 1 : duration < 120 ? 5 : duration < 600 ? 10 : 30;
    ctx.font = '8px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    for (var t = 0; t <= duration; t += step) {
      var x = timeToX(t);
      ctx.beginPath(); ctx.moveTo(x, H - 16); ctx.lineTo(x, H - 10); ctx.stroke();
      var m = Math.floor(t / 60);
      var s = Math.floor(t % 60);
      ctx.fillText(m + ':' + (s < 10 ? '0' : '') + s, x, H - 2);
    }

    // Cut lines
    ctx.strokeStyle = '#f44';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    for (var ci = 0; ci < cuts.length; ci++) {
      var cx = timeToX(cuts[ci].time);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H - 16); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Markers
    for (var mi = 0; mi < markers.length; mi++) {
      var mk = markers[mi];
      var mx = timeToX(mk.time);
      ctx.fillStyle = mk.color || '#ff0';
      ctx.beginPath();
      ctx.moveTo(mx, 0); ctx.lineTo(mx - 5, 10); ctx.lineTo(mx + 5, 10);
      ctx.closePath(); ctx.fill();
    }

    // Playhead
    var px = timeToX(currentTime);
    ctx.strokeStyle = '#0af';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    ctx.fillStyle = '#0af';
    ctx.beginPath();
    ctx.moveTo(px - 6, 0); ctx.lineTo(px + 6, 0); ctx.lineTo(px, 8);
    ctx.closePath(); ctx.fill();
  }

  // Predictive interpolation
  function tick() {
    if (isPlaying && duration > 0) {
      var elapsed = (performance.now() - lastUpdateTime) / 1000;
      currentTime = Math.min(lastKnownTime + elapsed * playbackRate, duration);
    }
    draw();
    requestAnimationFrame(tick);
  }

  SN.subscribe('video.transport.state', function(d) {
    if (!d) return;
    duration = d.duration || duration;
    lastKnownTime = d.currentTime || 0;
    currentTime = lastKnownTime;
    playbackRate = d.playbackRate || 1;
    isPlaying = d.state === 'playing';
    lastUpdateTime = performance.now();
  });
  SN.subscribe('video.source.loaded', function(d) { if (d) duration = d.duration || 0; draw(); });
  SN.subscribe('video.markers.changed', function(d) { if (d) markers = d.markers || []; draw(); });
  SN.subscribe('video.cuts.changed', function(d) { if (d) cuts = d.cuts || []; draw(); });
  SN.subscribe('video.speed.segments.changed', function(d) { if (d) speedSegments = d.segments || []; draw(); });

  canvas.addEventListener('mousedown', function(e) {
    if (!duration) return;
    dragging = true;
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    if (e.shiftKey) {
      SN.emit('video.command.addMarker', { time: xToTime(x), label: 'M' + (markers.length + 1) });
    } else {
      var t = xToTime(x);
      currentTime = t;
      SN.emit('video.command.seek', { time: t });
    }
  });
  canvas.addEventListener('mousemove', function(e) {
    if (!dragging || !duration || e.shiftKey) return;
    var rect = canvas.getBoundingClientRect();
    var x = Math.max(0, Math.min(e.clientX - rect.left, W));
    var t = xToTime(x);
    currentTime = t;
    SN.emit('video.command.seek', { time: t });
  });
  canvas.addEventListener('mouseup', function() { dragging = false; });
  canvas.addEventListener('mouseleave', function() { dragging = false; });

  SN.onResize(function() { setTimeout(resize, 10); });
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(tick);
  SN.register({ id: 'timeline', name: 'Timeline', version: '1.0.0' });
  SN.ready();
})();
</script>
</body>
</html>
`;

export const SPEED_CONTROL_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Speed Control</title></head>
<body style="margin:0;padding:8px;font-family:system-ui,sans-serif;background:#1a1a1a;color:#eee;overflow:auto;">
<style>
  * { box-sizing: border-box; }
  h4 { margin:0 0 6px; font-size:12px; color:#aaa; }
  .row { display:flex; align-items:center; gap:4px; margin-bottom:6px; }
  label { font-size:10px; color:#888; min-width:35px; }
  input[type=range] { flex:1; accent-color:#f80; height:4px; }
  .rate-val { font-size:14px; font-weight:bold; color:#f80; min-width:40px; text-align:center; }
  button { background:#333; color:#eee; border:1px solid #555; border-radius:3px; padding:2px 6px; cursor:pointer; font-size:10px; }
  button:hover { background:#444; }
  .seg-list { font-size:9px; max-height:60px; overflow:auto; }
  .seg-item { display:flex; justify-content:space-between; padding:2px 4px; border-bottom:1px solid #333; align-items:center; }
  .add-row { display:flex; gap:3px; align-items:center; margin-top:4px; }
  .add-row input { width:40px; font-size:9px; padding:1px 3px; background:#333; color:#eee; border:1px solid #555; border-radius:2px; }
</style>
<h4>Speed Control</h4>
<div class="row">
  <label>Rate</label>
  <input id="rate" type="range" min="0.25" max="4" step="0.25" value="1">
  <span id="rate-val" class="rate-val">1x</span>
</div>
<button id="apply-global" style="margin-bottom:8px;width:100%">Apply to Player</button>
<div style="border-top:1px solid #333;padding-top:6px;">
  <div style="font-size:10px;color:#888;margin-bottom:4px;">Speed Segments</div>
  <div id="seg-list" class="seg-list"></div>
  <div class="add-row">
    <input id="seg-start" placeholder="Start" type="number" step="0.1">
    <input id="seg-end" placeholder="End" type="number" step="0.1">
    <input id="seg-rate" placeholder="Rate" type="number" step="0.25" value="0.5">
    <button id="add-seg">+</button>
  </div>
</div>
<script>
(function() {
  var SN = window.StickerNest;
  var rateSlider = document.getElementById('rate');
  var rateVal = document.getElementById('rate-val');
  var segments = [];

  rateSlider.oninput = function() { rateVal.textContent = rateSlider.value + 'x'; };
  document.getElementById('apply-global').onclick = function() {
    SN.emit('video.command.setRate', { rate: parseFloat(rateSlider.value) });
  };

  function renderSegments() {
    var el = document.getElementById('seg-list');
    el.innerHTML = '';
    segments.forEach(function(s) {
      var div = document.createElement('div');
      div.className = 'seg-item';
      var fmt = function(t) { return t.toFixed(1) + 's'; };
      div.innerHTML = '<span>' + fmt(s.startTime) + ' - ' + fmt(s.endTime) + ' @ ' + s.rate + 'x</span>';
      var btn = document.createElement('button');
      btn.textContent = 'x';
      btn.onclick = function() { SN.emit('video.speed.removeSegment', { id: s.id }); };
      div.appendChild(btn);
      el.appendChild(div);
    });
  }

  document.getElementById('add-seg').onclick = function() {
    var st = parseFloat(document.getElementById('seg-start').value);
    var en = parseFloat(document.getElementById('seg-end').value);
    var rt = parseFloat(document.getElementById('seg-rate').value);
    if (isNaN(st) || isNaN(en) || isNaN(rt) || en <= st) return;
    SN.emit('video.speed.setSegment', { startTime: st, endTime: en, rate: Math.max(0.25, Math.min(4, rt)) });
  };

  SN.subscribe('video.speed.segments.changed', function(d) {
    if (d) { segments = d.segments || []; renderSegments(); }
  });
  SN.subscribe('video.transport.state', function(d) {
    if (d && d.playbackRate) { rateSlider.value = d.playbackRate; rateVal.textContent = d.playbackRate + 'x'; }
  });

  SN.onThemeChange(function(t) {
    document.body.style.background = t['--sn-bg'] || '#1a1a1a';
    document.body.style.color = t['--sn-text'] || '#eee';
  });
  SN.register({ id: 'speed-control', name: 'Speed Control', version: '1.0.0' });
  SN.ready();
})();
</script>
</body>
</html>
`;

export const KEYFRAME_EDITOR_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Keyframe Editor</title></head>
<body style="margin:0;padding:8px;font-family:system-ui,sans-serif;background:#1a1a1a;color:#eee;overflow:auto;">
<style>
  * { box-sizing: border-box; }
  h4 { margin:0 0 6px; font-size:12px; color:#aaa; }
  .row { display:flex; align-items:center; gap:4px; margin-bottom:4px; }
  select, input { background:#333; color:#eee; border:1px solid #555; border-radius:2px; font-size:10px; padding:2px 4px; }
  select { min-width:70px; }
  input[type=number] { width:50px; }
  button { background:#333; color:#eee; border:1px solid #555; border-radius:3px; padding:2px 6px; cursor:pointer; font-size:10px; }
  button:hover { background:#444; }
  canvas { width:100%; height:30px; cursor:crosshair; display:block; margin:4px 0; border:1px solid #333; border-radius:2px; }
  .kf-list { font-size:9px; max-height:40px; overflow:auto; }
  .kf-item { display:flex; justify-content:space-between; padding:1px 4px; border-bottom:1px solid #333; align-items:center; }
  .kf-item:hover { background:#252525; }
</style>
<h4>Keyframe Editor</h4>
<div class="row">
  <select id="prop">
    <option value="opacity">Opacity</option>
    <option value="scale">Scale</option>
    <option value="rotation">Rotation</option>
    <option value="x">X</option>
    <option value="y">Y</option>
  </select>
  <input id="kf-val" type="number" step="0.1" value="1" placeholder="Value">
  <select id="easing">
    <option value="linear">Linear</option>
    <option value="ease-in">Ease In</option>
    <option value="ease-out">Ease Out</option>
    <option value="ease-in-out">Ease In/Out</option>
  </select>
  <button id="add-kf">+ At Playhead</button>
</div>
<canvas id="mini-tl"></canvas>
<div id="kf-list" class="kf-list"></div>
<script>
(function() {
  var SN = window.StickerNest;
  var canvas = document.getElementById('mini-tl');
  var ctx = canvas.getContext('2d');
  var keyframes = [];
  var duration = 0, currentTime = 0, isPlaying = false;
  var lastUpdateTime = 0, lastKnownTime = 0, playbackRate = 1;
  var W = 300, H = 30;

  function resize() {
    var r = canvas.parentElement.getBoundingClientRect();
    W = Math.floor(r.width) || 300;
    canvas.width = W; canvas.height = H;
    draw();
  }

  function timeToX(t) { return duration > 0 ? (t / duration) * W : 0; }
  function xToTime(x) { return duration > 0 ? (x / W) * duration : 0; }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, W, H);

    // Property-filtered keyframes as diamonds
    var prop = document.getElementById('prop').value;
    var filtered = keyframes.filter(function(k) { return k.property === prop; });
    for (var i = 0; i < filtered.length; i++) {
      var kf = filtered[i];
      var x = timeToX(kf.time);
      ctx.fillStyle = '#f0c040';
      ctx.save();
      ctx.translate(x, H / 2);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }

    // Playhead
    if (duration > 0) {
      var px = timeToX(currentTime);
      ctx.strokeStyle = '#0af';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    }
  }

  function renderList() {
    var el = document.getElementById('kf-list');
    var prop = document.getElementById('prop').value;
    var filtered = keyframes.filter(function(k) { return k.property === prop; });
    el.innerHTML = '';
    filtered.forEach(function(kf) {
      var div = document.createElement('div');
      div.className = 'kf-item';
      div.innerHTML = '<span>' + kf.time.toFixed(1) + 's: ' + kf.property + '=' + kf.value + ' (' + (kf.easing || 'linear') + ')</span>';
      var btn = document.createElement('button');
      btn.textContent = 'x';
      btn.onclick = function() { SN.emit('video.keyframe.remove', { id: kf.id }); };
      div.appendChild(btn);
      el.appendChild(div);
    });
  }

  document.getElementById('add-kf').onclick = function() {
    SN.emit('video.keyframe.set', {
      time: currentTime,
      property: document.getElementById('prop').value,
      value: parseFloat(document.getElementById('kf-val').value) || 0,
      easing: document.getElementById('easing').value
    });
  };
  document.getElementById('prop').onchange = function() { draw(); renderList(); };

  canvas.addEventListener('click', function(e) {
    if (!duration) return;
    var rect = canvas.getBoundingClientRect();
    var t = xToTime(e.clientX - rect.left);
    SN.emit('video.command.seek', { time: t });
  });

  // Predictive interpolation
  function tick() {
    if (isPlaying && duration > 0) {
      var elapsed = (performance.now() - lastUpdateTime) / 1000;
      currentTime = Math.min(lastKnownTime + elapsed * playbackRate, duration);
    }
    draw();
    requestAnimationFrame(tick);
  }

  SN.subscribe('video.transport.state', function(d) {
    if (!d) return;
    duration = d.duration || duration;
    lastKnownTime = d.currentTime || 0;
    currentTime = lastKnownTime;
    playbackRate = d.playbackRate || 1;
    isPlaying = d.state === 'playing';
    lastUpdateTime = performance.now();
  });
  SN.subscribe('video.source.loaded', function(d) { if (d) duration = d.duration || 0; });
  SN.subscribe('video.keyframes.changed', function(d) {
    if (d) { keyframes = d.keyframes || []; draw(); renderList(); }
  });

  // Self-manage keyframes since player just echoes
  var localKeyframes = [];
  SN.subscribe('video.keyframe.set', function(d) {
    if (!d) return;
    localKeyframes.push({
      id: 'kf-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
      time: d.time, property: d.property, value: d.value, easing: d.easing || 'linear'
    });
    keyframes = localKeyframes;
    SN.emit('video.keyframes.changed', { keyframes: keyframes });
    draw(); renderList();
  });
  SN.subscribe('video.keyframe.remove', function(d) {
    if (!d) return;
    localKeyframes = localKeyframes.filter(function(k) { return k.id !== d.id; });
    keyframes = localKeyframes;
    SN.emit('video.keyframes.changed', { keyframes: keyframes });
    draw(); renderList();
  });

  SN.onResize(function() { setTimeout(resize, 10); });
  SN.onThemeChange(function(t) {
    document.body.style.background = t['--sn-bg'] || '#1a1a1a';
    document.body.style.color = t['--sn-text'] || '#eee';
  });
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(tick);
  SN.register({ id: 'keyframe-editor', name: 'Keyframe Editor', version: '1.0.0' });
  SN.ready();
})();
</script>
</body>
</html>
`;

export const CUT_TOOL_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Cut/Split Tool</title></head>
<body style="margin:0;padding:8px;font-family:system-ui,sans-serif;background:#1a1a1a;color:#eee;overflow:auto;">
<style>
  * { box-sizing: border-box; }
  h4 { margin:0 0 6px; font-size:12px; color:#aaa; }
  button { background:#333; color:#eee; border:1px solid #555; border-radius:3px; padding:3px 8px; cursor:pointer; font-size:10px; }
  button:hover { background:#444; }
  #cut-btn { background:#a33; border-color:#c44; margin-bottom:6px; width:100%; font-size:11px; padding:4px; }
  #cut-btn:hover { background:#c44; }
  canvas { width:100%; height:30px; cursor:crosshair; display:block; margin:4px 0; border:1px solid #333; border-radius:2px; }
  .cut-list { font-size:9px; max-height:50px; overflow:auto; }
  .cut-item { display:flex; justify-content:space-between; padding:2px 4px; border-bottom:1px solid #333; align-items:center; }
  .seg-info { font-size:9px; color:#888; margin-top:4px; }
  .seg-chip { display:inline-block; background:#252525; border:1px solid #444; border-radius:2px; padding:1px 4px; margin:1px; }
</style>
<h4>Cut / Split Tool</h4>
<button id="cut-btn">Cut at Playhead</button>
<canvas id="mini-tl"></canvas>
<div style="font-size:10px;color:#888;margin-bottom:2px;">Cut Points</div>
<div id="cut-list" class="cut-list"></div>
<div id="seg-info" class="seg-info"></div>
<script>
(function() {
  var SN = window.StickerNest;
  var canvas = document.getElementById('mini-tl');
  var ctx = canvas.getContext('2d');
  var cuts = [], segments = [];
  var duration = 0, currentTime = 0, isPlaying = false;
  var lastUpdateTime = 0, lastKnownTime = 0, playbackRate = 1;
  var W = 300, H = 30;

  function resize() {
    var r = canvas.parentElement.getBoundingClientRect();
    W = Math.floor(r.width) || 300;
    canvas.width = W; canvas.height = H;
    draw();
  }

  function timeToX(t) { return duration > 0 ? (t / duration) * W : 0; }
  function xToTime(x) { return duration > 0 ? (x / W) * duration : 0; }
  function fmt(s) { return s.toFixed(1) + 's'; }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, W, H);

    // Segment colors
    var colors = ['#252530', '#302525', '#253025', '#302530', '#253030'];
    for (var si = 0; si < segments.length; si++) {
      var seg = segments[si];
      var sx = timeToX(seg.start);
      var ex = timeToX(seg.end);
      ctx.fillStyle = colors[si % colors.length];
      ctx.fillRect(sx, 0, ex - sx, H);
    }

    // Cut lines
    ctx.strokeStyle = '#f44';
    ctx.lineWidth = 2;
    for (var ci = 0; ci < cuts.length; ci++) {
      var cx = timeToX(cuts[ci].time);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    }

    // Playhead
    if (duration > 0) {
      var px = timeToX(currentTime);
      ctx.strokeStyle = '#0af';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    }
  }

  function renderCuts() {
    var el = document.getElementById('cut-list');
    el.innerHTML = '';
    cuts.forEach(function(c) {
      var div = document.createElement('div');
      div.className = 'cut-item';
      div.innerHTML = '<span>Cut @ ' + fmt(c.time) + '</span>';
      var btn = document.createElement('button');
      btn.textContent = 'x';
      btn.onclick = function() { SN.emit('video.cut.remove', { id: c.id }); };
      div.appendChild(btn);
      el.appendChild(div);
    });
    var segEl = document.getElementById('seg-info');
    if (segments.length > 0) {
      segEl.innerHTML = 'Segments: ' + segments.map(function(s) {
        return '<span class="seg-chip">' + (s.index + 1) + ': ' + fmt(s.start) + '-' + fmt(s.end) + '</span>';
      }).join('');
    } else {
      segEl.textContent = 'No cuts yet';
    }
  }

  document.getElementById('cut-btn').onclick = function() {
    if (duration > 0) SN.emit('video.cut.add', { time: currentTime });
  };

  canvas.addEventListener('click', function(e) {
    if (!duration) return;
    var rect = canvas.getBoundingClientRect();
    var t = xToTime(e.clientX - rect.left);
    if (e.shiftKey) {
      SN.emit('video.cut.add', { time: t });
    } else {
      SN.emit('video.command.seek', { time: t });
    }
  });

  // Predictive interpolation
  function tick() {
    if (isPlaying && duration > 0) {
      var elapsed = (performance.now() - lastUpdateTime) / 1000;
      currentTime = Math.min(lastKnownTime + elapsed * playbackRate, duration);
    }
    draw();
    requestAnimationFrame(tick);
  }

  SN.subscribe('video.transport.state', function(d) {
    if (!d) return;
    duration = d.duration || duration;
    lastKnownTime = d.currentTime || 0;
    currentTime = lastKnownTime;
    playbackRate = d.playbackRate || 1;
    isPlaying = d.state === 'playing';
    lastUpdateTime = performance.now();
  });
  SN.subscribe('video.source.loaded', function(d) { if (d) duration = d.duration || 0; });
  SN.subscribe('video.cuts.changed', function(d) {
    if (d) { cuts = d.cuts || []; segments = d.segments || []; draw(); renderCuts(); }
  });

  SN.onResize(function() { setTimeout(resize, 10); });
  SN.onThemeChange(function(t) {
    document.body.style.background = t['--sn-bg'] || '#1a1a1a';
    document.body.style.color = t['--sn-text'] || '#eee';
  });
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(tick);
  SN.register({ id: 'cut-tool', name: 'Cut/Split Tool', version: '1.0.0' });
  SN.ready();
})();
</script>
</body>
</html>
`;

export const IMAGE_GENERATION_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Image Generator</title></head>
<body style="margin:0;padding:8px;font-family:sans-serif;background:#1a1a2e;color:#eee;font-size:11px;">
  <div id="app">
    <div style="display:flex;gap:4px;margin-bottom:6px;">
      <input id="prompt" type="text" placeholder="Describe an image..." style="flex:1;padding:4px 6px;background:#2a2a4a;color:#eee;border:1px solid #444;border-radius:3px;font-size:11px;" />
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <select id="model" style="flex:1;padding:3px;background:#2a2a4a;color:#eee;border:1px solid #444;border-radius:3px;font-size:10px;">
        <option value="black-forest-labs/flux-schnell">Flux Schnell</option>
        <option value="stability-ai/sdxl">SDXL</option>
      </select>
      <button id="generate-btn" style="padding:4px 10px;background:#0066cc;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:10px;white-space:nowrap;">Generate</button>
    </div>
    <div id="status" style="font-size:10px;color:#888;margin-bottom:6px;min-height:14px;"></div>
    <div id="preview" style="text-align:center;min-height:20px;"></div>
  </div>
  <script>
  (function() {
    var SN = window.StickerNest;
    if (!SN) return;
    var config = {};
    var generating = false;
    var startTime = 0;

    SN.getConfig().then(function(c) { config = c || {}; }).catch(function() {});

    SN.register({ id: 'image-generator', name: 'Image Generator', version: '1.0.0' });
    SN.ready();

    var promptEl = document.getElementById('prompt');
    var modelEl = document.getElementById('model');
    var statusEl = document.getElementById('status');
    var previewEl = document.getElementById('preview');
    var btnEl = document.getElementById('generate-btn');

    btnEl.onclick = function() { doGenerate(); };
    promptEl.onkeydown = function(e) { if (e.key === 'Enter') doGenerate(); };

    function doGenerate() {
      if (generating) return;
      var prompt = promptEl.value.trim();
      var model = modelEl.value;
      if (!prompt) { statusEl.textContent = 'Enter a prompt first'; return; }

      generating = true;
      startTime = Date.now();
      btnEl.disabled = true;
      btnEl.style.opacity = '0.5';
      statusEl.textContent = 'Generating...';
      previewEl.innerHTML = '<div style="color:#666;padding:10px;">Working...</div>';
      SN.emit('image.generation.started', { prompt: prompt, model: model, timestamp: startTime });

      if (config.mockMode !== false) {
        setTimeout(function() {
          var colors = ['e74c3c','3498db','2ecc71','f39c12','9b59b6','1abc9c','e67e22','34495e'];
          var c1 = colors[Math.floor(Math.random()*colors.length)];
          var c2 = colors[Math.floor(Math.random()*colors.length)];
          var mockUrl = 'https://via.placeholder.com/512x512/' + c1 + '/' + c2 + '.png?text=' + encodeURIComponent(prompt.substring(0, 24));
          handleResult(mockUrl, prompt, model);
        }, 1200 + Math.random() * 800);
        return;
      }

      SN.integration('ai').query({
        action: 'generate-image', model: model, input: { prompt: prompt }
      }).then(function(result) {
        var url = Array.isArray(result.output) ? result.output[0] : result.output;
        handleResult(url, prompt, model);
      }).catch(function(err) {
        generating = false;
        btnEl.disabled = false;
        btnEl.style.opacity = '1';
        statusEl.textContent = 'Failed: ' + (err.message || err);
        statusEl.style.color = '#e74c3c';
        SN.emit('image.generation.failed', { error: err.message || String(err), prompt: prompt, model: model });
      });
    }

    function handleResult(imageUrl, prompt, model) {
      generating = false;
      btnEl.disabled = false;
      btnEl.style.opacity = '1';
      var duration = Date.now() - startTime;
      statusEl.textContent = 'Done in ' + (duration / 1000).toFixed(1) + 's';
      statusEl.style.color = '#2ecc71';
      previewEl.innerHTML = '<img src="' + imageUrl + '" style="max-width:100%;max-height:140px;border-radius:4px;border:1px solid #333;" />';
      SN.emit('image.generation.completed', { imageUrl: imageUrl, prompt: prompt, model: model, duration: duration });
    }

    SN.subscribe('image.command.generate', function(payload) {
      if (payload && payload.prompt) {
        promptEl.value = payload.prompt;
        if (payload.model) modelEl.value = payload.model;
        doGenerate();
      }
    });

    SN.onThemeChange(function(t) {
      document.body.style.background = t['--sn-bg'] || '#1a1a2e';
      document.body.style.color = t['--sn-text'] || '#eee';
    });
  })();
  </script>
</body>
</html>
`;

export const STICKER_PROPS_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Sticker Properties</title></head>
<body style="margin:0;padding:6px;font-family:sans-serif;background:#2a2a2a;color:#eee;font-size:11px;">
  <div id="app">
    <div style="margin-bottom:6px;color:#888;font-size:9px;">EVENT CONFIG</div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:50px;">Event</span>
      <input type="text" id="clickEventType" placeholder="e.g. sticker.clicked" value=""
        style="flex:1;background:#333;border:1px solid #555;color:#eee;padding:2px 4px;font-size:10px;border-radius:2px;" />
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:flex-start;">
      <span style="color:#888;font-size:9px;width:50px;padding-top:2px;">Payload</span>
      <textarea id="clickEventPayload" placeholder='{"key":"value"}' rows="3"
        style="flex:1;background:#333;border:1px solid #555;color:#eee;padding:2px 4px;font-size:10px;border-radius:2px;resize:vertical;font-family:monospace;"></textarea>
    </div>
    <div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;margin-bottom:6px;">
      <div style="color:#888;font-size:9px;margin-bottom:4px;">HOVER EFFECT</div>
      <select id="hoverEffect" style="width:100%;background:#333;border:1px solid #555;color:#eee;padding:2px 4px;font-size:10px;border-radius:2px;">
        <option value="none">None</option>
        <option value="scale">Scale</option>
        <option value="glow">Glow</option>
        <option value="opacity">Opacity</option>
      </select>
    </div>
    <div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
      <div style="color:#888;font-size:9px;margin-bottom:4px;">ASSET INFO</div>
      <div id="assetInfo" style="color:#aaa;font-size:10px;word-break:break-all;">No sticker selected</div>
    </div>
    <div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
      <div style="color:#888;font-size:9px;margin-bottom:4px;">SELECTION</div>
      <div id="selectionInfo" style="color:#aaa;font-size:10px;">No sticker selected</div>
    </div>
  </div>
  <script>
    let state = { clickEventType: '', clickEventPayload: {}, hoverEffect: 'none', assetUrl: '', assetType: 'image' };

    const updateUI = () => {
      document.getElementById('clickEventType').value = state.clickEventType || '';
      document.getElementById('hoverEffect').value = state.hoverEffect || 'none';
      try {
        document.getElementById('clickEventPayload').value =
          Object.keys(state.clickEventPayload || {}).length > 0
            ? JSON.stringify(state.clickEventPayload, null, 2) : '';
      } catch(e) {}
      document.getElementById('assetInfo').textContent = state.assetUrl
        ? state.assetType + ': ' + state.assetUrl : 'No sticker selected';
    };

    const emitChange = () => {
      window.StickerNest?.emit('widget.sticker.props.changed', {
        clickEventType: state.clickEventType,
        clickEventPayload: state.clickEventPayload,
        hoverEffect: state.hoverEffect
      });
    };

    document.getElementById('clickEventType').oninput = (e) => {
      state.clickEventType = e.target.value;
      emitChange();
    };

    document.getElementById('clickEventPayload').onblur = (e) => {
      try {
        state.clickEventPayload = JSON.parse(e.target.value || '{}');
        e.target.style.borderColor = '#555';
      } catch(err) {
        e.target.style.borderColor = '#ff4444';
      }
      emitChange();
    };

    document.getElementById('hoverEffect').onchange = (e) => {
      state.hoverEffect = e.target.value;
      emitChange();
    };

    window.StickerNest?.subscribe('widget.sticker.selection.sync', (payload) => {
      if (payload.clickEventType !== undefined) state.clickEventType = payload.clickEventType;
      if (payload.clickEventPayload !== undefined) state.clickEventPayload = payload.clickEventPayload;
      if (payload.hoverEffect !== undefined) state.hoverEffect = payload.hoverEffect;
      if (payload.assetUrl !== undefined) state.assetUrl = payload.assetUrl;
      if (payload.assetType !== undefined) state.assetType = payload.assetType;
      document.getElementById('selectionInfo').textContent = payload.id ? 'Sticker ' + payload.id.slice(0,8) + ' selected' : 'No sticker selected';
      updateUI();
    });

    window.StickerNest?.subscribe('widget.sticker.deselected', () => {
      state = { clickEventType: '', clickEventPayload: {}, hoverEffect: 'none', assetUrl: '', assetType: 'image' };
      document.getElementById('selectionInfo').textContent = 'No sticker selected';
      updateUI();
    });

    window.StickerNest?.register({ id: 'sticker-props-widget', name: 'Sticker Properties', version: '1.0.0' });
    window.StickerNest?.ready();
    updateUI();
  </script>
</body>
</html>
`;

export const LOTTIE_PROPS_WIDGET_HTML = `
<!DOCTYPE html>
<html>
<head><title>Lottie Properties</title></head>
<body style="margin:0;padding:6px;font-family:sans-serif;background:#2a2a2a;color:#eee;font-size:11px;">
  <div id="app">
    <div style="margin-bottom:6px;color:#888;font-size:9px;">PLAYBACK</div>
    <div style="display:flex;gap:4px;margin-bottom:6px;">
      <button id="btnPlay" style="flex:1;padding:4px;background:#4CAF50;color:#fff;border:none;border-radius:2px;cursor:pointer;font-size:10px;">Play</button>
      <button id="btnPause" style="flex:1;padding:4px;background:#ff9800;color:#fff;border:none;border-radius:2px;cursor:pointer;font-size:10px;">Pause</button>
      <button id="btnStop" style="flex:1;padding:4px;background:#f44336;color:#fff;border:none;border-radius:2px;cursor:pointer;font-size:10px;">Stop</button>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:40px;">Speed</span>
      <input type="range" id="speed" min="0.25" max="3" step="0.25" value="1" style="flex:1;" />
      <span id="speedVal" style="color:#666;font-size:9px;width:30px;">1x</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
        <input type="checkbox" id="loop" checked style="margin:0;" />
        <span style="color:#888;font-size:9px;">Loop</span>
      </label>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">
      <span style="color:#888;font-size:9px;width:40px;">Dir</span>
      <button id="btnForward" style="flex:1;padding:3px;background:#555;color:#eee;border:1px solid #666;border-radius:2px;cursor:pointer;font-size:10px;">Forward</button>
      <button id="btnReverse" style="flex:1;padding:3px;background:#333;color:#888;border:1px solid #555;border-radius:2px;cursor:pointer;font-size:10px;">Reverse</button>
    </div>
    <div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
      <div style="color:#888;font-size:9px;margin-bottom:4px;">SELECTION</div>
      <div id="selectionInfo" style="color:#aaa;font-size:10px;">No lottie selected</div>
    </div>
  </div>
  <script>
    let state = { speed: 1, loop: true, direction: 1, autoplay: true };

    const updateUI = () => {
      document.getElementById('speed').value = state.speed;
      document.getElementById('speedVal').textContent = state.speed + 'x';
      document.getElementById('loop').checked = state.loop;
      if (state.direction === 1) {
        document.getElementById('btnForward').style.background = '#555';
        document.getElementById('btnForward').style.color = '#eee';
        document.getElementById('btnReverse').style.background = '#333';
        document.getElementById('btnReverse').style.color = '#888';
      } else {
        document.getElementById('btnReverse').style.background = '#555';
        document.getElementById('btnReverse').style.color = '#eee';
        document.getElementById('btnForward').style.background = '#333';
        document.getElementById('btnForward').style.color = '#888';
      }
    };

    const emitChange = () => {
      window.StickerNest?.emit('widget.lottie.props.changed', {
        speed: state.speed,
        loop: state.loop,
        direction: state.direction
      });
    };

    document.getElementById('btnPlay').onclick = () => {
      window.StickerNest?.emit('widget.lottie.playback.command', { command: 'play' });
    };
    document.getElementById('btnPause').onclick = () => {
      window.StickerNest?.emit('widget.lottie.playback.command', { command: 'pause' });
    };
    document.getElementById('btnStop').onclick = () => {
      window.StickerNest?.emit('widget.lottie.playback.command', { command: 'stop' });
    };

    document.getElementById('speed').oninput = (e) => {
      state.speed = parseFloat(e.target.value);
      updateUI();
      emitChange();
    };

    document.getElementById('loop').onchange = (e) => {
      state.loop = e.target.checked;
      emitChange();
    };

    document.getElementById('btnForward').onclick = () => {
      state.direction = 1;
      updateUI();
      emitChange();
    };
    document.getElementById('btnReverse').onclick = () => {
      state.direction = -1;
      updateUI();
      emitChange();
    };

    window.StickerNest?.subscribe('widget.lottie.selection.sync', (payload) => {
      if (payload.speed !== undefined) state.speed = payload.speed;
      if (payload.loop !== undefined) state.loop = payload.loop;
      if (payload.direction !== undefined) state.direction = payload.direction;
      document.getElementById('selectionInfo').textContent = payload.id ? 'Lottie ' + payload.id.slice(0,8) + ' selected' : 'No lottie selected';
      updateUI();
    });

    window.StickerNest?.subscribe('widget.lottie.deselected', () => {
      state = { speed: 1, loop: true, direction: 1, autoplay: true };
      document.getElementById('selectionInfo').textContent = 'No lottie selected';
      updateUI();
    });

    window.StickerNest?.register({ id: 'lottie-props-widget', name: 'Lottie Properties', version: '1.0.0' });
    window.StickerNest?.ready();
    updateUI();
  </script>
</body>
</html>
`;

// ============================================================================
// Theme & Widget Helper
// ============================================================================

export const DEFAULT_WIDGET_THEME: ThemeTokens = {
  '--sn-bg': '#ffffff',
  '--sn-surface': '#f5f5f5',
  '--sn-accent': '#0066cc',
  '--sn-text': '#333333',
  '--sn-text-muted': '#666666',
  '--sn-border': '#cccccc',
  '--sn-radius': '4px',
  '--sn-font-family': 'system-ui, sans-serif',
};

export const getWidgetHtml = (type: string): string => {
  switch (type) {
    case 'counter': return COUNTER_WIDGET_HTML;
    case 'display': return DISPLAY_WIDGET_HTML;
    case 'clock': return CLOCK_WIDGET_HTML;
    case 'text-tool': return TEXT_TOOL_WIDGET_HTML;
    case 'color-picker': return COLOR_PICKER_WIDGET_HTML;
    case 'shape-props': return SHAPE_PROPS_WIDGET_HTML;
    case 'image-props': return IMAGE_PROPS_WIDGET_HTML;
    case 'counter-control': return COUNTER_DISPLAY_WIDGET_HTML;
    case 'pen-props': return PEN_PROPS_WIDGET_HTML;
    case 'tile-palette': return TILE_PALETTE_WIDGET_HTML;
    case 'map-props': return MAP_PROPS_WIDGET_HTML;
    case 'brush-tool': return BRUSH_TOOL_WIDGET_HTML;
    case 'game-player': return GAME_PLAYER_WIDGET_HTML;
    case 'video-player': return VIDEO_PLAYER_WIDGET_HTML;
    case 'timeline': return TIMELINE_WIDGET_HTML;
    case 'speed-control': return SPEED_CONTROL_WIDGET_HTML;
    case 'keyframe-editor': return KEYFRAME_EDITOR_WIDGET_HTML;
    case 'cut-tool': return CUT_TOOL_WIDGET_HTML;
    case 'image-generator': return IMAGE_GENERATION_WIDGET_HTML;
    case 'sticker-props': return STICKER_PROPS_WIDGET_HTML;
    case 'lottie-props': return LOTTIE_PROPS_WIDGET_HTML;
    default: return COUNTER_WIDGET_HTML;
  }
};
