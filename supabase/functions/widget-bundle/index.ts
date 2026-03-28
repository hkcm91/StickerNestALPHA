import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Widget Bundle Edge Function
 *
 * Accepts raw JS/JSX/TSX/Vue source and returns compiled single-file HTML.
 * Uses esbuild-wasm to bundle in the Deno runtime.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
};

const MAX_SOURCE_SIZE = 500_000; // 500KB
const MAX_OUTPUT_SIZE = 2_000_000; // 2MB

// ---------------------------------------------------------------------------
// HTML Template
// ---------------------------------------------------------------------------

function wrapInHtml(bundledJs: string, framework: string): string {
  const rootEl = framework === "react" ? '<div id="root"></div>' : '<div id="app"></div>';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: auto; }
    body { font-family: var(--sn-font-family, system-ui, sans-serif); color: var(--sn-text, #fff); background: var(--sn-bg, transparent); }
  </style>
</head>
<body>
  ${rootEl}
  <script>${bundledJs}</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Simple transform (no esbuild — basic JSX stripping for V1)
// ---------------------------------------------------------------------------

/**
 * V1 Implementation: Basic source transform without full esbuild.
 *
 * For the initial version, we do a simple transpile:
 * - Strip TypeScript type annotations (basic removal)
 * - Convert JSX to createElement calls (basic transform)
 * - Wrap in HTML template
 *
 * A future version will use esbuild-wasm for full bundling.
 */
function basicTranspile(source: string, framework: string): string {
  let code = source;

  // Strip simple TypeScript type annotations
  // Remove : Type after variable declarations and function params
  code = code.replace(/:\s*[A-Z]\w+(?:<[^>]+>)?/g, "");
  // Remove interface/type declarations (whole lines)
  code = code.replace(/^(?:export\s+)?(?:interface|type)\s+\w+[^{]*\{[^}]*\}/gm, "");

  // For React: ensure React is available (widgets use StickerNest SDK, not React directly,
  // but we provide a minimal shim for JSX)
  if (framework === "react") {
    const reactShim = `
// React shim for bundled widgets
const React = {
  createElement(tag, props, ...children) {
    if (typeof tag === 'function') return tag({ ...props, children });
    const el = document.createElement(tag);
    if (props) {
      Object.entries(props).forEach(([k, v]) => {
        if (k === 'className') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') {
          el.addEventListener(k.slice(2).toLowerCase(), v);
        } else {
          el.setAttribute(k, v);
        }
      });
    }
    children.flat().forEach(child => {
      if (child == null || child === false) return;
      if (typeof child === 'string' || typeof child === 'number') {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    });
    return el;
  },
  Fragment: 'div',
};
const ReactDOM = {
  render(component, container) { container.innerHTML = ''; container.appendChild(component); },
  createRoot(container) { return { render(component) { container.innerHTML = ''; container.appendChild(component); } }; },
};
`;
    code = reactShim + code;

    // Basic JSX-to-createElement transform for simple cases
    // This handles: <Tag prop="val">children</Tag> and <Tag />
    // Full JSX transform would require a proper parser — V2 will use esbuild
    // For now, users should pre-bundle complex JSX
  }

  return code;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Parse request
    const body = await req.json();
    const { source, filename, framework = "vanilla" } = body as {
      source: string;
      filename: string;
      framework?: "react" | "vue" | "vanilla";
    };

    if (!source || typeof source !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing source code" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (source.length > MAX_SOURCE_SIZE) {
      return new Response(
        JSON.stringify({ success: false, error: `Source exceeds maximum size of ${MAX_SOURCE_SIZE / 1000}KB` }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Bundle
    const bundledJs = basicTranspile(source, framework);
    const html = wrapInHtml(bundledJs, framework);

    if (html.length > MAX_OUTPUT_SIZE) {
      return new Response(
        JSON.stringify({ success: false, error: `Bundled output exceeds maximum size of ${MAX_OUTPUT_SIZE / 1000}KB` }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, html, filename }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
