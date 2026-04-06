// vitest.config.ts
import { defineConfig } from "file:///sessions/upbeat-sweet-fermi/mnt/StickerNest5.0/node_modules/vitest/dist/config.js";
import path from "path";
var __vite_injected_original_dirname = "/sessions/upbeat-sweet-fermi/mnt/StickerNest5.0";
var vitest_config_default = defineConfig({
  test: {
    // Test file patterns
    include: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    // Exclude patterns (e2e tests run separately with Playwright)
    exclude: ["node_modules", "dist", "**/*.d.ts", "e2e/**", ".claude/worktrees/**"],
    // Coverage configuration
    coverage: {
      // Use v8 coverage provider
      provider: "v8",
      // Coverage reporters
      reporter: ["text", "json", "html"],
      // Coverage thresholds (80% across the board per CLAUDE.md)
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      },
      // Exclude from coverage
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/index.ts",
        // Re-exports only
        "vitest.config.ts"
      ],
      // Include only src directory
      include: ["src/**/*.ts"]
    },
    // Global test timeout
    testTimeout: 1e4,
    // Enable globals for describe, it, expect
    globals: true,
    // TypeScript support via native ESM
    environment: "node",
    // Browser environment tests use happy-dom (better ESM compatibility than jsdom)
    environmentMatchGlobs: [
      ["src/runtime/**/*.test.{ts,tsx}", "happy-dom"],
      ["src/shell/**/*.test.{ts,tsx}", "happy-dom"],
      ["src/spatial/**/*.test.{ts,tsx}", "happy-dom"],
      ["src/social/**/*.test.{ts,tsx}", "happy-dom"]
    ]
  },
  resolve: {
    alias: {
      // @sn/types path alias to match tsconfig.json
      "@sn/types": path.resolve(__vite_injected_original_dirname, "./src/kernel/schemas/index.ts")
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9zZXNzaW9ucy91cGJlYXQtc3dlZXQtZmVybWkvbW50L1N0aWNrZXJOZXN0NS4wXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvc2Vzc2lvbnMvdXBiZWF0LXN3ZWV0LWZlcm1pL21udC9TdGlja2VyTmVzdDUuMC92aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9zZXNzaW9ucy91cGJlYXQtc3dlZXQtZmVybWkvbW50L1N0aWNrZXJOZXN0NS4wL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICB0ZXN0OiB7XG4gICAgLy8gVGVzdCBmaWxlIHBhdHRlcm5zXG4gICAgaW5jbHVkZTogWycqKi8qLnRlc3QudHMnLCAnKiovKi50ZXN0LnRzeCcsICcqKi8qLnNwZWMudHMnLCAnKiovKi5zcGVjLnRzeCddLFxuXG4gICAgLy8gRXhjbHVkZSBwYXR0ZXJucyAoZTJlIHRlc3RzIHJ1biBzZXBhcmF0ZWx5IHdpdGggUGxheXdyaWdodClcbiAgICBleGNsdWRlOiBbJ25vZGVfbW9kdWxlcycsICdkaXN0JywgJyoqLyouZC50cycsICdlMmUvKionLCAnLmNsYXVkZS93b3JrdHJlZXMvKionXSxcblxuICAgIC8vIENvdmVyYWdlIGNvbmZpZ3VyYXRpb25cbiAgICBjb3ZlcmFnZToge1xuICAgICAgLy8gVXNlIHY4IGNvdmVyYWdlIHByb3ZpZGVyXG4gICAgICBwcm92aWRlcjogJ3Y4JyxcblxuICAgICAgLy8gQ292ZXJhZ2UgcmVwb3J0ZXJzXG4gICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2pzb24nLCAnaHRtbCddLFxuXG4gICAgICAvLyBDb3ZlcmFnZSB0aHJlc2hvbGRzICg4MCUgYWNyb3NzIHRoZSBib2FyZCBwZXIgQ0xBVURFLm1kKVxuICAgICAgdGhyZXNob2xkczoge1xuICAgICAgICBicmFuY2hlczogODAsXG4gICAgICAgIGZ1bmN0aW9uczogODAsXG4gICAgICAgIGxpbmVzOiA4MCxcbiAgICAgICAgc3RhdGVtZW50czogODAsXG4gICAgICB9LFxuXG4gICAgICAvLyBFeGNsdWRlIGZyb20gY292ZXJhZ2VcbiAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgJ25vZGVfbW9kdWxlcy8qKicsXG4gICAgICAgICdkaXN0LyoqJyxcbiAgICAgICAgJyoqLyouZC50cycsXG4gICAgICAgICcqKi8qLnRlc3QudHMnLFxuICAgICAgICAnKiovKi5zcGVjLnRzJyxcbiAgICAgICAgJyoqL2luZGV4LnRzJywgLy8gUmUtZXhwb3J0cyBvbmx5XG4gICAgICAgICd2aXRlc3QuY29uZmlnLnRzJyxcbiAgICAgIF0sXG5cbiAgICAgIC8vIEluY2x1ZGUgb25seSBzcmMgZGlyZWN0b3J5XG4gICAgICBpbmNsdWRlOiBbJ3NyYy8qKi8qLnRzJ10sXG4gICAgfSxcblxuICAgIC8vIEdsb2JhbCB0ZXN0IHRpbWVvdXRcbiAgICB0ZXN0VGltZW91dDogMTAwMDAsXG5cbiAgICAvLyBFbmFibGUgZ2xvYmFscyBmb3IgZGVzY3JpYmUsIGl0LCBleHBlY3RcbiAgICBnbG9iYWxzOiB0cnVlLFxuXG4gICAgLy8gVHlwZVNjcmlwdCBzdXBwb3J0IHZpYSBuYXRpdmUgRVNNXG4gICAgZW52aXJvbm1lbnQ6ICdub2RlJyxcblxuICAgIC8vIEJyb3dzZXIgZW52aXJvbm1lbnQgdGVzdHMgdXNlIGhhcHB5LWRvbSAoYmV0dGVyIEVTTSBjb21wYXRpYmlsaXR5IHRoYW4ganNkb20pXG4gICAgZW52aXJvbm1lbnRNYXRjaEdsb2JzOiBbXG4gICAgICBbJ3NyYy9ydW50aW1lLyoqLyoudGVzdC57dHMsdHN4fScsICdoYXBweS1kb20nXSxcbiAgICAgIFsnc3JjL3NoZWxsLyoqLyoudGVzdC57dHMsdHN4fScsICdoYXBweS1kb20nXSxcbiAgICAgIFsnc3JjL3NwYXRpYWwvKiovKi50ZXN0Lnt0cyx0c3h9JywgJ2hhcHB5LWRvbSddLFxuICAgICAgWydzcmMvc29jaWFsLyoqLyoudGVzdC57dHMsdHN4fScsICdoYXBweS1kb20nXSxcbiAgICBdLFxuICB9LFxuXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgLy8gQHNuL3R5cGVzIHBhdGggYWxpYXMgdG8gbWF0Y2ggdHNjb25maWcuanNvblxuICAgICAgJ0Bzbi90eXBlcyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9rZXJuZWwvc2NoZW1hcy9pbmRleC50cycpLFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVUsU0FBUyxvQkFBb0I7QUFDaFcsT0FBTyxVQUFVO0FBRGpCLElBQU0sbUNBQW1DO0FBR3pDLElBQU8sd0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQTtBQUFBLElBRUosU0FBUyxDQUFDLGdCQUFnQixpQkFBaUIsZ0JBQWdCLGVBQWU7QUFBQTtBQUFBLElBRzFFLFNBQVMsQ0FBQyxnQkFBZ0IsUUFBUSxhQUFhLFVBQVUsc0JBQXNCO0FBQUE7QUFBQSxJQUcvRSxVQUFVO0FBQUE7QUFBQSxNQUVSLFVBQVU7QUFBQTtBQUFBLE1BR1YsVUFBVSxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUE7QUFBQSxNQUdqQyxZQUFZO0FBQUEsUUFDVixVQUFVO0FBQUEsUUFDVixXQUFXO0FBQUEsUUFDWCxPQUFPO0FBQUEsUUFDUCxZQUFZO0FBQUEsTUFDZDtBQUFBO0FBQUEsTUFHQSxTQUFTO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUE7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBO0FBQUEsTUFHQSxTQUFTLENBQUMsYUFBYTtBQUFBLElBQ3pCO0FBQUE7QUFBQSxJQUdBLGFBQWE7QUFBQTtBQUFBLElBR2IsU0FBUztBQUFBO0FBQUEsSUFHVCxhQUFhO0FBQUE7QUFBQSxJQUdiLHVCQUF1QjtBQUFBLE1BQ3JCLENBQUMsa0NBQWtDLFdBQVc7QUFBQSxNQUM5QyxDQUFDLGdDQUFnQyxXQUFXO0FBQUEsTUFDNUMsQ0FBQyxrQ0FBa0MsV0FBVztBQUFBLE1BQzlDLENBQUMsaUNBQWlDLFdBQVc7QUFBQSxJQUMvQztBQUFBLEVBQ0Y7QUFBQSxFQUVBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQTtBQUFBLE1BRUwsYUFBYSxLQUFLLFFBQVEsa0NBQVcsK0JBQStCO0FBQUEsSUFDdEU7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
