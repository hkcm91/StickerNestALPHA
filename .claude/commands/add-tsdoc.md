# Add TSDoc

Batch-add TSDoc documentation comments to undocumented public exports.

## Usage

```
/add-tsdoc <file-or-directory-path>
```

## Instructions

When invoked, this command will:

1. **Scan the target** for TypeScript files (`.ts`, `.tsx`)
2. **Identify undocumented public exports**:
   - Exported functions
   - Exported classes and their public methods
   - Exported interfaces and types
   - Exported constants
3. **Generate TSDoc comments** following the TSDoc standard
4. **Insert comments** above each undocumented export

## TSDoc Format

### Functions

```typescript
/**
 * Brief description of what the function does.
 *
 * @param paramName - Description of the parameter
 * @returns Description of the return value
 * @throws {ErrorType} When the error condition occurs
 *
 * @example
 * ```typescript
 * const result = functionName(arg1, arg2);
 * ```
 */
export function functionName(paramName: ParamType): ReturnType {
```

### Classes

```typescript
/**
 * Brief description of the class.
 *
 * @remarks
 * Additional details about usage or behavior.
 *
 * @example
 * ```typescript
 * const instance = new ClassName(config);
 * instance.doSomething();
 * ```
 */
export class ClassName {
  /**
   * Brief description of the method.
   *
   * @param param - Parameter description
   * @returns Return value description
   */
  public methodName(param: Type): ReturnType {
```

### Interfaces

```typescript
/**
 * Brief description of the interface.
 */
export interface InterfaceName {
  /** Description of property */
  propertyName: Type;

  /**
   * Description of method signature.
   * @param param - Parameter description
   */
  methodName(param: Type): ReturnType;
}
```

### Types

```typescript
/**
 * Brief description of the type.
 *
 * @remarks
 * When to use this type vs alternatives.
 */
export type TypeName = /* ... */;
```

### Constants

```typescript
/**
 * Brief description of the constant.
 *
 * @remarks
 * Where/how this constant is used.
 */
export const CONSTANT_NAME = /* ... */;
```

## Layer-Specific Annotations

### Layer 0 (Kernel)
- Document event bus event types with `@eventType` custom tag
- Document store actions with state transition descriptions
- Include Zod schema validation notes

### Layer 3 (Runtime)
- Document bridge message types with direction (host→widget or widget→host)
- Include security notes for origin validation
- Document Widget SDK methods with iframe context notes

### Layer 4A (Canvas)
- Document coordinate space (canvas vs screen)
- Include performance notes for render loop code
- Document z-order behavior

## Analysis Output

Before adding documentation, output a summary:

```
## TSDoc Analysis: [path]

### Undocumented Exports Found: [count]

| Export | Type | File | Line |
|--------|------|------|------|
| `functionName` | function | file.ts | 42 |
| `ClassName` | class | file.ts | 100 |
| ...

### Recommendation
Adding TSDoc to [count] exports. Proceed? (Use --dry-run to preview)
```

## Notes

- Does not overwrite existing TSDoc comments
- Generates descriptions based on:
  - Function/class name (semantic analysis)
  - Parameter types
  - Return types
  - Existing inline comments
- Review generated docs before committing - AI-generated descriptions may need refinement
- Run `npm run docs` after to verify TypeDoc builds correctly
