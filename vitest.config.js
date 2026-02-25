import { defineConfig } from 'vitest/config';
import path from 'path';
export default defineConfig({
    test: {
        // Test file patterns
        include: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
        // Exclude patterns (e2e tests run separately with Playwright)
        exclude: ['node_modules', 'dist', '**/*.d.ts', 'e2e/**'],
        // Coverage configuration
        coverage: {
            // Use v8 coverage provider
            provider: 'v8',
            // Coverage reporters
            reporter: ['text', 'json', 'html'],
            // Coverage thresholds (80% across the board per CLAUDE.md)
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
            },
            // Exclude from coverage
            exclude: [
                'node_modules/**',
                'dist/**',
                '**/*.d.ts',
                '**/*.test.ts',
                '**/*.spec.ts',
                '**/index.ts', // Re-exports only
                'vitest.config.ts',
            ],
            // Include only src directory
            include: ['src/**/*.ts'],
        },
        // Global test timeout
        testTimeout: 10000,
        // Enable globals for describe, it, expect
        globals: true,
        // TypeScript support via native ESM
        environment: 'node',
        // Browser environment tests use happy-dom (better ESM compatibility than jsdom)
        environmentMatchGlobs: [
            ['src/runtime/**/*.test.{ts,tsx}', 'happy-dom'],
            ['src/shell/**/*.test.{ts,tsx}', 'happy-dom'],
            ['src/spatial/**/*.test.{ts,tsx}', 'happy-dom'],
            ['src/social/**/*.test.{ts,tsx}', 'happy-dom'],
        ],
    },
    resolve: {
        alias: {
            // @sn/types path alias to match tsconfig.json
            '@sn/types': path.resolve(__dirname, './src/kernel/schemas/index.ts'),
        },
    },
});
//# sourceMappingURL=vitest.config.js.map