#!/usr/bin/env node
/**
 * MCP Commerce Pipeline E2E Test
 *
 * Connects to the stickernest-dev MCP server and runs a full
 * creator-commerce pipeline: create users → upgrade → onboard →
 * create canvas → add tier + item → buyer purchases → fulfill → verify.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Helpers ──────────────────────────────────────────────────────────────

async function call(client: Client, tool: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const result = await client.callTool({ name: tool, arguments: args });
  const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
  try { return JSON.parse(text); } catch { return text; }
}

function heading(msg: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${msg}`);
  console.log('='.repeat(60));
}

function step(n: number, msg: string) {
  console.log(`\n  [Step ${n}] ${msg}`);
}

function show(label: string, data: unknown) {
  console.log(`    ${label}:`, JSON.stringify(data, null, 2).split('\n').join('\n    '));
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ✗ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`    ✓ ${msg}`);
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  heading('StickerNest Commerce Pipeline — MCP E2E Test');

  // Connect to MCP server
  const serverPath = resolve(__dirname, '../dist/index.js');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
  });
  const client = new Client({ name: 'commerce-test', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  console.log('  Connected to stickernest-dev MCP server v2.0.0');

  // ------------------------------------------------------------------
  step(1, 'Create a Creator user');
  const creator = await call(client, 'billing_create_user', {
    email: 'alice@creator.art',
    tier: 'creator',
  }) as Record<string, unknown>;
  show('Creator', creator);
  assert(creator.tier === 'creator', 'Creator tier is "creator"');
  assert(creator.chargesEnabled === false, 'Connect not yet onboarded');

  const creatorId = creator.id as string;

  // ------------------------------------------------------------------
  step(2, 'Check creator quota — can sell');
  const creatorQuota = await call(client, 'billing_get_quota', { tier: 'creator' }) as Record<string, unknown>;
  show('Creator Quota', creatorQuota);
  assert(creatorQuota.canSell === true, 'Creator tier can sell');
  assert(creatorQuota.applicationFeePct === 12, 'Platform fee is 12%');

  // ------------------------------------------------------------------
  step(3, 'Onboard creator with Stripe Connect');
  const onboard = await call(client, 'billing_connect_onboard', { userId: creatorId }) as Record<string, unknown>;
  show('Onboard result', onboard);
  assert(typeof onboard.url === 'string', 'Got onboarding URL');

  // Verify creator is now connected
  const creatorAfter = await call(client, 'billing_get_user', { userId: creatorId }) as Record<string, unknown>;
  assert(creatorAfter.chargesEnabled === true, 'Creator charges now enabled');
  assert(creatorAfter.connectOnboardingComplete === true, 'Onboarding complete');

  // ------------------------------------------------------------------
  step(4, 'Create a canvas and add it to the scene');
  const canvasId = 'canvas-shop-demo';
  const canvasEntity = await call(client, 'canvas_add_entity', {
    id: canvasId,
    type: 'widget',
    name: 'Alice\'s Art Shop',
    x: 0,
    y: 0,
    width: 800,
    height: 600,
  }) as Record<string, unknown>;
  show('Canvas entity', canvasEntity);
  assert(canvasEntity.id === canvasId, 'Canvas entity created');

  // ------------------------------------------------------------------
  step(5, 'Create a FREE subscription tier on the canvas');
  const tier = await call(client, 'commerce_create_tier', {
    canvasId,
    creatorId,
    name: 'Free Supporter',
    priceCents: 0,
    currency: 'usd',
    interval: 'month',
    description: 'Follow along with my art journey — totally free!',
    benefits: ['Access to community chat', 'Early previews of new work', 'Monthly wallpaper'],
  }) as Record<string, unknown>;
  show('Free Tier', tier);
  assert(tier.priceCents === 0, 'Tier price is 0 (free)');
  assert(tier.isActive === true, 'Tier is active');
  assert((tier.benefits as string[]).length === 3, 'Tier has 3 benefits');

  const tierId = tier.id as string;

  // ------------------------------------------------------------------
  step(6, 'Create a FREE shop item (digital sticker pack)');
  const item = await call(client, 'commerce_create_item', {
    canvasId,
    creatorId,
    name: 'Starter Sticker Pack',
    priceCents: 0,
    itemType: 'digital',
    fulfillment: 'auto',
    currency: 'usd',
    description: 'A free pack of 5 cute cat stickers to get you started',
    stockCount: 100,
    requiresShipping: false,
  }) as Record<string, unknown>;
  show('Free Shop Item', item);
  assert(item.priceCents === 0, 'Item price is 0 (free)');
  assert(item.itemType === 'digital', 'Item type is digital');
  assert(item.stockCount === 100, 'Initial stock is 100');
  assert(item.fulfillment === 'auto', 'Auto-fulfilled');

  const itemId = item.id as string;

  // ------------------------------------------------------------------
  step(7, 'List tiers and items on the canvas to verify');
  const tiers = await call(client, 'commerce_list_tiers', { canvasId }) as unknown[];
  const items = await call(client, 'commerce_list_items', { canvasId }) as unknown[];
  assert(tiers.length === 1, 'Canvas has 1 subscription tier');
  assert(items.length === 1, 'Canvas has 1 shop item');

  // ------------------------------------------------------------------
  step(8, 'Create a Buyer user');
  const buyer = await call(client, 'billing_create_user', {
    email: 'bob@buyer.com',
  }) as Record<string, unknown>;
  show('Buyer', buyer);
  assert(buyer.tier === 'free', 'Buyer is on free tier');

  const buyerId = buyer.id as string;

  // ------------------------------------------------------------------
  step(9, 'Buyer subscribes to the free tier');
  const subOrder = await call(client, 'commerce_buy', {
    buyerId,
    itemId: tierId,
    type: 'subscription',
  }) as Record<string, unknown>;
  show('Subscription order', subOrder);
  assert(subOrder.amountCents === 0, 'Subscription amount is $0');
  assert(subOrder.platformFeeCents === 0, 'Platform fee is $0 (12% of 0)');
  assert(subOrder.status === 'paid', 'Order status is paid');
  assert(subOrder.type === 'subscription', 'Order type is subscription');
  assert(subOrder.buyerId === buyerId, 'Buyer ID matches');
  assert(subOrder.sellerId === creatorId, 'Seller ID matches creator');

  // ------------------------------------------------------------------
  step(10, 'Buyer purchases the free shop item');
  const shopOrder = await call(client, 'commerce_buy', {
    buyerId,
    itemId: itemId,
    type: 'shop_item',
  }) as Record<string, unknown>;
  show('Shop order', shopOrder);
  assert(shopOrder.amountCents === 0, 'Shop order amount is $0');
  assert(shopOrder.platformFeeCents === 0, 'Platform fee is $0');
  assert(shopOrder.status === 'paid', 'Order status is paid');
  assert(shopOrder.type === 'shop_item', 'Order type is shop_item');

  // Verify stock decremented
  const updatedItem = await call(client, 'commerce_list_items', { canvasId }) as Array<Record<string, unknown>>;
  assert(updatedItem[0].stockCount === 99, 'Stock decremented from 100 to 99');

  // ------------------------------------------------------------------
  step(11, 'Fulfill the shop order');
  const fulfilled = await call(client, 'commerce_fulfill_order', {
    id: shopOrder.id as string,
  }) as Record<string, unknown>;
  show('Fulfilled order', fulfilled);
  assert(fulfilled.status === 'fulfilled', 'Order status is now fulfilled');

  // ------------------------------------------------------------------
  step(12, 'List all orders for the buyer');
  const buyerOrders = await call(client, 'commerce_list_orders', { buyerId }) as unknown[];
  assert(buyerOrders.length === 2, 'Buyer has 2 orders (1 sub + 1 shop)');

  // ------------------------------------------------------------------
  step(13, 'List all orders for the seller');
  const sellerOrders = await call(client, 'commerce_list_orders', { sellerId: creatorId }) as unknown[];
  assert(sellerOrders.length === 2, 'Seller has 2 orders');

  // ------------------------------------------------------------------
  step(14, 'Check event bus — commerce events emitted');
  const busEvents = await call(client, 'bus_history', { filter: 'commerce.*' }) as unknown[];
  show('Commerce bus events', (busEvents as Array<Record<string, unknown>>).map(e => e.type));
  assert(busEvents.length >= 4, 'At least 4 commerce events (2 creates + 2 orders)');

  // ------------------------------------------------------------------
  step(15, 'Final commerce stats');
  const stats = await call(client, 'commerce_stats') as Record<string, unknown>;
  show('Commerce Stats', stats);
  assert(stats.totalTiers === 1, '1 tier total');
  assert(stats.totalItems === 1, '1 item total');
  assert(stats.totalOrders === 2, '2 orders total');
  assert(stats.platformFeeTotalCents === 0, 'Total platform fees: $0 (all free)');

  // ------------------------------------------------------------------
  step(16, 'Final billing stats');
  const billingStats = await call(client, 'billing_stats') as Record<string, unknown>;
  show('Billing Stats', billingStats);
  assert(billingStats.totalUsers === 3, '3 users (1 seeded default + creator + buyer)');
  assert(billingStats.connectedCreators === 1, '1 connected creator');

  // ------------------------------------------------------------------
  heading('ALL ASSERTIONS PASSED — Pipeline Complete!');
  console.log(`
  Summary:
    Creator: ${creator.email} (${creatorId})
    Canvas:  ${canvasId} — "Alice's Art Shop"
    Tier:    "${tier.name}" — FREE
    Item:    "${item.name}" — FREE (99 remaining)
    Buyer:   ${buyer.email} (${buyerId})
    Orders:  2 (1 subscription + 1 shop item, both fulfilled)
    Revenue: $0.00 (all free)
    Platform fees: $0.00
  `);

  await client.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
