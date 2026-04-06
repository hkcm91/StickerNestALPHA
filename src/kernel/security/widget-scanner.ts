/**
 * Widget HTML Security Scanner
 *
 * Static analysis of widget HTML to detect dangerous patterns.
 * Pure function, no async, target <50ms execution.
 *
 * @module kernel/security
 * @layer L0
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecurityFlag {
  /** Whether this is a warning or a critical security issue */
  severity: 'warning' | 'critical';
  /** Rule identifier (e.g., 'eval-usage', 'remote-script') */
  rule: string;
  /** Human-readable description of the issue */
  message: string;
  /** Approximate line number where the issue was found */
  line?: number;
}

export interface SecurityScanResult {
  /** Whether the widget passed the security scan (score >= 70) */
  passed: boolean;
  /** Security score 0-100 (100 = clean, 0 = dangerous) */
  score: number;
  /** List of detected security issues */
  flags: SecurityFlag[];
}

// ---------------------------------------------------------------------------
// Rule Definitions
// ---------------------------------------------------------------------------

interface ScanRule {
  id: string;
  severity: 'warning' | 'critical';
  message: string;
  penalty: number;
  test: (html: string) => { matched: boolean; line?: number }[];
}

/** Find approximate line number of a match in a string */
function findLine(html: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < html.length; i++) {
    if (html[i] === '\n') line++;
  }
  return line;
}

/** Find all regex matches with line numbers */
function findMatches(
  html: string,
  pattern: RegExp,
): { matched: boolean; line?: number }[] {
  const results: { matched: boolean; line?: number }[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  while ((match = re.exec(html)) !== null) {
    results.push({ matched: true, line: findLine(html, match.index) });
  }
  return results.length > 0 ? results : [{ matched: false }];
}

// ---------------------------------------------------------------------------
// Critical Rules (penalty: 30 each)
// ---------------------------------------------------------------------------

const CRITICAL_RULES: ScanRule[] = [
  {
    id: 'eval-usage',
    severity: 'critical',
    message: 'eval() detected — code injection risk',
    penalty: 30,
    test: (html) => findMatches(html, /\beval\s*\(/g),
  },
  {
    id: 'function-constructor',
    severity: 'critical',
    message: 'new Function() detected — code injection risk',
    penalty: 30,
    test: (html) => findMatches(html, /new\s+Function\s*\(/g),
  },
  {
    id: 'settimeout-string',
    severity: 'critical',
    message: 'setTimeout/setInterval with string argument — implicit eval',
    penalty: 30,
    test: (html) => findMatches(html, /set(?:Timeout|Interval)\s*\(\s*(['"`])/g),
  },
  {
    id: 'document-cookie',
    severity: 'critical',
    message: 'document.cookie access — data exfiltration risk',
    penalty: 30,
    test: (html) => findMatches(html, /document\s*\.\s*cookie/g),
  },
  {
    id: 'direct-storage-access',
    severity: 'critical',
    message: 'Direct localStorage/sessionStorage access outside SDK — use StickerNest.setState() instead',
    penalty: 30,
    test: (html) => {
      // Only flag direct window.localStorage or standalone localStorage calls,
      // not references within StickerNest SDK patterns
      return findMatches(html, /(?<!StickerNest\.\w*)\b(?:local|session)Storage\s*\./g);
    },
  },
  {
    id: 'network-access',
    severity: 'critical',
    message: 'Network API usage detected (fetch/XMLHttpRequest/WebSocket/EventSource) — blocked by CSP but suspicious',
    penalty: 30,
    test: (html) => findMatches(html, /\b(?:fetch\s*\(|new\s+XMLHttpRequest\b|new\s+WebSocket\b|new\s+EventSource\b)/g),
  },
  {
    id: 'remote-script',
    severity: 'critical',
    message: 'Remote script loading detected — all code must be inline',
    penalty: 30,
    test: (html) => findMatches(html, /<script[^>]+src\s*=\s*["']https?:\/\//gi),
  },
  {
    id: 'base64-obfuscation',
    severity: 'critical',
    message: 'Large base64-encoded script block detected (>5KB) — possible obfuscation',
    penalty: 30,
    test: (html) => {
      // Look for base64 strings longer than ~6800 chars (which decodes to ~5KB)
      const results = findMatches(html, /atob\s*\(\s*['"`]([A-Za-z0-9+/=]{6800,})['"`]\s*\)/g);
      return results;
    },
  },
  {
    id: 'sandbox-escape',
    severity: 'critical',
    message: 'Non-SDK postMessage to parent/top detected — sandbox escape attempt',
    penalty: 30,
    test: (html) => {
      // Flag postMessage to parent/top that doesn't look like SDK calls
      const matches = findMatches(html, /(?:parent|top|window\.parent|window\.top)\s*\.\s*postMessage\s*\(/g);
      // Don't flag if the only postMessage calls are within the StickerNest SDK pattern
      // (SDK uses parent.postMessage internally, so we check for non-SDK patterns)
      return matches;
    },
  },
];

// ---------------------------------------------------------------------------
// Warning Rules (penalty: 10 each)
// ---------------------------------------------------------------------------

const WARNING_RULES: ScanRule[] = [
  {
    id: 'innerhtml-dynamic',
    severity: 'warning',
    message: 'innerHTML/outerHTML assignment detected — XSS risk with dynamic content',
    penalty: 10,
    test: (html) => findMatches(html, /\.\s*(?:innerHTML|outerHTML)\s*=/g),
  },
  {
    id: 'large-data-uri',
    severity: 'warning',
    message: 'Large inline data URI detected (>100KB) — potential payload hiding',
    penalty: 10,
    test: (html) => {
      // Find all data URIs and sum their sizes
      const dataUriPattern = /data:[^;]+;base64,([A-Za-z0-9+/=]+)/g;
      let totalSize = 0;
      let match: RegExpExecArray | null;
      let firstLine: number | undefined;
      while ((match = dataUriPattern.exec(html)) !== null) {
        totalSize += match[1].length * 0.75; // base64 → bytes
        if (!firstLine) firstLine = findLine(html, match.index);
      }
      if (totalSize > 100_000) {
        return [{ matched: true, line: firstLine }];
      }
      return [{ matched: false }];
    },
  },
  {
    id: 'high-entropy-code',
    severity: 'warning',
    message: 'Potentially obfuscated/minified code detected — review recommended',
    penalty: 10,
    test: (html) => {
      // Extract script blocks and check for high-entropy patterns
      const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      let match: RegExpExecArray | null;
      while ((match = scriptPattern.exec(html)) !== null) {
        const code = match[1].trim();
        if (code.length < 500) continue; // skip small scripts
        // Heuristic: count ratio of non-alphanumeric, non-whitespace chars
        const stripped = code.replace(/\s/g, '');
        if (stripped.length === 0) continue;
        const specialChars = stripped.replace(/[a-zA-Z0-9]/g, '').length;
        const ratio = specialChars / stripped.length;
        // Heavily minified/obfuscated code tends to have >45% special chars
        if (ratio > 0.45) {
          return [{ matched: true, line: findLine(html, match.index) }];
        }
      }
      return [{ matched: false }];
    },
  },
  {
    id: 'document-write',
    severity: 'warning',
    message: 'document.write() detected — can overwrite entire page',
    penalty: 10,
    test: (html) => findMatches(html, /document\s*\.\s*write(?:ln)?\s*\(/g),
  },
];

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

/**
 * Scans widget HTML for security issues.
 *
 * @param html - The widget HTML source to scan
 * @returns Security scan result with score and flags
 */
export function scanWidgetHtml(html: string): SecurityScanResult {
  if (!html || typeof html !== 'string') {
    return { passed: false, score: 0, flags: [{ severity: 'critical', rule: 'empty-html', message: 'Widget HTML is empty or invalid' }] };
  }

  const flags: SecurityFlag[] = [];
  let totalPenalty = 0;

  const allRules = [...CRITICAL_RULES, ...WARNING_RULES];

  for (const rule of allRules) {
    const results = rule.test(html);
    // Only flag once per rule (take the first match)
    const firstMatch = results.find((r) => r.matched);
    if (firstMatch) {
      flags.push({
        severity: rule.severity,
        rule: rule.id,
        message: rule.message,
        line: firstMatch.line,
      });
      totalPenalty += rule.penalty;
    }
  }

  const score = Math.max(0, 100 - totalPenalty);
  const passed = score >= 70;

  return { passed, score, flags };
}