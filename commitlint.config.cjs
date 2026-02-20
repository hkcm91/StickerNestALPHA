module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting
        'refactor', // Code refactoring
        'perf',     // Performance
        'test',     // Tests
        'build',    // Build system
        'ci',       // CI config
        'chore',    // Maintenance
        'revert',   // Revert commit
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'kernel',        // L0
        'social',        // L1
        'lab',           // L2
        'runtime',       // L3
        'canvas-core',   // L4A-1
        'canvas-tools',  // L4A-2
        'canvas-wiring', // L4A-3
        'canvas-panels', // L4A-4
        'spatial',       // L4B
        'marketplace',   // L5
        'shell',         // L6
        'deps',          // Dependencies
        'config',        // Configuration
        'ci',            // CI/CD
      ],
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
  },
};
