/**
 * Store Isolation — L0 Gate Test
 *
 * Confirms stores do not import from each other via static import analysis.
 * This is a mandatory gate test per L0-kernel.md rules.
 *
 * @module kernel/stores
 */

import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const storeNames = ['auth', 'workspace', 'canvas', 'history', 'widget', 'social', 'ui', 'docker', 'gallery'];
const storesDir = path.resolve(__dirname);

describe('Store Isolation — L0 Gate Test', () => {
  for (const storeName of storeNames) {
    it(`${storeName}.store.ts must not import from other stores`, () => {
      const filePath = path.join(storesDir, storeName, `${storeName}.store.ts`);
      const content = fs.readFileSync(filePath, 'utf-8');

      const otherStores = storeNames.filter((s) => s !== storeName);
      for (const other of otherStores) {
        // Must not import from sibling store directories
        expect(
          content,
          `${storeName}.store.ts imports from ${other} store`,
        ).not.toMatch(new RegExp(`from\\s+['"]\\.\\./${other}/`));
        expect(
          content,
          `${storeName}.store.ts imports from ${other}.store`,
        ).not.toMatch(new RegExp(`from\\s+['"].*${other}\\.store`));
      }
    });

    it(`${storeName}.store.ts must not import from layers above L0`, () => {
      const filePath = path.join(storesDir, storeName, `${storeName}.store.ts`);
      const content = fs.readFileSync(filePath, 'utf-8');

      const forbiddenPaths = [
        'src/social/',
        'src/runtime/',
        'src/lab/',
        'src/canvas/',
        'src/spatial/',
        'src/marketplace/',
        'src/shell/',
      ];

      for (const forbidden of forbiddenPaths) {
        expect(
          content,
          `${storeName}.store.ts imports from ${forbidden}`,
        ).not.toMatch(new RegExp(`from\\s+['"].*${forbidden.replace(/\//g, '\\/')}`));
      }
    });
  }

  it('all 9 stores exist', () => {
    for (const storeName of storeNames) {
      const filePath = path.join(storesDir, storeName, `${storeName}.store.ts`);
      expect(fs.existsSync(filePath), `${storeName}.store.ts exists`).toBe(true);
    }
  });

  it('stores only import from @sn/types and ../../bus within kernel', () => {
    for (const storeName of storeNames) {
      const filePath = path.join(storesDir, storeName, `${storeName}.store.ts`);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract all import paths
      const importMatches = content.matchAll(/from\s+['"]([^'"]+)['"]/g);
      for (const match of importMatches) {
        const importPath = match[1];
        // Allowed: @sn/types, ../../bus, zustand, zustand/middleware, external packages
        const isAllowed =
          importPath === '@sn/types' ||
          importPath.startsWith('@sn/types/') ||
          importPath === '../../bus' ||
          importPath === '../../supabase/client' ||
          importPath === 'zustand' ||
          importPath === 'zustand/middleware' ||
          !importPath.startsWith('.'); // External packages are OK

        expect(
          isAllowed,
          `${storeName}.store.ts has disallowed import: ${importPath}`,
        ).toBe(true);
      }
    }
  });
});
