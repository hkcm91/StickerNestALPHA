/**
 * Widget Security Scanner tests
 *
 * @module kernel/security
 * @layer L0
 */

import { describe, it, expect } from 'vitest';

import { scanWidgetHtml } from './widget-scanner';

// ---------------------------------------------------------------------------
// Helper: minimal clean widget HTML
// ---------------------------------------------------------------------------
const CLEAN_WIDGET = `
<!DOCTYPE html>
<html>
<head><title>My Widget</title></head>
<body>
  <div id="root">Hello</div>
  <script>
    StickerNest.register({ id: 'test.widget', name: 'Test', version: '1.0.0' });
    StickerNest.ready();
  </script>
</body>
</html>
`;

describe('scanWidgetHtml', () => {
  // -------------------------------------------------------------------------
  // Clean HTML
  // -------------------------------------------------------------------------
  it('passes clean widget HTML with score 100', () => {
    const result = scanWidgetHtml(CLEAN_WIDGET);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.flags).toHaveLength(0);
  });

  it('returns failed for empty input', () => {
    const result = scanWidgetHtml('');
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].rule).toBe('empty-html');
  });

  // -------------------------------------------------------------------------
  // Critical rules
  // -------------------------------------------------------------------------
  describe('critical rules', () => {
    it('flags eval() usage', () => {
      const html = `<script>eval("alert(1)")</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'eval-usage')).toBe(true);
      expect(result.flags.find((f) => f.rule === 'eval-usage')?.severity).toBe('critical');
    });

    it('flags new Function() constructor', () => {
      const html = `<script>const fn = new Function("return 1")</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'function-constructor')).toBe(true);
    });

    it('flags setTimeout with string argument', () => {
      const html = `<script>setTimeout("alert(1)", 100)</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'settimeout-string')).toBe(true);
    });

    it('flags setInterval with string argument', () => {
      const html = `<script>setInterval('tick()', 1000)</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'settimeout-string')).toBe(true);
    });

    it('does not flag setTimeout with function argument', () => {
      const html = `<script>setTimeout(() => console.log('hi'), 100)</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'settimeout-string')).toBe(false);
    });

    it('flags document.cookie access', () => {
      const html = `<script>const c = document.cookie;</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'document-cookie')).toBe(true);
    });

    it('flags direct localStorage access', () => {
      const html = `<script>localStorage.setItem('key', 'val')</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'direct-storage-access')).toBe(true);
    });

    it('flags fetch() network access', () => {
      const html = `<script>fetch('https://evil.com/data')</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'network-access')).toBe(true);
    });

    it('flags new XMLHttpRequest', () => {
      const html = `<script>const xhr = new XMLHttpRequest()</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'network-access')).toBe(true);
    });

    it('flags new WebSocket', () => {
      const html = `<script>const ws = new WebSocket('ws://evil.com')</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'network-access')).toBe(true);
    });

    it('flags remote script loading', () => {
      const html = `<script src="https://cdn.example.com/evil.js"></script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'remote-script')).toBe(true);
    });

    it('flags postMessage to parent (sandbox escape)', () => {
      const html = `<script>parent.postMessage({ type: 'steal' }, '*')</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'sandbox-escape')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Warning rules
  // -------------------------------------------------------------------------
  describe('warning rules', () => {
    it('flags innerHTML assignment', () => {
      const html = `<script>el.innerHTML = userInput;</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'innerhtml-dynamic')).toBe(true);
      expect(result.flags.find((f) => f.rule === 'innerhtml-dynamic')?.severity).toBe('warning');
    });

    it('flags document.write()', () => {
      const html = `<script>document.write('<h1>Overwritten</h1>')</script>`;
      const result = scanWidgetHtml(html);
      expect(result.flags.some((f) => f.rule === 'document-write')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Scoring
  // -------------------------------------------------------------------------
  describe('scoring', () => {
    it('deducts 30 points per critical flag', () => {
      const html = `<script>eval("x"); document.cookie;</script>`;
      const result = scanWidgetHtml(html);
      // Two critical rules matched: eval-usage (30) + document-cookie (30) = 60 penalty
      expect(result.score).toBe(40);
      expect(result.passed).toBe(false);
    });

    it('deducts 10 points per warning flag', () => {
      const html = `<script>el.innerHTML = x; document.write('y');</script>`;
      const result = scanWidgetHtml(html);
      // Two warning rules: innerHTML (10) + document-write (10) = 20 penalty
      expect(result.score).toBe(80);
      expect(result.passed).toBe(true);
    });

    it('clamps score to 0 for heavily flagged HTML', () => {
      const html = `<script>
        eval("x");
        new Function("y");
        setTimeout("z", 0);
        document.cookie;
        localStorage.setItem("a", "b");
        fetch("http://evil.com");
      </script>
      <script src="https://evil.com/bad.js"></script>`;
      const result = scanWidgetHtml(html);
      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('passes a widget with only one warning (score 90)', () => {
      const html = `
        <script>
          StickerNest.register({ id: 'test', name: 'Test', version: '1.0.0' });
          const el = document.getElementById('root');
          el.innerHTML = '<p>Static content</p>';
          StickerNest.ready();
        </script>`;
      const result = scanWidgetHtml(html);
      expect(result.score).toBe(90);
      expect(result.passed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Line numbers
  // -------------------------------------------------------------------------
  it('reports approximate line numbers for flags', () => {
    const html = `line1
line2
<script>eval("bad")</script>
line4`;
    const result = scanWidgetHtml(html);
    const evalFlag = result.flags.find((f) => f.rule === 'eval-usage');
    expect(evalFlag?.line).toBe(3);
  });
});
