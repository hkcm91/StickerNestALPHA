/**
 * Plop.js configuration for StickerNest V5 scaffolding.
 *
 * Generators:
 * - widget: Create a complete widget scaffold
 * - module: Create a layer module with test file
 * - store: Create a Zustand store (kernel layer only)
 * - event: Create a bus event with payload schema
 * - schema: Create a Zod schema with tests
 *
 * Usage:
 *   npm run plop
 *   npm run scaffold:widget
 *   npm run scaffold:module
 *   npm run scaffold:store
 *   npm run scaffold:event
 */

const path = require('path');

module.exports = function (plop) {
  // =============================================================================
  // Constants
  // =============================================================================

  // Widget categories matching the marketplace taxonomy
  const WIDGET_CATEGORIES = [
    'productivity',
    'games',
    'data',
    'social',
    'utilities',
    'media',
    'developer',
    'other',
  ];

  // Layer definitions with their directory paths
  const LAYERS = {
    kernel: { path: 'src/kernel', label: 'L0: Kernel', canImportFrom: [] },
    social: { path: 'src/social', label: 'L1: Social', canImportFrom: ['kernel'] },
    runtime: { path: 'src/runtime', label: 'L3: Runtime', canImportFrom: ['kernel'] },
    lab: { path: 'src/lab', label: 'L2: Lab', canImportFrom: ['kernel', 'social', 'runtime'] },
    'canvas-core': { path: 'src/canvas/core', label: 'L4A-1: Canvas Core', canImportFrom: ['kernel', 'runtime'] },
    'canvas-tools': { path: 'src/canvas/tools', label: 'L4A-2: Canvas Tools', canImportFrom: ['kernel', 'runtime', 'canvas-core'] },
    'canvas-wiring': { path: 'src/canvas/wiring', label: 'L4A-3: Canvas Wiring', canImportFrom: ['kernel', 'runtime', 'canvas-core'] },
    'canvas-panels': { path: 'src/canvas/panels', label: 'L4A-4: Canvas Panels', canImportFrom: ['kernel', 'runtime', 'canvas-core'] },
    spatial: { path: 'src/spatial', label: 'L4B: Spatial/VR', canImportFrom: ['kernel', 'runtime'] },
    marketplace: { path: 'src/marketplace', label: 'L5: Marketplace', canImportFrom: ['kernel', 'social', 'runtime', 'canvas-core'] },
    shell: { path: 'src/shell', label: 'L6: Shell', canImportFrom: ['kernel', 'social', 'runtime', 'canvas-core', 'spatial', 'marketplace'] },
  };

  // Event namespaces
  const EVENT_NAMESPACES = [
    { value: 'kernel', label: 'Kernel (kernel.*)' },
    { value: 'social', label: 'Social (social.*)' },
    { value: 'canvas', label: 'Canvas (canvas.*)' },
    { value: 'widget', label: 'Widget (widget.*)' },
    { value: 'shell', label: 'Shell (shell.*)' },
    { value: 'spatial', label: 'Spatial (spatial.*)' },
  ];

  // Common Zod field types for schema generator
  const ZOD_TYPES = [
    { value: 'z.string()', label: 'String', testValue: '"test-value"' },
    { value: 'z.number()', label: 'Number', testValue: '42' },
    { value: 'z.boolean()', label: 'Boolean', testValue: 'true' },
    { value: 'z.string().uuid()', label: 'UUID', testValue: '"550e8400-e29b-41d4-a716-446655440000"' },
    { value: 'z.string().email()', label: 'Email', testValue: '"test@example.com"' },
    { value: 'z.string().url()', label: 'URL', testValue: '"https://example.com"' },
    { value: 'z.number().int()', label: 'Integer', testValue: '42' },
    { value: 'z.number().positive()', label: 'Positive Number', testValue: '1.5' },
    { value: 'z.array(z.string())', label: 'String Array', testValue: '["item1", "item2"]' },
    { value: 'z.record(z.string(), z.unknown())', label: 'Record/Object', testValue: '{ key: "value" }' },
    { value: 'z.coerce.date()', label: 'Date', testValue: 'new Date()' },
    { value: 'z.string().optional()', label: 'Optional String', testValue: 'undefined' },
    { value: 'z.unknown()', label: 'Unknown', testValue: '{}' },
  ];

  // =============================================================================
  // Helpers
  // =============================================================================

  // Custom helper to check if layer is kernel
  plop.setHelper('isKernel', function (layer) {
    return layer === 'kernel';
  });

  // Custom helper to check if layer imports from kernel
  plop.setHelper('importFromKernel', function (layer) {
    return layer !== 'kernel';
  });

  // =============================================================================
  // Widget Generator (existing)
  // =============================================================================

  plop.setGenerator('widget', {
    description: 'Generate a new StickerNest widget scaffold',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Widget name (e.g., "Task List", "Weather Display"):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Widget name is required';
          }
          if (!/^[a-zA-Z][a-zA-Z0-9 ]*$/.test(input.trim())) {
            return 'Widget name must start with a letter and contain only letters, numbers, and spaces';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Widget description:',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Description is required';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'category',
        message: 'Widget category:',
        choices: WIDGET_CATEGORIES,
        default: 'utilities',
      },
    ],
    actions: [
      {
        type: 'add',
        path: '../src/runtime/widgets/{{kebabCase name}}/{{kebabCase name}}.widget.tsx',
        templateFile: 'templates/widget/widget.tsx.hbs',
      },
      {
        type: 'add',
        path: '../src/runtime/widgets/{{kebabCase name}}/{{kebabCase name}}.schema.ts',
        templateFile: 'templates/widget/schema.ts.hbs',
      },
      {
        type: 'add',
        path: '../src/runtime/widgets/{{kebabCase name}}/{{kebabCase name}}.events.ts',
        templateFile: 'templates/widget/events.ts.hbs',
      },
      {
        type: 'add',
        path: '../src/runtime/widgets/{{kebabCase name}}/{{kebabCase name}}.test.ts',
        templateFile: 'templates/widget/test.ts.hbs',
      },
      {
        type: 'add',
        path: '../src/runtime/widgets/{{kebabCase name}}/index.ts',
        templateFile: 'templates/widget/index.ts.hbs',
      },
      function () {
        return `
Widget scaffold created successfully!

Files generated:
  src/runtime/widgets/{{kebabCase name}}/
    ├── {{kebabCase name}}.widget.tsx   - React component
    ├── {{kebabCase name}}.schema.ts    - Zod config schema
    ├── {{kebabCase name}}.events.ts    - Event type definitions
    ├── {{kebabCase name}}.test.ts      - Vitest tests
    └── index.ts                        - Barrel export

Next steps:
  1. Implement widget logic in the .widget.tsx file
  2. Define configuration options in the .schema.ts file
  3. Add event types in the .events.ts file
  4. Run tests: npm test -- --filter={{kebabCase name}}
        `;
      },
    ],
  });

  // =============================================================================
  // Module Generator
  // =============================================================================

  plop.setGenerator('module', {
    description: 'Generate a new layer module with test file',
    prompts: [
      {
        type: 'list',
        name: 'layer',
        message: 'Select layer:',
        choices: Object.entries(LAYERS).map(([key, value]) => ({
          name: value.label,
          value: key,
        })),
      },
      {
        type: 'input',
        name: 'name',
        message: 'Module name (e.g., "viewport", "user-presence"):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Module name is required';
          }
          if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(input.trim())) {
            return 'Module name must start with a letter and contain only letters, numbers, and hyphens';
          }
          return true;
        },
      },
    ],
    actions: (data) => {
      const layerPath = LAYERS[data.layer].path;
      const isKernel = data.layer === 'kernel';
      const importFromKernel = data.layer !== 'kernel';

      return [
        {
          type: 'add',
          path: `../${layerPath}/{{kebabCase name}}/{{kebabCase name}}.ts`,
          templateFile: 'templates/module/module.ts.hbs',
          data: { isKernel, importFromKernel },
        },
        {
          type: 'add',
          path: `../${layerPath}/{{kebabCase name}}/{{kebabCase name}}.test.ts`,
          templateFile: 'templates/module/module.test.ts.hbs',
        },
        {
          type: 'add',
          path: `../${layerPath}/{{kebabCase name}}/index.ts`,
          templateFile: 'templates/module/index.ts.hbs',
        },
        function (answers) {
          const layer = LAYERS[answers.layer];
          const importableFrom = layer.canImportFrom.length > 0
            ? layer.canImportFrom.join(', ')
            : 'nothing (base layer)';

          return `
Module scaffold created successfully!

Files generated:
  ${layerPath}/{{kebabCase name}}/
    ├── {{kebabCase name}}.ts      - Module implementation
    ├── {{kebabCase name}}.test.ts - Vitest tests
    └── index.ts                   - Barrel export

Layer: ${layer.label}
May import from: ${importableFrom}

Next steps:
  1. Implement module logic in the .ts file
  2. Add tests in the .test.ts file
  3. Run tests: npm test -- --filter={{kebabCase name}}
  4. Read layer rules: .claude/rules/${answers.layer.replace('canvas-', 'L4A-').replace('spatial', 'L4B-spatial')}.md
          `;
        },
      ];
    },
  });

  // =============================================================================
  // Store Generator
  // =============================================================================

  plop.setGenerator('store', {
    description: 'Generate a new Zustand store (kernel layer only)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Store name (e.g., "notification", "preferences"):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Store name is required';
          }
          if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(input.trim())) {
            return 'Store name must start with a letter and contain only letters, numbers, and hyphens';
          }
          // Check for reserved store names
          const reserved = ['auth', 'workspace', 'canvas', 'history', 'widget', 'social', 'ui'];
          const normalized = input.trim().toLowerCase().replace(/-store$/, '');
          if (reserved.includes(normalized)) {
            return `"${normalized}" is a reserved store name. The seven core stores are: ${reserved.join(', ')}`;
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Store description (what does this store manage?):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Description is required';
          }
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'confirmKernel',
        message: 'Stores MUST be in the kernel layer (src/kernel/stores/). Continue?',
        default: true,
      },
    ],
    actions: (data) => {
      if (!data.confirmKernel) {
        return [
          function () {
            return 'Store creation cancelled. Stores can only be created in the kernel layer.';
          },
        ];
      }

      return [
        {
          type: 'add',
          path: '../src/kernel/stores/{{kebabCase name}}/{{kebabCase name}}.store.ts',
          templateFile: 'templates/store/store.ts.hbs',
        },
        {
          type: 'add',
          path: '../src/kernel/stores/{{kebabCase name}}/{{kebabCase name}}.store.test.ts',
          templateFile: 'templates/store/store.test.ts.hbs',
        },
        {
          type: 'add',
          path: '../src/kernel/stores/{{kebabCase name}}/index.ts',
          templateFile: 'templates/store/index.ts.hbs',
        },
        function () {
          return `
Store scaffold created successfully!

Files generated:
  src/kernel/stores/{{kebabCase name}}/
    ├── {{kebabCase name}}.store.ts      - Zustand store implementation
    ├── {{kebabCase name}}.store.test.ts - Vitest tests
    └── index.ts                          - Barrel export

Important notes:
  - Stores do NOT import from each other
  - Cross-store communication goes through the event bus
  - State mutations only through actions
  - Use selectors for derived state

Next steps:
  1. Define state shape in the store file
  2. Implement actions
  3. Add selectors
  4. Write tests
  5. Run tests: npm test -- --filter={{kebabCase name}}
          `;
        },
      ];
    },
  });

  // =============================================================================
  // Event Generator
  // =============================================================================

  plop.setGenerator('event', {
    description: 'Generate a new bus event with payload schema',
    prompts: [
      {
        type: 'list',
        name: 'namespace',
        message: 'Event namespace:',
        choices: EVENT_NAMESPACES,
      },
      {
        type: 'input',
        name: 'eventName',
        message: 'Event name (e.g., "user-joined", "entity-locked"):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Event name is required';
          }
          if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(input.trim())) {
            return 'Event name must start with a letter and contain only letters, numbers, and hyphens';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Event description (when is this event emitted?):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Description is required';
          }
          return true;
        },
      },
    ],
    actions: [
      {
        type: 'add',
        path: '../src/kernel/schemas/events/{{kebabCase eventName}}.payload.ts',
        templateFile: 'templates/event/event-payload.ts.hbs',
      },
      function (data) {
        const fullEventName = `${data.namespace}.${plop.getHelper('kebabCase')(data.eventName)}`;
        const constantName = `${plop.getHelper('constantCase')(data.namespace)}_${plop.getHelper('constantCase')(data.eventName)}`;
        const eventsObjName = `${plop.getHelper('pascalCase')(data.namespace)}Events`;

        return `
Event payload scaffold created successfully!

File generated:
  src/kernel/schemas/events/{{kebabCase eventName}}.payload.ts

Full event name: ${fullEventName}

MANUAL STEP REQUIRED:
Add this constant to ${eventsObjName} in src/kernel/schemas/bus-event.ts:

  export const ${eventsObjName} = {
    // ... existing events
    ${plop.getHelper('constantCase')(data.eventName)}: '${fullEventName}',
  } as const;

Then export the payload from src/kernel/schemas/index.ts:

  export {
    ${plop.getHelper('pascalCase')(data.eventName)}PayloadSchema,
    type ${plop.getHelper('pascalCase')(data.eventName)}Payload,
    ${plop.getHelper('pascalCase')(data.eventName)}PayloadJSONSchema,
  } from './events/{{kebabCase eventName}}.payload';

Next steps:
  1. Define payload fields in the schema file
  2. Add the event constant to bus-event.ts
  3. Export from schemas/index.ts
  4. Use with createBusEvent() in your code
        `;
      },
    ],
  });

  // =============================================================================
  // Schema Generator
  // =============================================================================

  plop.setGenerator('schema', {
    description: 'Generate a new Zod schema in kernel/schemas/',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Schema name (e.g., "workspace-settings", "user-profile"):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Schema name is required';
          }
          if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(input.trim())) {
            return 'Schema name must start with a letter and contain only letters, numbers, and hyphens';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Schema description:',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Description is required';
          }
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'addFields',
        message: 'Would you like to add fields interactively?',
        default: true,
      },
    ],
    actions: (data) => {
      // If no interactive fields, use empty array
      if (!data.addFields) {
        data.fields = [];
      }

      const actions = [
        {
          type: 'add',
          path: '../src/kernel/schemas/{{kebabCase name}}.ts',
          templateFile: 'templates/schema/schema.ts.hbs',
        },
        {
          type: 'add',
          path: '../src/kernel/schemas/{{kebabCase name}}.test.ts',
          templateFile: 'templates/schema/schema.test.ts.hbs',
        },
        function (answers) {
          const pascalName = plop.getHelper('pascalCase')(answers.name);

          return `
Schema scaffold created successfully!

Files generated:
  src/kernel/schemas/{{kebabCase name}}.ts      - Zod schema
  src/kernel/schemas/{{kebabCase name}}.test.ts - Vitest tests

MANUAL STEP REQUIRED:
Add exports to src/kernel/schemas/index.ts:

  // =============================================================================
  // ${pascalName} Schemas
  // =============================================================================
  export {
    // Schemas
    ${pascalName}Schema,
    Create${pascalName}InputSchema,
    Update${pascalName}InputSchema,
    // Types
    type ${pascalName},
    type Create${pascalName}Input,
    type Update${pascalName}Input,
    // JSON Schemas
    ${pascalName}JSONSchema,
  } from './{{kebabCase name}}';

Next steps:
  1. Define schema fields in the .ts file
  2. Update test file with test values for your fields
  3. Add exports to index.ts
  4. Run tests: npm test -- --filter={{kebabCase name}}
          `;
        },
      ];

      // If user wants to add fields, add a recursive prompt action
      if (data.addFields) {
        // Note: Plop doesn't support recursive prompts natively.
        // For interactive field addition, users should manually edit the generated file.
        // This is a limitation we document in the success message.
      }

      return actions;
    },
  });
};
