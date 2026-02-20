import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['**/*.test.ts', '**/*.spec.ts'],

    // Exclude patterns
    exclude: ['node_modules', 'dist', '**/*.d.ts'],

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
  },

  resolve: {
    alias: {
      // @sn/types path alias to match tsconfig.json
      '@sn/types': path.resolve(__dirname, './src/kernel/schemas/index.ts'),
    },
  },
});
