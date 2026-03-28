/**
 * Upload Processor — normalizes three upload paths (.html, .zip, .source)
 * into WidgetPackageContents, runs security scan.
 *
 * @module marketplace/upload
 * @layer L5
 */

import { WidgetManifestSchema, type WidgetPackageContents } from '@sn/types';

import type { SecurityScanResult } from '../../kernel/security/widget-scanner';
import { scanWidgetHtml } from '../../kernel/security/widget-scanner';
import { supabase } from '../../kernel/supabase';

import { inferManifest, injectSdkBootstrap } from './manifest-inferrer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadFileType = 'html' | 'zip' | 'source';

export interface ProcessUploadResult {
  package: WidgetPackageContents;
  scanResult: SecurityScanResult;
}

// ---------------------------------------------------------------------------
// Path 1: Single HTML file
// ---------------------------------------------------------------------------

async function processHtmlUpload(
  file: File,
): Promise<WidgetPackageContents> {
  const html = await file.text();

  // Try extracting manifest from StickerNest.register() call
  const hasRegister = html.includes('StickerNest.register(');
  const hasReady = html.includes('StickerNest.ready()') || html.includes('StickerNest.ready(');

  if (hasRegister) {
    // Use the Lab's manifest extractor pattern:
    // Parse the register call's argument to get the manifest
    const { extractManifestFromHtml } = await import('../../lab/ai/manifest-extractor');
    const manifest = extractManifestFromHtml(html);
    if (manifest) {
      return {
        manifest,
        htmlContent: html,
        manifestGenerated: false,
        manifestConfidence: undefined,
      };
    }
  }

  // No valid register call — infer manifest
  const { manifest, confidence } = inferManifest(html, file.name);
  let finalHtml = html;
  if (!hasRegister || !hasReady) {
    finalHtml = injectSdkBootstrap(html, manifest);
  }

  return {
    manifest,
    htmlContent: finalHtml,
    manifestGenerated: true,
    manifestConfidence: confidence,
  };
}

// ---------------------------------------------------------------------------
// Path 2: ZIP bundle
// ---------------------------------------------------------------------------

async function processZipUpload(
  file: File,
): Promise<WidgetPackageContents> {
  // Dynamically import JSZip (it's a large dep, only load when needed)
  const JSZip = (await import('jszip')).default;
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // Look for manifest.json at root
  let manifest = null;
  const manifestFile = zip.file('manifest.json');
  if (manifestFile) {
    const manifestText = await manifestFile.async('string');
    const parsed = JSON.parse(manifestText);
    const result = WidgetManifestSchema.safeParse(parsed);
    if (result.success) {
      manifest = result.data;
    }
  }

  // Look for index.html
  const htmlFile = zip.file('index.html');
  if (!htmlFile) {
    throw new Error('ZIP bundle must contain an index.html file');
  }
  let htmlContent = await htmlFile.async('string');

  // Look for README
  let readme: string | undefined;
  const readmeFile = zip.file('README.md') ?? zip.file('README') ?? zip.file('readme.md');
  if (readmeFile) {
    readme = await readmeFile.async('string');
  }

  // If no manifest.json found, try extracting from HTML
  if (!manifest) {
    const hasRegister = htmlContent.includes('StickerNest.register(');
    if (hasRegister) {
      const { extractManifestFromHtml } = await import('../../lab/ai/manifest-extractor');
      manifest = extractManifestFromHtml(htmlContent);
    }
  }

  // If still no manifest, infer one
  let manifestGenerated = false;
  let manifestConfidence: number | undefined;
  if (!manifest) {
    const inferred = inferManifest(htmlContent, file.name);
    manifest = inferred.manifest;
    manifestGenerated = true;
    manifestConfidence = inferred.confidence;

    const hasReady = htmlContent.includes('StickerNest.ready()');
    const hasRegister = htmlContent.includes('StickerNest.register(');
    if (!hasRegister || !hasReady) {
      htmlContent = injectSdkBootstrap(htmlContent, manifest);
    }
  }

  return {
    manifest,
    htmlContent,
    readme,
    manifestGenerated,
    manifestConfidence,
  };
}

// ---------------------------------------------------------------------------
// Path 3: Raw source (JS/JSX/TSX/Vue) — bundled via edge function
// ---------------------------------------------------------------------------

async function processSourceUpload(
  file: File,
): Promise<WidgetPackageContents> {
  const source = await file.text();
  const filename = file.name;

  // Detect framework from extension
  let framework: 'react' | 'vue' | 'vanilla' = 'vanilla';
  if (filename.endsWith('.jsx') || filename.endsWith('.tsx')) {
    framework = 'react';
  } else if (filename.endsWith('.vue')) {
    framework = 'vue';
  }

  // Call the widget-bundle edge function
  const { data, error } = await supabase.functions.invoke('widget-bundle', {
    body: { source, filename, framework },
  });

  if (error) {
    throw new Error(`Bundle failed: ${error.message}`);
  }

  if (!data?.success || !data?.html) {
    throw new Error(data?.error ?? 'Bundle failed: no HTML returned');
  }

  const htmlContent = data.html as string;

  // Infer manifest from the bundled output
  const { manifest, confidence } = inferManifest(htmlContent, filename);
  const finalHtml = injectSdkBootstrap(htmlContent, manifest);

  return {
    manifest,
    htmlContent: finalHtml,
    manifestGenerated: true,
    manifestConfidence: confidence,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detects the upload type from a file's name.
 */
export function detectFileType(file: File): UploadFileType {
  const name = file.name.toLowerCase();
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'html';
  if (name.endsWith('.zip') || name.endsWith('.snwidget.zip')) return 'zip';
  return 'source';
}

/**
 * Processes an uploaded widget file through the appropriate path,
 * normalizes to WidgetPackageContents, and runs a security scan.
 *
 * @param file - The uploaded file
 * @returns The processed package and security scan result
 */
export async function processUpload(
  file: File,
): Promise<ProcessUploadResult> {
  const fileType = detectFileType(file);

  let pkg: WidgetPackageContents;
  switch (fileType) {
    case 'html':
      pkg = await processHtmlUpload(file);
      break;
    case 'zip':
      pkg = await processZipUpload(file);
      break;
    case 'source':
      pkg = await processSourceUpload(file);
      break;
  }

  const scanResult = scanWidgetHtml(pkg.htmlContent);

  return { package: pkg, scanResult };
}
