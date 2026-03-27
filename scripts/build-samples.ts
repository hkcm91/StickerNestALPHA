/**
 * Build Sample Widget Packages
 *
 * Reads sample widget source directories under samples/ and creates
 * .snwidget.zip files in public/samples/ for download.
 *
 * Usage: npx tsx scripts/build-samples.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { zipSync } from 'fflate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLES_DIR = path.resolve(__dirname, '..', 'samples');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'samples');

function buildSample(sampleDir: string): void {
  const sampleName = path.basename(sampleDir);
  const files: Record<string, Uint8Array> = {};

  // Recursively collect all files
  function collectFiles(dir: string, prefix: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        collectFiles(fullPath, relativePath);
      } else {
        files[relativePath] = new Uint8Array(fs.readFileSync(fullPath));
      }
    }
  }

  collectFiles(sampleDir, '');

  if (!files['manifest.json']) {
    console.warn(`  Skipping ${sampleName}: no manifest.json found`);
    return;
  }

  if (!files['index.html']) {
    console.warn(`  Skipping ${sampleName}: no index.html found`);
    return;
  }

  const zipData = zipSync(files);
  const outputPath = path.join(OUTPUT_DIR, `${sampleName}.snwidget.zip`);
  fs.writeFileSync(outputPath, zipData);

  const sizeKB = (zipData.length / 1024).toFixed(1);
  console.log(`  Built ${sampleName}.snwidget.zip (${sizeKB} KB)`);
}

function main(): void {
  console.log('Building sample widget packages...\n');

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!fs.existsSync(SAMPLES_DIR)) {
    console.log('No samples/ directory found. Nothing to build.');
    return;
  }

  const samples = fs.readdirSync(SAMPLES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  if (samples.length === 0) {
    console.log('No sample directories found in samples/');
    return;
  }

  for (const sample of samples) {
    buildSample(path.join(SAMPLES_DIR, sample.name));
  }

  console.log(`\nDone! ${samples.length} packages built to public/samples/`);
}

main();
