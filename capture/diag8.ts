// Quick TypeScript test of context.route in tsx
import { chromium } from 'playwright';

const SUPABASE_REF = 'lmewtcluzfzqlzwqunst';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

  let count = 0;
  await context.route('**', async (route) => {
    count++;
    const url = route.request().url();
    if (url.includes('supabase') || count <= 3) {
      console.log(`[route #${count}] ${url.slice(0, 80)}`);
    }
    if (url.includes(SUPABASE_REF + '.supabase.co')) {
      console.log('  → Supabase!');
      try {
        const response = await route.fetch();
        await route.fulfill({ response });
      } catch {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
    } else {
      await route.continue();
    }
  });

  await context.addInitScript(() => {
    console.log('[initScript] running');
  });

  const page = await context.newPage();
  page.on('console', msg => console.log(`[browser:${msg.type()}] ${msg.text().slice(0, 80)}`));
  
  console.log('Navigating...');
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });
  console.log('After goto:', page.url());
  await page.waitForTimeout(3000);
  console.log('After 3s:', page.url());
  console.log('Total route calls:', count);

  await browser.close();
}

main().catch(console.error);
