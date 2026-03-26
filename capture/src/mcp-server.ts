#!/usr/bin/env node
/**
 * StickerNest Capture Pipeline — MCP Server
 *
 * Exposes the capture pipeline (run, compose, export, validate) as MCP tools
 * so that AI agents (Demo, Content Strategy, Orchestrator) can drive the
 * full demo → video → multi-format pipeline programmatically.
 *
 * Run: npx tsx src/mcp-server.ts
 *
 * Tools:
 *   capture.validate  — Validate a CaptureScript JSON
 *   capture.run       — Execute a capture script → screenshots, recordings, GIFs
 *   capture.compose   — Compose captured assets into a master video
 *   capture.export    — Export master video into platform-specific formats
 *   capture.pipeline  — Run the full pipeline end-to-end (run → compose → export)
 *   capture.list_formats — List available export formats and their specs
 *   capture.list_voices  — List recommended narration voices
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { CaptureScriptSchema, type CaptureScript, type CaptureResult } from './types.js';
import { CaptureRunner } from './runner.js';
import { CompositionConfigSchema, FORMAT_SPECS, type CompositionConfig } from './compose/types.js';
import { generateNarration } from './compose/narrate.js';
import { buildTimeline, formatTimeline } from './compose/timeline.js';
import { renderVideo } from './compose/render.js';
import { exportFormats, formatExportResults } from './compose/export.js';
import { isFFmpegAvailable } from './gif.js';
import { isEdgeTtsAvailable } from './compose/narrate.js';

// =============================================================================
// Server Setup
// =============================================================================

const server = new Server(
  { name: 'stickernest-capture', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {} } },
);

// =============================================================================
// Helper: Run compose pipeline
// =============================================================================

async function runCompose(
  manifestPath: string,
  config?: Partial<CompositionConfig>,
): Promise<{ masterVideoPath: string; timelineSummary: string }> {
  const captureDir = path.dirname(manifestPath);
  const manifestData = await fs.readFile(manifestPath, 'utf-8');
  const captureResult: CaptureResult = JSON.parse(manifestData);

  // Build config
  const fullConfig = CompositionConfigSchema.parse({
    captureManifest: manifestPath,
    ...config,
  });

  // Generate narration
  const narrationDir = path.join(captureDir, 'narration');
  const narrationResults = await generateNarration(captureResult, {
    config: fullConfig.narration,
    outputDir: narrationDir,
  });

  // Build timeline
  const timeline = buildTimeline({
    captureResult,
    config: fullConfig,
    narrationResults,
    captureDir,
  });
  const timelineSummary = formatTimeline(timeline);

  // Render
  const masterVideoPath = path.join(captureDir, 'master.mp4');
  await renderVideo({ timeline, config: fullConfig, outputPath: masterVideoPath });

  return { masterVideoPath, timelineSummary };
}

// =============================================================================
// Tool Definitions
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'capture_validate',
      description:
        'Validate a CaptureScript JSON object or file path. Returns validation result with details on any errors. Use this before running a capture to catch issues early.',
      inputSchema: {
        type: 'object',
        properties: {
          script: {
            description: 'CaptureScript as a JSON object',
            type: 'object',
          },
          scriptPath: {
            type: 'string',
            description: 'Path to a CaptureScript JSON file (alternative to inline script)',
          },
        },
      },
    },
    {
      name: 'capture_run',
      description:
        'Execute a CaptureScript to capture screenshots, video recordings, and GIFs from a running StickerNest instance. Requires the dev server to be running. Returns a manifest with paths to all captured assets.',
      inputSchema: {
        type: 'object',
        properties: {
          script: {
            description: 'CaptureScript JSON object (required if scriptPath not given)',
            type: 'object',
          },
          scriptPath: {
            type: 'string',
            description: 'Path to CaptureScript JSON file',
          },
          outputDir: {
            type: 'string',
            description: 'Output directory (default: ./output)',
          },
          headless: {
            type: 'boolean',
            description: 'Run in headless mode (default: true)',
          },
          slowMo: {
            type: 'number',
            description: 'Slow down actions by N ms (default: 0)',
          },
          skipVideo: {
            type: 'boolean',
            description: 'Skip video recording (default: false)',
          },
          skipGif: {
            type: 'boolean',
            description: 'Skip GIF capture (default: false)',
          },
        },
      },
    },
    {
      name: 'capture_compose',
      description:
        'Compose captured assets into a master video. Takes a capture manifest (from capture_run) and generates narration, builds a timeline, and renders a master MP4. Requires FFmpeg. Optionally requires edge-tts for narration.',
      inputSchema: {
        type: 'object',
        properties: {
          manifestPath: {
            type: 'string',
            description: 'Path to the capture manifest.json (from capture_run output)',
          },
          config: {
            type: 'object',
            description: 'Composition config overrides (style, narration voice, branding, etc.)',
          },
        },
        required: ['manifestPath'],
      },
    },
    {
      name: 'capture_export',
      description:
        'Export a master video into platform-specific formats (YouTube, TikTok, Twitter, Instagram, GIF, screenshots). Requires FFmpeg.',
      inputSchema: {
        type: 'object',
        properties: {
          masterVideo: {
            type: 'string',
            description: 'Path to the master MP4 video',
          },
          outputDir: {
            type: 'string',
            description: 'Output directory for exported files',
          },
          formats: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Export formats. Options: youtube-standard, youtube-short, tiktok, twitter-video, twitter-square, gif-hero, gif-feature, screenshot-set, instagram-reel. Default: youtube-standard, tiktok, gif-hero, screenshot-set',
          },
          captureManifest: {
            type: 'string',
            description: 'Path to capture manifest (needed for screenshot-set export)',
          },
        },
        required: ['masterVideo'],
      },
    },
    {
      name: 'capture_pipeline',
      description:
        'Run the full capture pipeline end-to-end: capture → compose → export. This is the one-shot tool for producing platform-ready demo content from a CaptureScript. Returns paths to all output files.',
      inputSchema: {
        type: 'object',
        properties: {
          script: {
            description: 'CaptureScript JSON object',
            type: 'object',
          },
          scriptPath: {
            type: 'string',
            description: 'Path to CaptureScript JSON file',
          },
          outputDir: {
            type: 'string',
            description: 'Root output directory (default: ./output)',
          },
          composeConfig: {
            type: 'object',
            description: 'Composition config overrides',
          },
          exportFormats: {
            type: 'array',
            items: { type: 'string' },
            description: 'Export formats (default: youtube-standard, tiktok, gif-hero, screenshot-set)',
          },
          headless: {
            type: 'boolean',
            description: 'Run capture in headless mode (default: true)',
          },
        },
      },
    },
    {
      name: 'capture_list_formats',
      description:
        'List all available export formats with their resolution, duration limits, codec, and file extension.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'capture_list_voices',
      description:
        'List recommended Edge TTS narration voices for demo content.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

// =============================================================================
// Tool Handlers
// =============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;

  switch (name) {
    // ── capture.validate ──────────────────────────────────────────────
    case 'capture_validate': {
      try {
        let scriptData: unknown;
        if (args.scriptPath) {
          const raw = await fs.readFile(String(args.scriptPath), 'utf-8');
          scriptData = JSON.parse(raw);
        } else if (args.script) {
          scriptData = args.script;
        } else {
          return { content: [{ type: 'text', text: 'Error: Provide either script or scriptPath' }] };
        }

        const script = CaptureScriptSchema.parse(scriptData);
        const captureTypes = {
          screenshots: script.steps.filter((s) => s.capture.screenshot).length,
          videos: script.steps.filter((s) => s.capture.video).length,
          gifs: script.steps.filter((s) => s.capture.gif).length,
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              valid: true,
              name: script.name,
              feature: script.feature,
              audience: script.audience,
              setupSteps: script.setup.length,
              demoSteps: script.steps.length,
              captures: captureTypes,
              target: {
                baseUrl: script.target.baseUrl,
                viewport: script.target.viewport,
              },
            }, null, 2),
          }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const issues = error && typeof error === 'object' && 'issues' in error
          ? (error as any).issues
          : undefined;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ valid: false, error: message, issues }, null, 2),
          }],
        };
      }
    }

    // ── capture.run ───────────────────────────────────────────────────
    case 'capture_run': {
      try {
        let script: CaptureScript;
        if (args.scriptPath) {
          const raw = await fs.readFile(String(args.scriptPath), 'utf-8');
          script = CaptureScriptSchema.parse(JSON.parse(raw));
        } else if (args.script) {
          script = CaptureScriptSchema.parse(args.script);
        } else {
          return { content: [{ type: 'text', text: 'Error: Provide either script or scriptPath' }] };
        }

        const outputDir = String(args.outputDir || path.resolve(process.cwd(), 'output'));
        const runner = new CaptureRunner({
          outputDir,
          headless: args.headless !== false,
          slowMo: Number(args.slowMo) || 0,
          skipVideo: Boolean(args.skipVideo),
          skipGif: Boolean(args.skipGif),
        });

        const startTime = Date.now();
        const result = await runner.run(script);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        const manifestPath = path.join(outputDir, script.name, 'capture', 'manifest.json');

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              elapsed: `${elapsed}s`,
              manifestPath,
              screenshots: result.screenshots.length,
              recordings: result.recordings.length,
              gifs: result.gifs.length,
              totalDurationMs: result.totalDurationMs,
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Capture failed: ${error instanceof Error ? error.message : error}` }],
        };
      }
    }

    // ── capture.compose ───────────────────────────────────────────────
    case 'capture_compose': {
      try {
        const manifestPath = String(args.manifestPath);
        const { masterVideoPath, timelineSummary } = await runCompose(
          manifestPath,
          args.config as Partial<CompositionConfig> | undefined,
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              masterVideoPath,
              timelineSummary,
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Compose failed: ${error instanceof Error ? error.message : error}` }],
        };
      }
    }

    // ── capture.export ────────────────────────────────────────────────
    case 'capture_export': {
      try {
        const masterVideo = String(args.masterVideo);
        const outputDir = String(args.outputDir || path.join(path.dirname(masterVideo), 'exports'));
        const formats = (args.formats as string[]) || [
          'youtube-standard', 'tiktok', 'gif-hero', 'screenshot-set',
        ];

        const results = await exportFormats({
          formats: formats as any,
          outputDir,
          masterVideo,
          captureManifest: args.captureManifest ? String(args.captureManifest) : undefined,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              exported: results.length,
              summary: formatExportResults(results),
              files: results.map((r) => ({
                format: r.format,
                path: r.path,
                resolution: `${r.width}x${r.height}`,
                durationSec: r.durationSec,
              })),
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Export failed: ${error instanceof Error ? error.message : error}` }],
        };
      }
    }

    // ── capture.pipeline (full end-to-end) ────────────────────────────
    case 'capture_pipeline': {
      try {
        // Step 1: Parse script
        let script: CaptureScript;
        if (args.scriptPath) {
          const raw = await fs.readFile(String(args.scriptPath), 'utf-8');
          script = CaptureScriptSchema.parse(JSON.parse(raw));
        } else if (args.script) {
          script = CaptureScriptSchema.parse(args.script);
        } else {
          return { content: [{ type: 'text', text: 'Error: Provide either script or scriptPath' }] };
        }

        const outputDir = String(args.outputDir || path.resolve(process.cwd(), 'output'));
        const startTime = Date.now();

        // Step 2: Capture
        const runner = new CaptureRunner({
          outputDir,
          headless: args.headless !== false,
        });
        const captureResult = await runner.run(script);
        const manifestPath = path.join(outputDir, script.name, 'capture', 'manifest.json');

        // Step 3: Compose
        const { masterVideoPath, timelineSummary } = await runCompose(
          manifestPath,
          args.composeConfig as Partial<CompositionConfig> | undefined,
        );

        // Step 4: Export
        const exportDir = path.join(outputDir, script.name, 'exports');
        const formats = (args.exportFormats as string[]) || [
          'youtube-standard', 'tiktok', 'gif-hero', 'screenshot-set',
        ];
        const exportResults = await exportFormats({
          formats: formats as any,
          outputDir: exportDir,
          masterVideo: masterVideoPath,
          captureManifest: manifestPath,
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              elapsed: `${elapsed}s`,
              scriptName: script.name,
              capture: {
                screenshots: captureResult.screenshots.length,
                recordings: captureResult.recordings.length,
                gifs: captureResult.gifs.length,
                manifestPath,
              },
              compose: {
                masterVideoPath,
                timelineSummary,
              },
              export: {
                count: exportResults.length,
                files: exportResults.map((r) => ({
                  format: r.format,
                  path: r.path,
                  resolution: `${r.width}x${r.height}`,
                })),
              },
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Pipeline failed: ${error instanceof Error ? error.message : error}`,
          }],
        };
      }
    }

    // ── capture.list_formats ──────────────────────────────────────────
    case 'capture_list_formats': {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(FORMAT_SPECS, null, 2),
        }],
      };
    }

    // ── capture.list_voices ───────────────────────────────────────────
    case 'capture_list_voices': {
      const voices = [
        { name: 'en-US-JennyNeural', gender: 'Female', locale: 'US', notes: 'Default — warm and professional' },
        { name: 'en-US-GuyNeural', gender: 'Male', locale: 'US', notes: 'Clear, authoritative' },
        { name: 'en-US-AriaNeural', gender: 'Female', locale: 'US', notes: 'Expressive, versatile' },
        { name: 'en-US-DavisNeural', gender: 'Male', locale: 'US', notes: 'Calm, professional' },
        { name: 'en-US-SaraNeural', gender: 'Female', locale: 'US', notes: 'Young, energetic' },
        { name: 'en-GB-SoniaNeural', gender: 'Female', locale: 'UK', notes: 'British accent, polished' },
        { name: 'en-GB-RyanNeural', gender: 'Male', locale: 'UK', notes: 'British accent, confident' },
        { name: 'en-US-JasonNeural', gender: 'Male', locale: 'US', notes: 'Casual, friendly' },
      ];
      return {
        content: [{ type: 'text', text: JSON.stringify(voices, null, 2) }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// =============================================================================
// Resources — Pipeline Status and Capabilities
// =============================================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'capture://capabilities',
      name: 'Capture Pipeline Capabilities',
      description: 'System requirements and available features',
      mimeType: 'application/json',
    },
    {
      uri: 'capture://formats',
      name: 'Export Formats',
      description: 'All supported export format specifications',
      mimeType: 'application/json',
    },
    {
      uri: 'capture://script-schema',
      name: 'CaptureScript Schema',
      description: 'JSON schema for CaptureScript format',
      mimeType: 'application/json',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'capture://capabilities': {
      const ffmpeg = await isFFmpegAvailable();
      const tts = await isEdgeTtsAvailable();

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            ffmpegAvailable: ffmpeg,
            edgeTtsAvailable: tts,
            playwrightAvailable: true, // always true since it's a dependency
            features: {
              capture: true,
              compose: ffmpeg,
              narration: tts,
              export: ffmpeg,
              fullPipeline: ffmpeg,
            },
            exportFormats: Object.keys(FORMAT_SPECS),
          }, null, 2),
        }],
      };
    }

    case 'capture://formats':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(FORMAT_SPECS, null, 2),
        }],
      };

    case 'capture://script-schema':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            description: 'CaptureScript defines a sequence of browser actions to capture demo content',
            required: ['name', 'feature', 'audience', 'target', 'steps'],
            properties: {
              name: 'lowercase-alphanumeric-with-hyphens',
              feature: 'Human-readable feature name',
              audience: 'creator | developer | investor',
              target: {
                baseUrl: 'URL to navigate to',
                viewport: { width: 'number', height: 'number' },
                deviceScaleFactor: 'number (default: 2)',
              },
              setup: 'Steps run before capture (no screenshots taken)',
              steps: 'Demo steps — each with an action, capture config, and optional narration',
              metadata: { hook: 'string', cta: 'string', tags: 'string[]', description: 'string' },
            },
            actionTypes: [
              'navigate', 'click', 'drag', 'type', 'scroll', 'wait',
              'waitForSelector', 'viewport', 'keyboard', 'hover', 'eval',
            ],
          }, null, 2),
        }],
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// =============================================================================
// Start
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('StickerNest Capture MCP Server v0.1.0 running on stdio');
}

main().catch(console.error);
