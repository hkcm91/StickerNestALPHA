import { readFileSync } from 'fs';
import { CaptureScriptSchema } from './src/types.js';

const scripts = ['scripts/canvas-editing-demo.json', 'scripts/widget-system-demo.json', 'scripts/platform-overview-demo.json'];
for (const s of scripts) {
  try {
    const data = JSON.parse(readFileSync(s, 'utf-8'));
    CaptureScriptSchema.parse(data);
    console.log('✅', s);
  } catch (e: any) {
    console.log('❌', s);
    if (e.issues) {
      for (const issue of e.issues.slice(0, 5)) {
        console.log('  ', issue.path?.join('.'), ':', issue.message);
      }
    } else {
      console.log('  ', e.message?.slice(0, 200));
    }
  }
}
