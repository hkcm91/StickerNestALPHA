import { chromium } from 'playwright';

const SUPABASE_REF = 'lmewtcluzfzqlzwqunst';

const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader'] });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
});

let routeCount = 0;

// Catch-all route handler - log EVERYTHING
await context.route('**', async (route) => {
  const url = route.request().url();
  routeCount++;
  if (url.includes('supabase') || url.includes('localhost')) {
    console.log(`[route #${routeCount}] ${route.request().method()} ${url.slice(0, 100)}`);
  }
  if (url.includes(SUPABASE_REF)) {
    if (url.includes('/auth/v1/user')) {
      console.log(`  → STUBBING auth/user`);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        id: 'a0000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
        email: 'woahitskimber@gmail.com', email_confirmed_at: '2025-01-01T00:00:00Z',
      }) });
      return;
    }
    if (url.includes('/rest/v1/users')) {
      console.log(`  → STUBBING rest/users`);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'a0000000-0000-4000-8000-000000000001', tier: 'creator', email: 'woahitskimber@gmail.com' }
      ]) });
      return;
    }
    // All other Supabase: pass through with async fetch to add latency
    try {
      const response = await route.fetch();
      await route.fulfill({ response });
    } catch {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return;
  }
  await route.continue();
});

// Inject localStorage session
await context.addInitScript(() => {
  const SUPABASE_REF = 'lmewtcluzfzqlzwqunst';
  const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 365;
  const userId = 'a0000000-0000-4000-8000-000000000001';
  const b = (s) => btoa(s).replace(/=+$/, '');
  const makeJwt = (payload) => `${b(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b(JSON.stringify(payload))}.dev_sig`;
  const session = {
    access_token: makeJwt({ aud: 'authenticated', exp: expiresAt, iat: Math.floor(Date.now() / 1000), sub: userId, email: 'woahitskimber@gmail.com', role: 'authenticated' }),
    token_type: 'bearer', expires_in: 86400 * 365, expires_at: expiresAt,
    refresh_token: 'dev_refresh',
    user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'woahitskimber@gmail.com', email_confirmed_at: '2025-01-01T00:00:00Z' },
  };
  localStorage.setItem(`sb-${SUPABASE_REF}-auth-token`, JSON.stringify(session));
  console.log('[initScript] session injected into localStorage');
});

const page = await context.newPage();

// Listen for console messages
page.on('console', msg => {
  if (msg.type() !== 'warning') {
    const text = msg.text();
    if (text.includes('initScript') || text.includes('supabase') || text.includes('auth') || text.includes('sign')) {
      console.log(`[console.${msg.type()}] ${text.slice(0, 120)}`);
    }
  }
});

console.log('Navigating to localhost:5173...');
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
console.log(`After goto: ${page.url()}`);
await page.waitForTimeout(3000);
console.log(`After 3s wait: ${page.url()}`);
await page.waitForTimeout(2000);
console.log(`After 5s wait: ${page.url()}`);

await browser.close();
