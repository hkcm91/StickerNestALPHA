import { CaptureScriptSchema } from './src/types.js';
import * as fs from 'fs';

const scripts = ['canvas-editing-demo', 'widget-system-demo', 'platform-overview-demo'];
for (const f of scripts) {
  try {
    const data = JSON.parse(fs.readFileSync(`scripts/${f}.json`, 'utf-8'));
    const script = CaptureScriptSchema.parse(data);
    console.log(`✓ ${f} — ${script.steps.length} steps, audience: ${script.audience}`);
  } catch(e: any) {
    console.log(`✗ ${f} — ${e.message?.slice(0, 200)}`);
  }
}
