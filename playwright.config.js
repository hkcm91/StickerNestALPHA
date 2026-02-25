import { defineConfig, devices } from '@playwright/test';
/**
 * Playwright configuration for StickerNest V5 canvas E2E testing.
 *
 * Uses swiftshader for deterministic GPU-free CI rendering.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './e2e',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use */
    reporter: process.env.CI ? 'github' : 'html',
    /* Shared settings for all projects */
    use: {
        /* Base URL for navigation */
        baseURL: process.env.BASE_URL || 'http://localhost:5173',
        /* Collect trace when retrying the failed test */
        trace: 'on-first-retry',
        /* Screenshot on failure */
        screenshot: 'only-on-failure',
        /* Video on first retry */
        video: 'on-first-retry',
        /* GPU-free rendering for deterministic CI */
        launchOptions: {
            args: ['--use-gl=swiftshader'],
        },
    },
    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
    ],
    /* Timeout for each test */
    timeout: 30_000,
    /* Timeout for each assertion */
    expect: {
        timeout: 5_000,
    },
    /* Run your local dev server before starting the tests */
    // webServer: {
    //   command: 'npm run dev',
    //   url: 'http://localhost:5173',
    //   reuseExistingServer: !process.env.CI,
    // },
});
//# sourceMappingURL=playwright.config.js.map