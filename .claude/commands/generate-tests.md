# Generate Tests

Generate layer-appropriate test boilerplate for a source file.

## Usage

```
/generate-tests <file-path>
```

## Instructions

When invoked, this command will:

1. **Read the source file** at the specified path
2. **Determine the layer** from the file path:
   - `src/kernel/**` → Layer 0 (Kernel)
   - `src/social/**` → Layer 1 (Social)
   - `src/lab/**` → Layer 2 (Lab)
   - `src/runtime/**` → Layer 3 (Runtime)
   - `src/canvas/core/**` → Layer 4A-1 (Canvas Core)
   - `src/canvas/tools/**` → Layer 4A-2 (Canvas Tools)
   - `src/canvas/wiring/**` → Layer 4A-3 (Canvas Wiring)
   - `src/canvas/panels/**` → Layer 4A-4 (Canvas Panels)
   - `src/spatial/**` → Layer 4B (Spatial/VR)
   - `src/marketplace/**` → Layer 5 (Marketplace)
   - `src/shell/**` → Layer 6 (Shell)

3. **Generate test file** with layer-appropriate setup:
   - Co-located as `*.test.ts` next to the source file
   - Import vitest: `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`
   - For L0 kernel: Include event bus mocking, store isolation tests
   - For L3 runtime: Include iframe/sandbox mocking, bridge protocol tests
   - For L4A canvas: Include `vitest-canvas-mock` setup, spatial index tests
   - For L4B spatial: Include Three.js scene mocking, WebXR session tests

4. **Generate test cases** based on exports:
   - One `describe` block per exported function/class
   - Stub `it` blocks for happy path, edge cases, error handling
   - Include coverage annotations for 80% threshold target

## Template Structure

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Layer-specific imports based on detected layer

describe('ModuleName', () => {
  beforeEach(() => {
    // Setup mocks
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('functionName', () => {
    it('should handle happy path', () => {
      // TODO: Implement test
      expect(true).toBe(true);
    });

    it('should handle edge case', () => {
      // TODO: Implement test
    });

    it('should handle error case', () => {
      // TODO: Implement test
    });
  });
});
```

## Layer-Specific Additions

### Layer 0 (Kernel)
- Include `vi.useFakeTimers()` for event bus timing tests
- Mock Supabase client
- Include `bench()` API usage for throughput tests

### Layer 3 (Runtime)
- Mock `postMessage` and `MessageEvent`
- Include origin validation test stubs
- Mock iframe contentWindow

### Layer 4A (Canvas)
- Import `vitest-canvas-mock`
- Include coordinate transform test helpers
- Mock requestAnimationFrame

### Layer 4B (Spatial)
- Mock Three.js scene/renderer
- Mock WebXR session
- Include SpatialContext assertion helpers
