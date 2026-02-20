# Kill Mutants

Read a Stryker mutation testing report and generate tests to kill surviving mutants.

## Usage

```
/kill-mutants [report-path]
```

Default report path: `reports/mutation/mutation.json`

## Instructions

When invoked, this command will:

1. **Read the Stryker mutation report** (JSON format)
2. **Identify surviving mutants** (status: "Survived" or "NoCoverage")
3. **Analyze each surviving mutant**:
   - Determine what mutation was applied
   - Understand why existing tests didn't catch it
4. **Generate targeted tests** to kill each mutant

## Mutation Types to Handle

| Mutant Type | Description | Test Strategy |
|-------------|-------------|---------------|
| `ConditionalExpression` | `if (a && b)` → `if (true)` | Add test where condition matters |
| `ArithmeticOperator` | `a + b` → `a - b` | Test with values where sign matters |
| `EqualityOperator` | `===` → `!==` | Test exact boundary conditions |
| `StringLiteral` | `"foo"` → `""` | Assert on string content |
| `BooleanLiteral` | `true` → `false` | Test both branches |
| `ArrayDeclaration` | `[]` → `["Stryker was here"]` | Assert array length/contents |
| `BlockStatement` | Remove block | Verify side effects occur |
| `OptionalChaining` | `a?.b` → `a.b` | Test with undefined values |

## Generated Test Template

```typescript
/**
 * Test generated to kill mutant: [mutant-id]
 * File: [source-file]:[line]
 * Mutation: [original] → [mutated]
 */
it('should [expected behavior] - kills mutant [id]', () => {
  // Setup to make the mutated code behave differently
  const input = /* specific value that exposes mutation */;

  // Execute
  const result = functionUnderTest(input);

  // Assert - this assertion will fail if mutation is applied
  expect(result).toBe(/* expected value */);
});
```

## Report Analysis

For each surviving mutant, output:

```
## Mutant #[id] - [status]
- **File**: src/path/to/file.ts:42
- **Mutation**: `a + b` → `a - b`
- **Why it survived**: No test exercises this code path with values where +/- difference matters
- **Kill strategy**: Add test with a=5, b=3, expect 8 (mutation would give 2)

Generated test:
```typescript
it('should add values correctly - kills mutant #123', () => {
  expect(add(5, 3)).toBe(8);
});
```
```

## Priority Order

Process mutants in this order (critical paths first):
1. `src/kernel/bus/` - Event bus (< 1ms latency is a hard contract)
2. `src/kernel/schemas/` - Zod schemas (type safety foundation)
3. `src/runtime/bridge/` - Bridge protocol (security boundary)
4. `src/kernel/stores/` - Store logic (state management)
5. Everything else

## Notes

- Stryker config should scope to critical paths only (it's slow)
- Run `npm run mutation` to generate fresh report before using this command
- Each generated test should be reviewed before committing
- Include mutant ID in test name for traceability
