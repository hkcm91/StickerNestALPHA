/**
 * StickerNest Capture Runner
 *
 * Drives a headless Playwright browser through a CaptureScript,
 * executing actions and capturing screenshots, video, and GIF segments.
 *
 * @remarks
 * This is the core of Stage 1. It accepts a validated CaptureScript and
 * produces a CaptureResult with paths to all captured artifacts.
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CaptureScript, CaptureStep, CaptureResult, ScreenshotResult, RecordingResult, GifResult } from './types.js';
import { compileGif } from './gif.js';

// =============================================================================
// Configuration
// =============================================================================

export interface RunnerOptions {
  /** Root output directory. Defaults to ./capture/output */
  outputDir?: string;
  /** Whether to run in headful mode (useful for debugging) */
  headless?: boolean;
  /** Slow down actions by this many ms (useful for debugging) */
  slowMo?: number;
  /** Skip video recording even if script requests it */
  skipVideo?: boolean;
  /** Skip GIF capture even if script requests it */
  skipGif?: boolean;
}

const DEFAULT_OPTIONS: Required<RunnerOptions> = {
  outputDir: path.resolve(process.cwd(), 'output'),
  headless: true,
  slowMo: 0,
  skipVideo: false,
  skipGif: false,
};

// =============================================================================
// Capture Runner
// =============================================================================

export class CaptureRunner {
  private options: Required<RunnerOptions>;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  /** Resolved canvas URL after dev pre-flight navigation (e.g. /canvas/untitled-canvas) */
  private resolvedCanvasUrl: string | null = null;
  /** Base URL from the active script — used to detect and redirect base-URL navigations */
  private scriptBaseUrl: string | null = null;

  constructor(options: RunnerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a capture script and return the result manifest.
   */
  async run(script: CaptureScript): Promise<CaptureResult> {
    const startTime = Date.now();
    const scriptOutputDir = path.join(this.options.outputDir, script.name, 'capture');

    // Create output directories
    await fs.mkdir(path.join(scriptOutputDir, 'screenshots'), { recursive: true });
    await fs.mkdir(path.join(scriptOutputDir, 'recordings'), { recursive: true });
    await fs.mkdir(path.join(scriptOutputDir, 'gifs'), { recursive: true });

    // Result accumulators
    const screenshots: ScreenshotResult[] = [];
    const recordings: RecordingResult[] = [];
    const gifs: GifResult[] = [];

    try {
      // Launch browser
      await this.launchBrowser(script);

      // Run setup steps (no captures)
      for (const step of script.setup) {
        await this.executeAction(step);
      }

      // Run demo steps with captures
      let stepIndex = 0;
      for (const step of script.steps) {
        stepIndex++;
        const prefix = String(stepIndex).padStart(2, '0');
        const stepStartMs = Date.now() - startTime;

        // Start video recording if requested
        let videoStartMs = stepStartMs;
        if (step.capture.video && !this.options.skipVideo) {
          // Video is recorded at the context level in Playwright
          // We track timing for the manifest
          videoStartMs = Date.now() - startTime;
        }

        // Execute the action
        await this.executeAction(step);

        // Wait for the settle delay
        if (step.capture.settleDelay > 0) {
          await this.page!.waitForTimeout(step.capture.settleDelay);
        }

        // Capture screenshot
        if (step.capture.screenshot) {
          const screenshotPath = path.join('screenshots', `${prefix}-${step.id}.png`);
          const fullPath = path.join(scriptOutputDir, screenshotPath);

          const screenshotOptions: Parameters<Page['screenshot']>[0] = {
            path: fullPath,
            type: 'png',
            fullPage: false,
          };

          if (step.capture.clip) {
            screenshotOptions.clip = step.capture.clip;
          }

          await this.page!.screenshot(screenshotOptions);

          screenshots.push({
            stepId: step.id,
            label: step.label,
            path: screenshotPath,
            timestamp: Date.now() - startTime,
            annotation: step.capture.annotation,
            narration: step.narration,
          });
        }

        // Capture GIF segment
        if (step.capture.gif && !this.options.skipGif) {
          const gifPath = path.join('gifs', `${prefix}-${step.id}.gif`);
          const fullGifPath = path.join(scriptOutputDir, gifPath);
          const framesDir = path.join(scriptOutputDir, 'gifs', `${prefix}-${step.id}-frames`);

          await fs.mkdir(framesDir, { recursive: true });

          const gifResult = await this.captureGifFrames(
            step,
            framesDir,
            fullGifPath,
          );

          if (gifResult) {
            gifs.push({
              stepId: step.id,
              label: step.label,
              path: gifPath,
              durationMs: gifResult.durationMs,
            });
          }

          // Clean up frame directory (ignore EPERM — frames dir not critical)
          try {
            await fs.rm(framesDir, { recursive: true, force: true });
          } catch {
            // EPERM can occur on some filesystems; frames are non-essential cleanup
          }
        }

        // Track video recording segment
        if (step.capture.video && !this.options.skipVideo) {
          const videoEndMs = Date.now() - startTime;
          recordings.push({
            stepId: step.id,
            label: step.label,
            path: '', // Will be set after context closes
            startMs: videoStartMs,
            endMs: videoEndMs,
            narration: step.narration,
          });
        }
      }

      // Close context to finalize video recordings
      const videoPath = await this.finalizeVideo(script, scriptOutputDir);
      if (videoPath && recordings.length > 0) {
        // Playwright records one video per context — set the path on all recording entries
        for (const rec of recordings) {
          rec.path = path.relative(scriptOutputDir, videoPath);
        }
        // Convert WebM → MP4 using ffmpeg for social media compatibility
        const mp4Path = await this.convertToMp4(videoPath, scriptOutputDir);
        if (mp4Path) {
          console.log(`[runner:video] MP4 export: ${mp4Path}`);
        }
      }
    } finally {
      await this.cleanup();
    }

    const totalDurationMs = Date.now() - startTime;

    const result: CaptureResult = {
      scriptName: script.name,
      feature: script.feature,
      audience: script.audience,
      screenshots,
      recordings,
      gifs,
      totalDurationMs,
      capturedAt: new Date(startTime).toISOString(),
      metadata: {
        hook: script.metadata.hook,
        cta: script.metadata.cta,
        tags: script.metadata.tags,
        description: script.metadata.description,
      },
      targetUrl: script.target.baseUrl,
      viewport: {
        width: script.target.viewport.width,
        height: script.target.viewport.height,
      },
    };

    // Write manifest
    const manifestPath = path.join(scriptOutputDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(result, null, 2), 'utf-8');

    return result;
  }

  // ===========================================================================
  // Browser Lifecycle
  // ===========================================================================

  private async launchBrowser(script: CaptureScript): Promise<void> {
    const hasVideoSteps = script.steps.some((s) => s.capture.video);
    const needsVideo = hasVideoSteps && !this.options.skipVideo;

    this.browser = await chromium.launch({
      headless: this.options.headless,
      args: [
        '--use-gl=swiftshader',        // GPU-free rendering for consistency
        '--disable-gpu',
        '--no-sandbox',
      ],
    });

    const contextOptions: Parameters<Browser['newContext']>[0] = {
      viewport: {
        width: script.target.viewport.width,
        height: script.target.viewport.height,
      },
      deviceScaleFactor: script.target.deviceScaleFactor,
    };

    if (needsVideo) {
      const videoDir = path.join(this.options.outputDir, script.name, 'capture', 'recordings');
      await fs.mkdir(videoDir, { recursive: true });
      contextOptions.recordVideo = {
        dir: videoDir,
        size: {
          width: script.target.viewport.width,
          height: script.target.viewport.height,
        },
      };
    }

    this.context = await this.browser.newContext(contextOptions);

    // --- Dev Supabase route proxying ---
    // Proxy ALL Supabase API requests through Playwright's fetch handler. This adds
    // async overhead that prevents a sign-out race condition where Supabase REST 401s
    // trigger an auth.signOut() before the canvas finishes mounting. Without this
    // intercept, the app navigates to /login before we can land on the canvas.
    // For specific endpoints that would return 401 (dev user not in remote DB), we
    // substitute stub 200 responses; everything else passes through unchanged.
    const SUPABASE_REF = 'lmewtcluzfzqlzwqunst';
    const DEV_USER_ID = 'a0000000-0000-4000-8000-000000000001';
    // Use catch-all pattern — context.route(RegExp) has reliability issues with tsx;
    // catch-all with explicit continue for non-Supabase URLs is the proven approach.
    await this.context.route('**', async (route) => {
      const url = route.request().url();

      // Only intercept Supabase API requests; let everything else continue normally
      if (!url.includes(SUPABASE_REF + '.supabase.co')) {
        try {
          await route.continue();
        } catch {
          // Some request types (data:, chrome:, aborted) can't be continued — ignore
        }
        return;
      }

      console.log(`[runner:route] ${route.request().method()} ${url.replace(`https://${SUPABASE_REF}.supabase.co`, '').slice(0, 80)}`);

      // Stub auth/user → return dev user so supabase-js stays authenticated
      if (url.includes('/auth/v1/user')) {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({
            id: DEV_USER_ID, aud: 'authenticated', role: 'authenticated',
            email: 'woahitskimber@gmail.com', email_confirmed_at: '2025-01-01T00:00:00Z',
            app_metadata: { provider: 'email' }, user_metadata: { display_name: 'Kimber' },
            created_at: '2025-01-01T00:00:00Z', updated_at: new Date().toISOString(),
          }),
        });
        return;
      }

      // Stub users table → return tier row so app doesn't redirect on missing tier
      if (url.includes('/rest/v1/users')) {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify([{ id: DEV_USER_ID, tier: 'creator', email: 'woahitskimber@gmail.com', display_name: 'Kimber' }]),
        });
        return;
      }

      // All other Supabase requests: fetch from real server (passes through, adds latency
      // that prevents the sign-out race), then forward the response.
      try {
        const response = await route.fetch();
        await route.fulfill({ response });
      } catch {
        // If fetch fails (network error), return empty 200 so the app doesn't crash
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
    });

    // --- Dev auth injection ---
    // Inject a mock Supabase session so the app bypasses the login page.
    // Pass as a content string (not a function) to avoid tsx/Playwright serialization issues
    // where fn.toString() may retain TypeScript annotations that the browser cannot parse.
    const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 365;
    await this.context.addInitScript({
      content: `
        (function() {
          var SUPABASE_REF = 'lmewtcluzfzqlzwqunst';
          var expiresAt = ${expiresAt};
          var userId = 'a0000000-0000-4000-8000-000000000001';
          function b64(s) { return btoa(s).replace(/=+$/, ''); }
          function makeJwt(payload) {
            return b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + b64(JSON.stringify(payload)) + '.dev_sig';
          }
          var session = {
            access_token: makeJwt({ aud: 'authenticated', exp: expiresAt, iat: Math.floor(Date.now() / 1000), sub: userId, email: 'woahitskimber@gmail.com', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { display_name: 'Kimber' } }),
            token_type: 'bearer',
            expires_in: 86400 * 365,
            expires_at: expiresAt,
            refresh_token: 'dev_refresh',
            user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'woahitskimber@gmail.com', email_confirmed_at: '2025-01-01T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: { display_name: 'Kimber' }, created_at: '2025-01-01T00:00:00Z' }
          };
          localStorage.setItem('sb-' + SUPABASE_REF + '-auth-token', JSON.stringify(session));
          console.log('[runner:initScript] session injected into localStorage, expires_at=' + expiresAt);
        })();
      `,
    });

    this.page = await this.context.newPage();

    // Log browser console output — helps diagnose auth/initScript failures
    this.page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[runner:') || text.includes('supabase') || text.includes('auth') || text.includes('sign') || text.includes('error') || text.includes('Error')) {
        console.log(`[browser:${msg.type()}] ${text.slice(0, 120)}`);
      }
    });

    // Navigate to base URL — use 'load' not 'networkidle'; real-time apps (Supabase/WebSocket)
    // never reach networkidle and will timeout.
    await this.page.goto(script.target.baseUrl, { waitUntil: 'load' });
    await this.page.waitForTimeout(2500); // Allow supabase auth + tier check to settle

    // Dev pre-flight: navigate through dashboard / canvas gallery to land on a live canvas.
    // Dashboard → canvas nav
    const onDashboard = await this.page.$('[data-testid="page-dashboard"]');
    if (onDashboard) {
      await this.page.goto(new URL('/canvas', script.target.baseUrl).href, { waitUntil: 'load' });
      await this.page.waitForTimeout(1500);
    }
    // Canvas gallery → create new canvas
    const createBtn = await this.page.$('[data-testid="canvas-gallery-create"]');
    if (createBtn) {
      await createBtn.click();
      await this.page.waitForTimeout(2000);
    }

    // Save the base URL and resolved canvas URL so setup 'navigate' steps that point
    // at the base URL are redirected here instead of bouncing back to the dashboard.
    this.scriptBaseUrl = script.target.baseUrl;
    this.resolvedCanvasUrl = this.page.url();
    console.log(`[runner:launchBrowser] resolvedCanvasUrl=${this.resolvedCanvasUrl} scriptBaseUrl=${this.scriptBaseUrl}`);
  }

  private async finalizeVideo(
    script: CaptureScript,
    scriptOutputDir: string,
  ): Promise<string | null> {
    if (!this.page || !this.context) return null;

    const hasVideoSteps = script.steps.some((s) => s.capture.video);
    if (!hasVideoSteps || this.options.skipVideo) return null;

    // Close the page to finalize the video
    const video = this.page.video();
    if (!video) return null;

    await this.page.close();
    this.page = null;

    const videoPath = await video.path();
    return videoPath || null;
  }

  /**
   * Convert a WebM video to MP4 using ffmpeg for social media compatibility.
   * Returns the path to the MP4 file, or null if conversion failed.
   */
  private async convertToMp4(
    webmPath: string,
    scriptOutputDir: string,
  ): Promise<string | null> {
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      const mp4Dir = path.join(scriptOutputDir, 'recordings');
      const mp4Name = path.basename(webmPath, '.webm') + '.mp4';
      const mp4Path = path.join(mp4Dir, mp4Name);

      // libx264 + aac — universal social media compatibility
      // -movflags +faststart — streaming-optimized (moov atom at front)
      // -pix_fmt yuv420p — broad player compatibility
      const cmd = [
        'ffmpeg', '-y',
        '-i', `"${webmPath}"`,
        '-c:v', 'libx264',
        '-crf', '23',
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-c:a', 'aac',
        '-b:a', '128k',
        `"${mp4Path}"`,
      ].join(' ');

      console.log(`[runner:ffmpeg] converting WebM → MP4...`);
      await execAsync(cmd, { timeout: 120_000 });
      return mp4Path;
    } catch (err) {
      console.error(`[runner:ffmpeg] conversion failed:`, err);
      return null;
    }
  }

  private async cleanup(): Promise<void> {
    if (this.page) {
      try {
        await this.page.close();
      } catch {
        // Page may already be closed
      }
      this.page = null;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // ===========================================================================
  // Action Execution
  // ===========================================================================

  private async executeAction(step: CaptureStep): Promise<void> {
    const action = step.action;
    const page = this.page!;

    switch (action.type) {
      case 'navigate': {
        // If the script navigates back to the base URL, redirect to the resolved canvas URL
        // instead — the dev pre-flight already navigated there and we don't want to bounce
        // back to the dashboard / login page.
        const navTarget =
          this.resolvedCanvasUrl &&
          this.scriptBaseUrl &&
          (action.url === this.scriptBaseUrl || action.url === this.scriptBaseUrl.replace(/\/$/, ''))
            ? this.resolvedCanvasUrl
            : action.url;
        // Skip the navigation entirely if we're already on the target page.
        // This avoids a full reload of the canvas which would re-trigger Supabase
        // fetches that fail with 401 on the dev fake session.
        console.log(`[runner:navigate] page.url()=${page.url()} navTarget=${navTarget} skip=${page.url() === navTarget}`);
        if (page.url() !== navTarget) {
          await page.goto(navTarget, { waitUntil: 'load' });
        }
        break;
      }

      case 'click': {
        const clickLocator = page.locator(action.selector);
        // Try scrollIntoView first
        try {
          await clickLocator.scrollIntoViewIfNeeded({ timeout: 2000 });
        } catch {
          // ignore — overflow:hidden containers can't scroll
        }
        // Try native Playwright click; fall back to JS dispatchEvent for off-viewport elements
        try {
          await page.click(action.selector, {
            button: action.button,
            clickCount: action.clickCount,
            timeout: 5000,
          });
        } catch {
          // Element is outside viewport or not interactable — dispatch click via JS
          await page.locator(action.selector).dispatchEvent('click');
        }
        break;
      }

      case 'drag': {
        await page.mouse.move(action.from.x, action.from.y);
        await page.mouse.down();
        // Move in increments for smooth drag
        const dx = (action.to.x - action.from.x) / action.steps;
        const dy = (action.to.y - action.from.y) / action.steps;
        for (let i = 1; i <= action.steps; i++) {
          await page.mouse.move(
            action.from.x + dx * i,
            action.from.y + dy * i,
          );
        }
        await page.mouse.up();
        break;
      }

      case 'type': {
        // Try fill+type for input/textarea; fall back to focus+keyboard for div/canvas
        try {
          await page.fill(action.selector, '');
          await page.type(action.selector, action.text, { delay: action.delay });
        } catch {
          // Element is not fillable (e.g. canvas div) — focus it and use keyboard
          await page.focus(action.selector);
          await page.keyboard.type(action.text, { delay: action.delay });
        }
        break;
      }

      case 'scroll':
        await page.mouse.wheel(action.deltaX, action.deltaY);
        break;

      case 'wait':
        await page.waitForTimeout(action.ms);
        break;

      case 'waitForSelector':
        console.log(`[runner:waitForSelector] selector=${action.selector} state=${action.state} timeout=${action.timeout} currentUrl=${page.url()}`);
        await page.waitForSelector(action.selector, {
          state: action.state,
          timeout: action.timeout,
        });
        break;

      case 'viewport':
        await page.setViewportSize({
          width: action.width,
          height: action.height,
        });
        break;

      case 'keyboard': {
        const modifiers = action.modifiers || [];
        for (const mod of modifiers) {
          await page.keyboard.down(mod);
        }
        await page.keyboard.press(action.key);
        for (const mod of [...modifiers].reverse()) {
          await page.keyboard.up(mod);
        }
        break;
      }

      case 'hover':
        await page.hover(action.selector);
        break;

      case 'eval':
        await page.evaluate(action.script);
        break;

      default:
        // TypeScript exhaustiveness check
        throw new Error(`Unknown action type: ${(action as { type: string }).type}`);
    }
  }

  // ===========================================================================
  // GIF Capture
  // ===========================================================================

  /**
   * Captures rapid screenshots and compiles them into a GIF.
   * Returns null if FFmpeg is not available.
   */
  private async captureGifFrames(
    step: CaptureStep,
    framesDir: string,
    outputPath: string,
  ): Promise<{ durationMs: number } | null> {
    const fps = step.capture.gifFps || 10;
    const duration = step.capture.gifDuration || 3000;
    const intervalMs = 1000 / fps;
    const totalFrames = Math.ceil(duration / intervalMs);

    const page = this.page!;
    const captureStart = Date.now();

    // Capture frames
    for (let i = 0; i < totalFrames; i++) {
      const framePath = path.join(framesDir, `frame-${String(i).padStart(4, '0')}.png`);
      const screenshotOptions: Parameters<Page['screenshot']>[0] = {
        path: framePath,
        type: 'png',
      };
      if (step.capture.clip) {
        screenshotOptions.clip = step.capture.clip;
      }
      await page.screenshot(screenshotOptions);

      // Wait for next frame interval
      const elapsed = Date.now() - captureStart;
      const nextFrameTime = (i + 1) * intervalMs;
      const waitTime = nextFrameTime - elapsed;
      if (waitTime > 0 && i < totalFrames - 1) {
        await page.waitForTimeout(waitTime);
      }
    }

    const actualDuration = Date.now() - captureStart;

    // Compile frames to GIF
    try {
      await compileGif(framesDir, outputPath, fps);
      return { durationMs: actualDuration };
    } catch (error) {
      console.warn(
        `[capture] GIF compilation failed for step "${step.id}": ${error instanceof Error ? error.message : error}. ` +
          'Is FFmpeg installed? Frames are preserved in the output directory.',
      );
      return null;
    }
  }
}

// =============================================================================
// Convenience function
// =============================================================================

/**
 * Run a capture script with default options.
 */
export async function runCaptureScript(
  script: CaptureScript,
  options?: RunnerOptions,
): Promise<CaptureResult> {
  const runner = new CaptureRunner(options);
  return runner.run(script);
}
