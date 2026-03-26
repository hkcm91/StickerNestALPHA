#!/usr/bin/env node
/**
 * StickerNest Capture Pipeline — CLI Entry Point
 *
 * Usage:
 *   npx tsx src/index.ts run --script <path-to-script.json> [options]
 *   npx tsx src/index.ts validate --script <path-to-script.json>
 *   npx tsx src/index.ts compose --manifest <path-to-manifest.json> [options]
 *   npx tsx src/index.ts export --master <path-to-video.mp4> --output <dir> [options]
 *
 * Options:
 *   --script, -s     Path to the capture script JSON file (required for run/validate)
 *   --output, -o     Output directory (default: ./output)
 *   --headed         Run in headful mode (show browser)
 *   --slow-mo <ms>   Slow down actions by this many ms
 *   --skip-video     Skip video recording
 *   --skip-gif       Skip GIF capture
 *   --manifest       Path to capture manifest.json (for compose)
 *   --master         Path to master video (for export)
 *   --formats        Comma-separated export formats (for export)
 *   --help, -h       Show this help message
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CaptureScriptSchema } from './types.js';
import { CaptureRunner } from './runner.js';
import { CompositionConfigSchema } from './compose/types.js';
import { generateNarration } from './compose/narrate.js';
import { buildTimeline, formatTimeline } from './compose/timeline.js';
import { renderVideo } from './compose/render.js';
import { exportFormats, formatExportResults } from './compose/export.js';

// =============================================================================
// CLI Argument Parsing (lightweight, no dependencies)
// =============================================================================

interface CliArgs {
  command: 'run' | 'validate' | 'compose' | 'export' | 'help';
  scriptPath: string | null;
  outputDir: string;
  headed: boolean;
  slowMo: number;
  skipVideo: boolean;
  skipGif: boolean;
  manifestPath: string | null;
  masterVideo: string | null;
  formats: string | null;
  configPath: string | null;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    command: 'help',
    scriptPath: null,
    outputDir: path.resolve(process.cwd(), 'output'),
    headed: false,
    slowMo: 0,
    skipVideo: false,
    skipGif: false,
    manifestPath: null,
    masterVideo: null,
    formats: null,
    configPath: null,
  };

  // Skip node and script path
  const cliArgs = argv.slice(2);

  if (cliArgs.length === 0) {
    return args;
  }

  // First positional arg is the command
  const command = cliArgs[0];
  if (command === 'run' || command === 'validate' || command === 'compose' || command === 'export') {
    args.command = command;
  } else if (command === '--help' || command === '-h') {
    args.command = 'help';
    return args;
  }

  // Parse flags
  for (let i = 1; i < cliArgs.length; i++) {
    const arg = cliArgs[i];
    switch (arg) {
      case '--script':
      case '-s':
        args.scriptPath = cliArgs[++i];
        break;
      case '--output':
      case '-o':
        args.outputDir = path.resolve(cliArgs[++i]);
        break;
      case '--headed':
        args.headed = true;
        break;
      case '--slow-mo':
        args.slowMo = parseInt(cliArgs[++i], 10);
        break;
      case '--skip-video':
        args.skipVideo = true;
        break;
      case '--skip-gif':
        args.skipGif = true;
        break;
      case '--manifest':
        args.manifestPath = cliArgs[++i];
        break;
      case '--master':
        args.masterVideo = cliArgs[++i];
        break;
      case '--formats':
        args.formats = cliArgs[++i];
        break;
      case '--config':
        args.configPath = cliArgs[++i];
        break;
      case '--help':
      case '-h':
        args.command = 'help';
        return args;
    }
  }

  return args;
}

// =============================================================================
// Commands
// =============================================================================

async function loadScript(scriptPath: string) {
  const absolutePath = path.resolve(scriptPath);
  const raw = await fs.readFile(absolutePath, 'utf-8');
  const json = JSON.parse(raw);
  return CaptureScriptSchema.parse(json);
}

async function commandValidate(scriptPath: string): Promise<void> {
  console.log(`\n  Validating: ${scriptPath}\n`);

  try {
    const script = await loadScript(scriptPath);
    console.log(`  ✓ Script "${script.name}" is valid`);
    console.log(`    Feature:  ${script.feature}`);
    console.log(`    Audience: ${script.audience}`);
    console.log(`    Setup:    ${script.setup.length} steps`);
    console.log(`    Demo:     ${script.steps.length} steps`);
    console.log(`    Target:   ${script.target.baseUrl}`);
    console.log(`    Viewport: ${script.target.viewport.width}x${script.target.viewport.height}`);

    const captureTypes = {
      screenshots: script.steps.filter((s) => s.capture.screenshot).length,
      videos: script.steps.filter((s) => s.capture.video).length,
      gifs: script.steps.filter((s) => s.capture.gif).length,
    };
    console.log(`    Captures: ${captureTypes.screenshots} screenshots, ${captureTypes.videos} video segments, ${captureTypes.gifs} GIFs`);
    console.log();
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      console.error('  ✗ Validation failed:\n');
      const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
      for (const issue of zodError.issues) {
        console.error(`    • ${issue.path.join('.')}: ${issue.message}`);
      }
    } else {
      console.error(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
    }
    console.log();
    process.exit(1);
  }
}

async function commandRun(args: CliArgs): Promise<void> {
  if (!args.scriptPath) {
    console.error('\n  Error: --script <path> is required\n');
    process.exit(1);
  }

  console.log(`\n  ┌─────────────────────────────────────┐`);
  console.log(`  │  StickerNest Capture Pipeline v0.1  │`);
  console.log(`  └─────────────────────────────────────┘\n`);

  // Load and validate script
  console.log(`  Loading script: ${args.scriptPath}`);
  const script = await loadScript(args.scriptPath);
  console.log(`  ✓ Script "${script.name}" loaded (${script.steps.length} steps)\n`);

  // Create runner
  const runner = new CaptureRunner({
    outputDir: args.outputDir,
    headless: !args.headed,
    slowMo: args.slowMo,
    skipVideo: args.skipVideo,
    skipGif: args.skipGif,
  });

  // Run capture
  console.log(`  Target:    ${script.target.baseUrl}`);
  console.log(`  Viewport:  ${script.target.viewport.width}x${script.target.viewport.height}`);
  console.log(`  Output:    ${args.outputDir}/${script.name}/capture/`);
  console.log(`  Mode:      ${args.headed ? 'headful' : 'headless'}`);
  console.log();
  console.log(`  Capturing...`);

  const startTime = Date.now();

  try {
    const result = await runner.run(script);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n  ✓ Capture complete in ${elapsed}s\n`);
    console.log(`  Results:`);
    console.log(`    Screenshots: ${result.screenshots.length}`);
    console.log(`    Recordings:  ${result.recordings.length}`);
    console.log(`    GIFs:        ${result.gifs.length}`);
    console.log(`    Duration:    ${(result.totalDurationMs / 1000).toFixed(1)}s`);
    console.log();
    console.log(`  Manifest: ${args.outputDir}/${script.name}/capture/manifest.json`);
    console.log();
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n  ✗ Capture failed after ${elapsed}s`);
    console.error(`    ${error instanceof Error ? error.message : error}`);
    console.log();
    process.exit(1);
  }
}

async function commandCompose(args: CliArgs): Promise<void> {
  if (!args.manifestPath) {
    console.error('\n  Error: --manifest <path-to-manifest.json> is required\n');
    process.exit(1);
  }

  console.log(`\n  ┌───────────────────────────────────────────┐`);
  console.log(`  │  StickerNest Compose Pipeline v0.1        │`);
  console.log(`  └───────────────────────────────────────────┘\n`);

  const manifestPath = path.resolve(args.manifestPath);
  const captureDir = path.dirname(manifestPath);

  // Load capture manifest
  console.log(`  Loading manifest: ${manifestPath}`);
  const manifestData = await fs.readFile(manifestPath, 'utf-8');
  const captureResult = JSON.parse(manifestData);
  console.log(`  ✓ Manifest loaded (${captureResult.screenshots?.length ?? 0} screenshots)\n`);

  // Load or build composition config
  let configData: Record<string, unknown> = { captureManifest: manifestPath };
  if (args.configPath) {
    const raw = await fs.readFile(path.resolve(args.configPath), 'utf-8');
    configData = { ...JSON.parse(raw), captureManifest: manifestPath };
  }
  const config = CompositionConfigSchema.parse(configData);

  // Step 1: Generate narration
  console.log(`  Step 1: Generating narration...`);
  const narrationDir = path.join(captureDir, 'narration');
  const narrationResults = await generateNarration(captureResult, {
    config: config.narration,
    outputDir: narrationDir,
  });
  console.log(`  ✓ ${narrationResults.length} narration clips generated\n`);

  // Step 2: Build timeline
  console.log(`  Step 2: Building timeline...`);
  const timeline = buildTimeline({
    captureResult,
    config,
    narrationResults,
    captureDir,
  });
  console.log(formatTimeline(timeline));
  console.log();

  // Step 3: Render master video
  const outputPath = path.join(captureDir, 'master.mp4');
  console.log(`  Step 3: Rendering master video...`);
  await renderVideo({ timeline, config, outputPath });
  console.log(`\n  ✓ Compose complete: ${outputPath}\n`);
}

async function commandExport(args: CliArgs): Promise<void> {
  if (!args.masterVideo) {
    console.error('\n  Error: --master <path-to-video.mp4> is required\n');
    process.exit(1);
  }

  console.log(`\n  ┌───────────────────────────────────────────┐`);
  console.log(`  │  StickerNest Export Pipeline v0.1         │`);
  console.log(`  └───────────────────────────────────────────┘\n`);

  const masterVideo = path.resolve(args.masterVideo);
  const outputDir = path.resolve(args.outputDir, 'exports');

  // Determine formats
  const defaultFormats = ['youtube-standard', 'tiktok', 'gif-hero', 'screenshot-set'];
  const formats = args.formats
    ? args.formats.split(',').map((f) => f.trim())
    : defaultFormats;

  console.log(`  Master video: ${masterVideo}`);
  console.log(`  Output dir:   ${outputDir}`);
  console.log(`  Formats:      ${formats.join(', ')}\n`);

  const results = await exportFormats({
    formats: formats as any, // Zod will validate
    outputDir,
    masterVideo,
    captureManifest: args.manifestPath ?? undefined,
  });

  console.log(`\n${formatExportResults(results)}\n`);
}

function showHelp(): void {
  console.log(`
  StickerNest Capture Pipeline

  Usage:
    sn-capture run --script <path.json> [options]
    sn-capture validate --script <path.json>
    sn-capture compose --manifest <path-to-manifest.json> [--config <compose-config.json>]
    sn-capture export --master <path-to-video.mp4> [--formats youtube-standard,tiktok,gif-hero]

  Commands:
    run         Execute a capture script
    validate    Validate a capture script without running it
    compose     Compose captured assets into a master video (narration + timeline + render)
    export      Export master video into platform-specific formats

  Run Options:
    --script, -s <path>   Path to capture script JSON (required)
    --output, -o <dir>    Output directory (default: ./output)
    --headed              Show browser window during capture
    --slow-mo <ms>        Slow down actions (for debugging)
    --skip-video          Skip video recording
    --skip-gif            Skip GIF capture

  Compose Options:
    --manifest <path>     Path to capture manifest.json (required)
    --config <path>       Path to composition config JSON (optional)

  Export Options:
    --master <path>       Path to master video file (required)
    --output, -o <dir>    Output directory (default: ./output/exports)
    --formats <list>      Comma-separated format names (default: youtube-standard,tiktok,gif-hero,screenshot-set)
    --manifest <path>     Path to capture manifest (needed for screenshot-set export)

    --help, -h            Show this help
  `);
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  switch (args.command) {
    case 'validate':
      if (!args.scriptPath) {
        console.error('\n  Error: --script <path> is required\n');
        process.exit(1);
      }
      await commandValidate(args.scriptPath);
      break;

    case 'run':
      await commandRun(args);
      break;

    case 'compose':
      await commandCompose(args);
      break;

    case 'export':
      await commandExport(args);
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

main().catch((error) => {
  console.error(`\n  Fatal: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});

// Re-export public API for programmatic use
export { CaptureRunner, runCaptureScript } from './runner.js';
export type { RunnerOptions } from './runner.js';
export {
  CaptureScriptSchema,
  CaptureResultSchema,
  type CaptureScript,
  type CaptureResult,
  type CaptureStep,
} from './types.js';

// Phase 2: Compose & Export API
export { generateNarration, isEdgeTtsAvailable, getAudioDuration } from './compose/narrate.js';
export { buildTimeline, formatTimeline } from './compose/timeline.js';
export { renderVideo } from './compose/render.js';
export type { RenderOptions } from './compose/render.js';
export { exportFormats, formatExportResults } from './compose/export.js';
export type { ExportResult } from './compose/export.js';
export {
  CompositionConfigSchema,
  ExportConfigSchema,
  ExportFormatSchema,
  FORMAT_SPECS,
  type CompositionConfig,
  type ExportConfig,
  type ExportFormat,
  type Timeline,
  type TimelineSegment,
  type NarrationResult,
} from './compose/types.js';
