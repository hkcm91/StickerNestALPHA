/**
 * Tests for Built-in Widget HTML Templates
 *
 * Verifies all commerce widget HTML templates are structurally valid,
 * call StickerNest.register() and StickerNest.ready(), and use the
 * integration proxy correctly.
 *
 * @module runtime/widgets
 * @layer L3
 */

import { describe, it, expect } from 'vitest';

import { BUILT_IN_WIDGET_HTML } from './built-in-html';

const COMMERCE_WIDGETS = [
  'wgt-signup',
  'wgt-subscribe',
  'wgt-shop',
  'wgt-creator-setup',
  'wgt-tier-manager',
  'wgt-item-manager',
  'wgt-orders',
] as const;

const ALL_WIDGETS = [
  'wgt-clock',
  'wgt-note',
  'wgt-counter',
  ...COMMERCE_WIDGETS,
] as const;

describe('BUILT_IN_WIDGET_HTML', () => {
  it('exports all expected widget keys', () => {
    for (const key of ALL_WIDGETS) {
      expect(BUILT_IN_WIDGET_HTML).toHaveProperty(key);
      expect(typeof BUILT_IN_WIDGET_HTML[key]).toBe('string');
      expect(BUILT_IN_WIDGET_HTML[key].length).toBeGreaterThan(0);
    }
  });

  describe.each(ALL_WIDGETS)('%s', (key) => {
    const html = BUILT_IN_WIDGET_HTML[key];

    it('calls StickerNest.register()', () => {
      expect(html).toMatch(/StickerNest\.register\(/);
    });

    it('calls StickerNest.ready()', () => {
      expect(html).toMatch(/StickerNest\.ready\(\)/);
    });

    it('contains a <script> tag', () => {
      expect(html).toContain('<script>');
      expect(html).toContain('</script>');
    });

    it('uses theme CSS variables with fallbacks', () => {
      // Every widget should use at least one theme token with a fallback
      expect(html).toMatch(/var\(--sn-/);
    });
  });

  describe('commerce widgets use integration proxy', () => {
    it('signup uses auth integration', () => {
      const html = BUILT_IN_WIDGET_HTML['wgt-signup'];
      expect(html).toContain("StickerNest.integration('auth')");
      expect(html).toContain("action: 'session'");
      // signup/signin actions are set via variable: action = isSignUp ? 'signup' : 'signin'
      expect(html).toMatch(/isSignUp\s*\?\s*'signup'\s*:\s*'signin'/);
      expect(html).toContain("action: 'signout'");
    });

    it('subscribe uses checkout integration for tiers', () => {
      const html = BUILT_IN_WIDGET_HTML['wgt-subscribe'];
      expect(html).toContain("StickerNest.integration('checkout')");
      expect(html).toContain("action: 'tiers'");
      expect(html).toContain("action: 'my_subscription'");
      expect(html).toContain("action: 'subscribe'");
    });

    it('shop uses checkout integration for items', () => {
      const html = BUILT_IN_WIDGET_HTML['wgt-shop'];
      expect(html).toContain("StickerNest.integration('checkout')");
      expect(html).toContain("action: 'shop_items'");
      expect(html).toContain("action: 'buy'");
    });

    it('creator-setup uses checkout integration for connect', () => {
      const html = BUILT_IN_WIDGET_HTML['wgt-creator-setup'];
      expect(html).toContain("StickerNest.integration('checkout')");
      expect(html).toContain("action: 'connect_status'");
      expect(html).toContain("action: 'connect_onboard'");
      expect(html).toContain("action: 'connect_dashboard'");
    });

    it('tier-manager uses checkout integration for tier CRUD', () => {
      const html = BUILT_IN_WIDGET_HTML['wgt-tier-manager'];
      expect(html).toContain("StickerNest.integration('checkout')");
      expect(html).toContain("action: 'my_tiers'");
      expect(html).toContain("action: 'create_tier'");
      expect(html).toContain("action: 'update_tier'");
      expect(html).toContain("action: 'delete_tier'");
    });

    it('item-manager uses checkout integration for item CRUD', () => {
      const html = BUILT_IN_WIDGET_HTML['wgt-item-manager'];
      expect(html).toContain("StickerNest.integration('checkout')");
      expect(html).toContain("action: 'my_items'");
      expect(html).toContain("action: 'create_item'");
      expect(html).toContain("action: 'update_item'");
      expect(html).toContain("action: 'delete_item'");
    });

    it('orders uses checkout integration for order history', () => {
      const html = BUILT_IN_WIDGET_HTML['wgt-orders'];
      expect(html).toContain("StickerNest.integration('checkout')");
      expect(html).toContain("action: 'my_orders'");
      expect(html).toContain("action: 'my_subscription'");
      expect(html).toContain("action: 'download'");
    });
  });

  describe('multi-page widgets have page structure', () => {
    it('creator-setup has 3 pages', () => {
      const html = BUILT_IN_WIDGET_HTML['wgt-creator-setup'];
      expect(html).toContain('id="page-status"');
      expect(html).toContain('id="page-onboard"');
      expect(html).toContain('id="page-complete"');
    });

    it('tier-manager has list, form, and delete pages', () => {
      const html = BUILT_IN_WIDGET_HTML['wgt-tier-manager'];
      expect(html).toContain('id="page-list"');
      expect(html).toContain('id="page-form"');
      expect(html).toContain('id="page-delete"');
    });

    it('item-manager has list, form, and delete pages', () => {
      const html = BUILT_IN_WIDGET_HTML['wgt-item-manager'];
      expect(html).toContain('id="page-list"');
      expect(html).toContain('id="page-form"');
      expect(html).toContain('id="page-delete"');
    });

    it('orders has tab navigation', () => {
      const html = BUILT_IN_WIDGET_HTML['wgt-orders'];
      expect(html).toContain('data-tab="purchases"');
      expect(html).toContain('data-tab="subscriptions"');
    });
  });

  describe('security: no direct API keys or credentials', () => {
    for (const key of COMMERCE_WIDGETS) {
      it(`${key} does not contain API keys or secrets`, () => {
        const html = BUILT_IN_WIDGET_HTML[key];
        expect(html).not.toMatch(/sk_live_/);
        expect(html).not.toMatch(/sk_test_/);
        expect(html).not.toMatch(/SUPABASE_/);
        expect(html).not.toMatch(/Bearer\s+[A-Za-z0-9]/);
        // Widgets must use integration proxy — no direct fetch calls
        expect(html).not.toContain('fetch(');
        expect(html).not.toContain('XMLHttpRequest');
      });
    }
  });

  describe('XSS protection: widgets escape user content', () => {
    for (const key of ['wgt-tier-manager', 'wgt-item-manager', 'wgt-orders'] as const) {
      it(`${key} has an escape function`, () => {
        const html = BUILT_IN_WIDGET_HTML[key];
        // All manager widgets must have an esc() function for HTML escaping
        expect(html).toMatch(/function esc\(/);
        // Escape function must use textContent (safe) not innerHTML
        expect(html).toMatch(/\.textContent\s*=/);
      });
    }
  });
});
