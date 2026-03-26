/**
 * Debug script to trace the upgrade flow using Playwright
 * Run: npx tsx scripts/debug-upgrade.ts
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

// You'll need to set these or the script will prompt
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

async function debugUpgrade() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable request/response logging
  page.on('request', (request) => {
    if (request.url().includes('functions/v1')) {
      console.log('\n→ REQUEST:', request.method(), request.url());
      if (request.postData()) {
        console.log('  Body:', request.postData());
      }
    }
  });

  page.on('response', async (response) => {
    if (response.url().includes('functions/v1')) {
      console.log('\n← RESPONSE:', response.status(), response.url());
      try {
        const body = await response.text();
        console.log('  Body:', body);
      } catch {
        console.log('  (could not read body)');
      }
    }
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('React DevTools')) {
      console.log('CONSOLE ERROR:', text);
    }
  });

  try {
    console.log('\n=== Step 1: Navigate to login ===');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1000);

    // Check if we need credentials
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      console.log('\n⚠️  No credentials provided!');
      console.log('Set environment variables or log in manually:');
      console.log('  TEST_EMAIL=your@email.com TEST_PASSWORD=yourpass npx tsx scripts/debug-upgrade.ts');
      console.log('\nWaiting for manual login (60 seconds)...');
      console.log('Please log in to the app in the browser window.');

      // Wait for user to log in manually
      await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 60000 });
      console.log('Login detected! Continuing...');
    } else {
      // Auto login
      console.log('Logging in with provided credentials...');
      await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
      await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
      console.log('Logged in!');
    }

    await page.waitForTimeout(2000);
    console.log('Current URL after login:', page.url());

    // Navigate to pricing page
    console.log('\n=== Step 2: Navigate to pricing ===');
    await page.goto(`${BASE_URL}/pricing`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'debug-2-pricing.png' });

    // Check current tier first
    const bodyText = await page.textContent('body');
    console.log('\nLooking for current tier indicators...');
    if (bodyText?.toLowerCase().includes('current plan')) {
      console.log('Found "current plan" text');
    }

    // Find all buttons
    const buttons = await page.locator('button').allTextContents();
    console.log('Buttons found:', buttons.filter(b => b.trim()));

    // Find and click a tier upgrade button
    console.log('\n=== Step 3: Click upgrade button ===');

    // Look for Creator tier button specifically
    const creatorButton = page.locator('button:has-text("Creator"), button:has-text("Start Creating")').first();

    if (await creatorButton.isVisible()) {
      console.log('Found Creator button, clicking...');

      // Click and wait for response
      const responsePromise = page.waitForResponse(
        resp => resp.url().includes('stripe-checkout'),
        { timeout: 15000 }
      );

      await creatorButton.click();

      try {
        const response = await responsePromise;
        console.log('\n=== Edge Function Response ===');
        console.log('Status:', response.status());
        const json = await response.json();
        console.log('Response JSON:', JSON.stringify(json, null, 2));

        if (json.url) {
          console.log('\n✅ Got redirect URL:', json.url);
        }
        if (json.error) {
          console.log('\n❌ Got error:', json.error);
        }
        if (json.free) {
          console.log('\n✅ Free tier granted!');
        }
      } catch (err) {
        console.log('Failed to get response:', err);
      }

      await page.waitForTimeout(3000);
      console.log('\nCurrent URL after click:', page.url());
      await page.screenshot({ path: 'debug-3-after-upgrade.png' });
    } else {
      console.log('Creator button not found. Available buttons:', buttons);
    }

    // Check settings page for tier
    console.log('\n=== Step 4: Check settings for tier ===');
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'debug-4-settings.png' });

    const settingsText = await page.textContent('body');
    console.log('\nSearching for tier indicators on settings page...');

    const tierMatches = settingsText?.match(/tier[:\s]*(\w+)/gi);
    if (tierMatches) {
      console.log('Tier mentions found:', tierMatches);
    }

    // Look for specific tier badges/labels
    const tierLabels = ['free', 'creator', 'pro', 'enterprise'];
    for (const tier of tierLabels) {
      const regex = new RegExp(`\\b${tier}\\b`, 'gi');
      const matches = settingsText?.match(regex);
      if (matches && matches.length > 0) {
        console.log(`Found "${tier}": ${matches.length} times`);
      }
    }

    console.log('\n=== Debug complete ===');
    console.log('Screenshots saved: debug-2-pricing.png, debug-3-after-upgrade.png, debug-4-settings.png');

    // Keep browser open for inspection
    console.log('\nBrowser will stay open for 60 seconds for manual inspection...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'debug-error.png' });
  } finally {
    await browser.close();
  }
}

debugUpgrade().catch(console.error);
