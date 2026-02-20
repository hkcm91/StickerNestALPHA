/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // =========================================================================
    // LAYER 0: KERNEL — May import from nothing (except externals)
    // =========================================================================
    {
      name: "L0-no-internal-imports",
      comment: "Layer 0 (kernel) must not import from any other layer",
      severity: "error",
      from: { path: "^src/kernel/" },
      to: {
        path: [
          "^src/social/",
          "^src/runtime/",
          "^src/lab/",
          "^src/canvas/",
          "^src/spatial/",
          "^src/marketplace/",
          "^src/shell/",
        ],
      },
    },

    // =========================================================================
    // LAYER 1: SOCIAL — May import from L0 only
    // =========================================================================
    {
      name: "L1-allowed-imports",
      comment: "Layer 1 (social) may only import from L0 (kernel)",
      severity: "error",
      from: { path: "^src/social/" },
      to: {
        path: [
          "^src/runtime/",
          "^src/lab/",
          "^src/canvas/",
          "^src/spatial/",
          "^src/marketplace/",
          "^src/shell/",
        ],
      },
    },

    // =========================================================================
    // LAYER 3: RUNTIME — May import from L0 only
    // =========================================================================
    {
      name: "L3-allowed-imports",
      comment: "Layer 3 (runtime) may only import from L0 (kernel)",
      severity: "error",
      from: { path: "^src/runtime/" },
      to: {
        path: [
          "^src/social/",
          "^src/lab/",
          "^src/canvas/",
          "^src/spatial/",
          "^src/marketplace/",
          "^src/shell/",
        ],
      },
    },

    // =========================================================================
    // LAYER 2: LAB — May import from L0, L1, L3
    // =========================================================================
    {
      name: "L2-allowed-imports",
      comment: "Layer 2 (lab) may only import from L0, L1, L3",
      severity: "error",
      from: { path: "^src/lab/" },
      to: {
        path: [
          "^src/canvas/",
          "^src/spatial/",
          "^src/marketplace/",
          "^src/shell/",
        ],
      },
    },

    // =========================================================================
    // LAYER 4A-1: CANVAS CORE — May import from L0, L3
    // =========================================================================
    {
      name: "L4A1-allowed-imports",
      comment: "Layer 4A-1 (canvas/core) may only import from L0, L3",
      severity: "error",
      from: { path: "^src/canvas/core/" },
      to: {
        path: [
          "^src/social/",
          "^src/lab/",
          "^src/canvas/tools/",
          "^src/canvas/wiring/",
          "^src/canvas/panels/",
          "^src/spatial/",
          "^src/marketplace/",
          "^src/shell/",
        ],
      },
    },

    // =========================================================================
    // LAYER 4A-2: CANVAS TOOLS — May import from L0, L3, L4A-1
    // =========================================================================
    {
      name: "L4A2-allowed-imports",
      comment: "Layer 4A-2 (canvas/tools) may only import from L0, L3, L4A-1",
      severity: "error",
      from: { path: "^src/canvas/tools/" },
      to: {
        path: [
          "^src/social/",
          "^src/lab/",
          "^src/canvas/wiring/",
          "^src/canvas/panels/",
          "^src/spatial/",
          "^src/marketplace/",
          "^src/shell/",
        ],
      },
    },

    // =========================================================================
    // LAYER 4A-3: CANVAS WIRING — May import from L0, L3, L4A-1
    // =========================================================================
    {
      name: "L4A3-allowed-imports",
      comment: "Layer 4A-3 (canvas/wiring) may only import from L0, L3, L4A-1",
      severity: "error",
      from: { path: "^src/canvas/wiring/" },
      to: {
        path: [
          "^src/social/",
          "^src/lab/",
          "^src/canvas/tools/",
          "^src/canvas/panels/",
          "^src/spatial/",
          "^src/marketplace/",
          "^src/shell/",
        ],
      },
    },

    // =========================================================================
    // LAYER 4A-4: CANVAS PANELS — May import from L0, L3, L4A-1
    // =========================================================================
    {
      name: "L4A4-allowed-imports",
      comment: "Layer 4A-4 (canvas/panels) may only import from L0, L3, L4A-1",
      severity: "error",
      from: { path: "^src/canvas/panels/" },
      to: {
        path: [
          "^src/social/",
          "^src/lab/",
          "^src/canvas/tools/",
          "^src/canvas/wiring/",
          "^src/spatial/",
          "^src/marketplace/",
          "^src/shell/",
        ],
      },
    },

    // =========================================================================
    // LAYER 4B: SPATIAL — May import from L0, L3
    // =========================================================================
    {
      name: "L4B-allowed-imports",
      comment: "Layer 4B (spatial) may only import from L0, L3",
      severity: "error",
      from: { path: "^src/spatial/" },
      to: {
        path: [
          "^src/social/",
          "^src/lab/",
          "^src/canvas/",
          "^src/marketplace/",
          "^src/shell/",
        ],
      },
    },

    // =========================================================================
    // LAYER 5: MARKETPLACE — May import from L0, L1, L3, L4A-1
    // =========================================================================
    {
      name: "L5-allowed-imports",
      comment: "Layer 5 (marketplace) may only import from L0, L1, L3, L4A-1",
      severity: "error",
      from: { path: "^src/marketplace/" },
      to: {
        path: [
          "^src/lab/",
          "^src/canvas/tools/",
          "^src/canvas/wiring/",
          "^src/canvas/panels/",
          "^src/spatial/",
          "^src/shell/",
        ],
      },
    },

    // =========================================================================
    // LAYER 6: SHELL — May import from L0, L1, L3, L4A-1, L4B, L5
    // Shell MUST NOT import from L2 (lab), L4A-2/3/4 (canvas sub-layers)
    // =========================================================================
    {
      name: "L6-forbidden-imports",
      comment: "Layer 6 (shell) must not import from lab or canvas sub-layers",
      severity: "error",
      from: { path: "^src/shell/" },
      to: {
        path: [
          "^src/lab/",
          "^src/canvas/tools/",
          "^src/canvas/wiring/",
          "^src/canvas/panels/",
        ],
      },
    },

    // =========================================================================
    // GLOBAL RULES
    // =========================================================================
    {
      name: "no-circular",
      comment: "No circular dependencies allowed anywhere",
      severity: "error",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "no-orphans",
      comment: "No orphan modules (files not imported by any other file)",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          // Allow these orphan patterns
          "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$", // Dotfiles (config files)
          "\\.d\\.ts$", // Type declaration files
          "(^|/)tsconfig\\.json$",
          "(^|/)vite\\.config\\.",
          "(^|/)vitest\\.config\\.",
          "\\.test\\.(ts|tsx)$", // Test files
          "\\.spec\\.(ts|tsx)$", // Spec files
          "^src/index\\.(ts|tsx)$", // Main entry point
          "^src/kernel/schemas/index\\.ts$", // Schema barrel export
        ],
      },
      to: {},
    },
    {
      name: "no-deprecated-core",
      comment: "Do not use deprecated Node.js core modules",
      severity: "warn",
      from: {},
      to: {
        dependencyTypes: ["core"],
        path: [
          "^(punycode|domain|constants|sys|_linklist|_stream_wrap)$",
        ],
      },
    },
    {
      name: "not-to-dev-dep",
      comment: "Production code should not import dev dependencies",
      severity: "error",
      from: {
        path: "^src/",
        pathNot: "\\.test\\.(ts|tsx)$|\\.spec\\.(ts|tsx)$",
      },
      to: {
        dependencyTypes: ["npm-dev"],
      },
    },
    {
      name: "no-duplicate-dep-types",
      comment: "Don't have both a dependency and devDependency on the same module",
      severity: "warn",
      from: {},
      to: {
        moreThanOneDependencyType: true,
        dependencyTypesNot: ["type-only"],
      },
    },
  ],

  options: {
    // Base directory for the analysis
    doNotFollow: {
      path: "node_modules",
      dependencyTypes: [
        "npm",
        "npm-dev",
        "npm-optional",
        "npm-peer",
        "npm-bundled",
        "npm-no-pkg",
      ],
    },

    // Include only these file extensions
    includeOnly: {
      path: "^src/",
    },

    // TypeScript configuration
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },

    // Enhanced resolver for TypeScript path aliases
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      mainFields: ["main", "types", "typings"],
      extensions: [".ts", ".tsx", ".d.ts", ".js", ".jsx", ".json"],
    },

    // Report metrics
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/(@[^/]+/[^/]+|[^/]+)",
        theme: {
          graph: {
            splines: "ortho",
            rankdir: "TB",
            ranksep: "1",
          },
          modules: [
            {
              criteria: { matchesHighlight: true },
              attributes: { fillcolor: "lime", fontcolor: "black" },
            },
            {
              criteria: { source: "^src/kernel/" },
              attributes: { fillcolor: "#ffcccc", fontcolor: "black" },
            },
            {
              criteria: { source: "^src/social/" },
              attributes: { fillcolor: "#ccffcc", fontcolor: "black" },
            },
            {
              criteria: { source: "^src/runtime/" },
              attributes: { fillcolor: "#ccccff", fontcolor: "black" },
            },
            {
              criteria: { source: "^src/lab/" },
              attributes: { fillcolor: "#ffffcc", fontcolor: "black" },
            },
            {
              criteria: { source: "^src/canvas/core/" },
              attributes: { fillcolor: "#ffccff", fontcolor: "black" },
            },
            {
              criteria: { source: "^src/canvas/tools/" },
              attributes: { fillcolor: "#ccffff", fontcolor: "black" },
            },
            {
              criteria: { source: "^src/canvas/wiring/" },
              attributes: { fillcolor: "#ffddcc", fontcolor: "black" },
            },
            {
              criteria: { source: "^src/canvas/panels/" },
              attributes: { fillcolor: "#ddccff", fontcolor: "black" },
            },
            {
              criteria: { source: "^src/spatial/" },
              attributes: { fillcolor: "#ccddff", fontcolor: "black" },
            },
            {
              criteria: { source: "^src/marketplace/" },
              attributes: { fillcolor: "#ddffcc", fontcolor: "black" },
            },
            {
              criteria: { source: "^src/shell/" },
              attributes: { fillcolor: "#ffccdd", fontcolor: "black" },
            },
          ],
          dependencies: [
            {
              criteria: { "rules[0].severity": "error" },
              attributes: { color: "red", fontcolor: "red" },
            },
            {
              criteria: { "rules[0].severity": "warn" },
              attributes: { color: "orange", fontcolor: "orange" },
            },
            {
              criteria: { circular: true },
              attributes: { color: "red", style: "bold" },
            },
          ],
        },
      },
      archi: {
        collapsePattern: "^src/([^/]+(?:/[^/]+)?)",
        theme: {
          graph: {
            splines: "ortho",
            rankdir: "TB",
          },
        },
      },
      text: {
        highlightFocused: true,
      },
    },

    // Progress reporting
    progress: { type: "performance-log" },

    // Cache for faster subsequent runs
    cache: {
      folder: "node_modules/.cache/dependency-cruiser",
      strategy: "content",
    },
  },
};
