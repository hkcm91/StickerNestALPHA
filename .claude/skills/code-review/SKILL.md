---
name: code-review
description: Review code changes for bugs, security issues, performance, style, and StickerNest architecture compliance
arguments:
  - name: target
    description: File path, directory, or git ref (e.g., HEAD~3, branch-name, specific file)
    required: false
    default: staged
  - name: focus
    description: Review focus area (all, security, performance, architecture, style)
    required: false
    default: all
---

# StickerNest Code Review

A comprehensive code review skill tailored for StickerNest V5's layered architecture.

## Usage

```
/code-review                          # Review staged changes
/code-review HEAD~3                   # Review last 3 commits
/code-review src/kernel/bus/          # Review specific directory
/code-review feature-branch           # Review branch diff against main
/code-review src/runtime/sdk.ts security  # Security-focused review
```

## Review Workflow

### Phase 1: Gather Context

1. **Determine the changeset**:
   - If `target` is `staged` → `git diff --cached`
   - If `target` is a git ref → `git diff main...<target>`
   - If `target` is a file/directory → read those files directly
   - If `target` looks like a branch → `git diff main...<target>`

2. **Read the actual code** — never review blind diffs without full context.

3. **Identify affected layers** from file paths:
   | Path Pattern | Layer |
   |--------------|-------|
   | `src/kernel/**` | L0: Kernel |
   | `src/social/**` | L1: Social |
   | `src/lab/**` | L2: Lab |
   | `src/runtime/**` | L3: Runtime |
   | `src/canvas/core/**` | L4A-1: Canvas Core |
   | `src/canvas/tools/**` | L4A-2: Canvas Tools |
   | `src/canvas/wiring/**` | L4A-3: Canvas Wiring |
   | `src/canvas/panels/**` | L4A-4: Canvas Panels |
   | `src/spatial/**` | L4B: Spatial/VR |
   | `src/marketplace/**` | L5: Marketplace |
   | `src/shell/**` | L6: Shell |

4. **Load layer rules** for each affected layer:
   - Read `.claude/rules/L{n}-{name}.md` for context
   - These define allowed imports, responsibilities, and constraints

### Phase 2: Perform Review

Review the code against all applicable categories (see Review Categories below).

For each file, check:
1. **Architecture compliance** — layer boundaries, import rules, store isolation
2. **Security** — XSS, injection, origin validation, credential handling
3. **Performance** — algorithm complexity, memory leaks, render efficiency
4. **Code quality** — naming, structure, error handling, test coverage
5. **StickerNest patterns** — event bus usage, schema imports, terminology

### Phase 3: Structure Findings

Organize findings into a clear, structured review. For each issue:
- **File and line number** (e.g., `src/kernel/bus/index.ts:42`)
- **Severity**: `critical`, `warning`, or `nit`
- **Category**: which review area it falls under
- **Description**: clear explanation of the issue
- **Suggestion**: concrete fix or improvement

Present findings grouped by severity: **critical issues first**, then warnings, then nits.

---

## Tool Access

You have access to:

| Tool | Purpose |
|------|---------|
| `Read` | Read files to gather code context |
| `Glob` | Find files by pattern |
| `Grep` | Search code content |
| `Bash` | Run `git diff` or other commands to gather change context |

**Guidelines:**
- Always read the actual code — never review blind diffs
- Use `git diff` to get the changeset when reviewing uncommitted or branch changes
- Keep your final summary concise and actionable
- Group findings by severity: critical first, then warnings, then nits

---

## Review Categories

### 1. Architecture Compliance (StickerNest-Specific)

**Critical violations** — these block merge:

- **Layer boundary violations**: Importing from a higher layer
  ```typescript
  // BAD: Kernel importing from Runtime
  import { WidgetFrame } from '../runtime/WidgetFrame'; // L0 → L3 violation
  ```

- **Cross-store access**: Stores reading each other's state directly
  ```typescript
  // BAD: authStore reaching into canvasStore
  const canvas = useCanvasStore.getState().activeCanvas; // in authStore
  ```

- **Missing @sn/types import**: Defining schemas locally instead of using kernel
  ```typescript
  // BAD: Local schema definition
  const BusEventSchema = z.object({...}); // Should import from @sn/types
  ```

- **Incorrect event bus usage**: Direct store mutations instead of bus events
  ```typescript
  // BAD: Panel directly mutating scene graph
  sceneGraph.updateEntity(entity); // Should emit bus event
  ```

**Check against each layer's allowed imports** from `.claude/rules/`:
- L0 Kernel: Only external packages
- L1 Social: L0
- L2 Lab: L0, L1, L3
- L3 Runtime: L0
- L4A-1 Canvas Core: L0, L3
- L4A-2 Canvas Tools: L0, L3, L4A-1
- L4A-3 Canvas Wiring: L0, L3, L4A-1
- L4A-4 Canvas Panels: L0, L3, L4A-1
- L4B Spatial: L0, L3
- L5 Marketplace: L0, L1, L3, L4A-1
- L6 Shell: L0, L1, L3, L4A-1, L4B, L5

### 2. Bugs and Logic Errors

- Off-by-one errors in loops/indices
- Incorrect null/undefined handling
- Race conditions in async code
- Missing await on Promises
- Incorrect boolean logic
- Type coercion issues
- Unreachable code paths
- Incorrect use of mutable vs immutable operations

### 3. Security Vulnerabilities

**Critical** — must fix before merge:
- XSS vulnerabilities (unescaped user input in HTML/JSX)
- SQL injection (raw queries with user input)
- Command injection (shell commands with user input)
- Prototype pollution
- Insecure deserialization
- Missing origin validation on postMessage handlers
- API keys or secrets in code
- Missing authentication/authorization checks

**Warning** — fix or document justification:
- CORS misconfigurations
- Sensitive data in logs
- Weak cryptographic choices
- Missing rate limiting
- Information disclosure in error messages

**StickerNest-specific security**:
- Widget iframe: `srcdoc` only, never remote `src`
- Bridge protocol: origin validation on every message
- Integration credentials: never in iframe context
- Media URLs: always proxied, never direct bucket URLs

### 4. Performance Issues

**Critical**:
- O(n²) or worse algorithms on unbounded data
- Blocking the main thread with synchronous operations
- Memory leaks (event listeners not cleaned up, subscriptions not unsubscribed)
- Infinite loops or recursion without termination

**Warning**:
- Missing memoization on expensive computations
- Unnecessary re-renders in React components
- Large bundle imports that could be tree-shaken
- N+1 query patterns
- Missing pagination on list fetches

**StickerNest-specific performance**:
- Event bus: emit-to-handler < 1ms (L0 contract)
- Cursor broadcast: max 30fps throttle (L1 requirement)
- Canvas render: dirty-region tracking, not full viewport (L4A-1)
- Widget ready signal: within 500ms of load (L3 contract)

### 5. Code Style and Readability

**Warning**:
- Inconsistent naming conventions
- Functions exceeding ~50 lines without good reason
- Deeply nested conditionals (> 3 levels)
- Magic numbers without named constants
- Commented-out code
- TODO comments without ticket references

**Nit**:
- Minor formatting inconsistencies
- Verbose code that could be simplified
- Missing JSDoc on public APIs
- Inconsistent import ordering

**StickerNest naming conventions** (from `v5 terminology.pdf`):
- Canvas (not board/scene/stage)
- Entity (not item/object/element)
- Widget (not component/app)
- Sticker (not image/icon)
- Pipeline (not flow/chain)
- DataSource (not data/record)

### 6. Missing Edge Cases and Error Handling

**Warning**:
- Missing validation on function inputs
- Unhandled Promise rejections
- Missing error boundaries in React
- No fallback for failed network requests
- Missing loading/error states in UI

**StickerNest-specific**:
- Widget crash: must be caught by WidgetFrame, not crash host
- Offline mode: graceful degradation (L1 Social requirement)
- WebXR rejection: non-blocking error, not crash (L4B)
- Manifest validation: invalid widgets rejected with specific error

### 7. Test Coverage

**Warning**:
- New code without corresponding tests
- Tests that don't actually assert behavior
- Missing edge case coverage
- Missing error case coverage

**Required tests per layer**:
- L0: Bus throughput benchmark, ACL enforcement, store isolation
- L1: Two-session cursor, entity convergence, Yjs co-edit
- L3: READY signal timing, crash isolation, origin validation
- L4A-1: Coordinate round-trip, z-order, hit-test accuracy

---

## Output Format

Organize findings by severity, then by file:

```markdown
## Code Review Summary

**Files reviewed**: 5
**Issues found**: 3 critical, 5 warnings, 2 nits

---

### Critical (3)

#### 1. Layer Boundary Violation
`src/kernel/stores/authStore.ts:42`

**Issue**: Kernel store importing from Social layer
```typescript
import { presenceChannel } from '../../social/realtime';
```

**Fix**: Use event bus for cross-layer communication:
```typescript
import { bus } from '../bus';
// Subscribe to social.presence.* events instead
```

---

#### 2. Missing Origin Validation
`src/runtime/bridge/handler.ts:18`

**Issue**: postMessage handler doesn't validate origin
```typescript
window.addEventListener('message', (e) => {
  handleBridgeMessage(e.data); // No origin check!
});
```

**Fix**:
```typescript
window.addEventListener('message', (e) => {
  if (!isValidOrigin(e.origin)) return; // Silently drop
  handleBridgeMessage(e.data);
});
```

---

### Warnings (5)

[Continue with same format...]

---

### Nits (2)

[Continue with same format...]

---

## Checklist

Before approving:

- [ ] All critical issues resolved
- [ ] Warning issues either fixed or have documented justification
- [ ] Tests added/updated for new functionality
- [ ] Commit message follows format: `<type>(<scope>): <description>`
```

---

## Layer-Specific Review Prompts

When reviewing code in specific layers, also check:

### L0 Kernel
- [ ] Schemas exported from `src/kernel/schemas/index.ts`?
- [ ] Bus events use `spatial?: SpatialContext` (optional, never defaulted)?
- [ ] DataSource ACL roles independent from canvas roles?
- [ ] Single Supabase client instance?
- [ ] Stores don't subscribe to each other?

### L1 Social
- [ ] One Realtime channel per canvas (`canvas:{canvasId}`)?
- [ ] Cursor broadcast throttled to 30fps?
- [ ] Correct conflict resolution per data type?
- [ ] Bus events use `social.*` namespace?
- [ ] Guests included in presence?

### L3 Runtime
- [ ] Widget loaded via `srcdoc` blob, not remote URL?
- [ ] Origin validation on all message handlers?
- [ ] Credentials never passed to iframe?
- [ ] `register()` called before `ready()`?
- [ ] State limits enforced (1MB/instance, 10MB/user)?

### L4A Canvas
- [ ] Coordinates in canvas space, not screen space?
- [ ] Spatial index used for hit-testing?
- [ ] Render loop uses requestAnimationFrame?
- [ ] Edit/preview mode respected?
- [ ] Bus events emitted, not direct mutations?

### L4B Spatial
- [ ] `spatial` field populated only when meaningful?
- [ ] Single Three.js renderer instance?
- [ ] WebXR rejection handled gracefully?
- [ ] Controller input routed through bus?

### L5 Marketplace
- [ ] Manifest validated before install?
- [ ] Uninstall confirmation shown?
- [ ] License metadata respected?
- [ ] Pagination on listings?

### L6 Shell
- [ ] Route guards at route level, not in components?
- [ ] Theme tokens as CSS custom properties?
- [ ] Shortcuts in central registry?
- [ ] Error boundary at app level only?

---

## Quick Reference: Common Issues by Severity

| Severity | Examples |
|----------|----------|
| **Critical** | Layer violation, security vulnerability, data loss risk, crash bug |
| **Warning** | Performance issue, missing tests, poor error handling, style violation |
| **Nit** | Minor style, verbose code, missing optional docs |

---

## Integration with CI

This skill can be invoked automatically via:
- Pre-commit hook (staged changes only)
- PR review automation
- Manual invocation during development

The output format is designed to be parseable for automated tooling while remaining human-readable.
