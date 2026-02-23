/**
 * StickerNest V5 ESLint Configuration
 * Agent #3: Layer Boundary Enforcer
 *
 * Enforces the 7-layer architecture with downward-only imports.
 * Cross-layer communication must go through the event bus or @sn/types.
 */
module.exports = {
  root: true,
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    '.storybook/',
    '*.config.ts',
    '*.config.js',
    '*.config.cjs',
    'plop/',
    'mcp-dev/**',
    'supabase/functions/**',
  ],
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'boundaries',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
    'boundaries/elements': [
      // L0: Kernel — imports from nothing
      {
        type: 'kernel',
        pattern: 'src/kernel/**',
        mode: 'folder',
      },
      // L1: Social — imports from L0
      {
        type: 'social',
        pattern: 'src/social/**',
        mode: 'folder',
      },
      // L2: Lab — imports from L0, L1, L3
      {
        type: 'lab',
        pattern: 'src/lab/**',
        mode: 'folder',
      },
      // L3: Runtime — imports from L0
      {
        type: 'runtime',
        pattern: 'src/runtime/**',
        mode: 'folder',
      },
      // L4A-1: Canvas Core — imports from L0, L3
      {
        type: 'canvas-core',
        pattern: 'src/canvas/core/**',
        mode: 'folder',
      },
      // L4A-2: Canvas Tools — imports from L0, L3, L4A-1
      {
        type: 'canvas-tools',
        pattern: 'src/canvas/tools/**',
        mode: 'folder',
      },
      // L4A-3: Canvas Wiring — imports from L0, L3, L4A-1
      {
        type: 'canvas-wiring',
        pattern: 'src/canvas/wiring/**',
        mode: 'folder',
      },
      // L4A-4: Canvas Panels — imports from L0, L3, L4A-1
      {
        type: 'canvas-panels',
        pattern: 'src/canvas/panels/**',
        mode: 'folder',
      },
      // L4B: Spatial — imports from L0, L3
      {
        type: 'spatial',
        pattern: 'src/spatial/**',
        mode: 'folder',
      },
      // L5: Marketplace — imports from L0, L1, L3, L4A-1
      {
        type: 'marketplace',
        pattern: 'src/marketplace/**',
        mode: 'folder',
      },
      // L6: Shell — imports from L0, L1, L3, L4A-1, L4B, L5
      {
        type: 'shell',
        pattern: 'src/shell/**',
        mode: 'folder',
      },
    ],
    'boundaries/ignore': [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/test/**',
      '**/tests/**',
      '**/__tests__/**',
    ],
  },
  rules: {
    // =========================================================================
    // Import Rules
    // =========================================================================
    'import/no-cycle': 'error',
    'import/no-unresolved': 'error',
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],

    // =========================================================================
    // Layer Boundary Rules — Default: DISALLOW
    // All cross-layer imports are forbidden unless explicitly allowed below.
    // =========================================================================
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          // L0: Kernel — may only import from itself
          {
            from: 'kernel',
            allow: ['kernel'],
          },

          // L1: Social — may import from L0
          {
            from: 'social',
            allow: ['kernel', 'social'],
          },

          // L3: Runtime — may import from L0
          {
            from: 'runtime',
            allow: ['kernel', 'runtime'],
          },

          // L2: Lab — may import from L0, L1, L3
          {
            from: 'lab',
            allow: ['kernel', 'social', 'runtime', 'lab'],
          },

          // L4A-1: Canvas Core — may import from L0, L3
          {
            from: 'canvas-core',
            allow: ['kernel', 'runtime', 'canvas-core'],
          },

          // L4A-2: Canvas Tools — may import from L0, L3, L4A-1
          {
            from: 'canvas-tools',
            allow: ['kernel', 'runtime', 'canvas-core', 'canvas-tools'],
          },

          // L4A-3: Canvas Wiring — may import from L0, L3, L4A-1
          {
            from: 'canvas-wiring',
            allow: ['kernel', 'runtime', 'canvas-core', 'canvas-wiring'],
          },

          // L4A-4: Canvas Panels — may import from L0, L3, L4A-1
          {
            from: 'canvas-panels',
            allow: ['kernel', 'runtime', 'canvas-core', 'canvas-panels'],
          },

          // L4B: Spatial — may import from L0, L3
          {
            from: 'spatial',
            allow: ['kernel', 'runtime', 'spatial'],
          },

          // L5: Marketplace — may import from L0, L1, L3, L4A-1
          {
            from: 'marketplace',
            allow: ['kernel', 'social', 'runtime', 'canvas-core', 'marketplace'],
          },

          // L6: Shell — may import from L0, L1, L3, L4A-1, L4B, L5
          {
            from: 'shell',
            allow: [
              'kernel',
              'social',
              'runtime',
              'canvas-core',
              'spatial',
              'marketplace',
              'shell',
            ],
          },
        ],
      },
    ],

    // =========================================================================
    // TypeScript Rules
    // =========================================================================
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { prefer: 'type-imports' },
    ],
  },
  overrides: [
    // Test files can import from any layer for mocking purposes
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**', '**/__tests__/**'],
      rules: {
        'boundaries/element-types': 'off',
      },
    },
  ],
};
