// Alice's Art Shop - Canvas Seed with Commerce Widgets
(function() {
  console.log('[seed-shop] Starting seed with widgets...');

  var now = new Date().toISOString();

  // Valid UUID v4 format
  var canvasId = "a1111111-1111-4111-a111-111111111111";
  var userId = "00000000-0000-4000-a000-000000000001";
  var slug = "alice-art-shop";

  // Base fields for all entities
  function makeBase(id, type, transform, zIndex, name) {
    return {
      id: id,
      type: type,
      canvasId: canvasId,
      transform: transform,
      zIndex: zIndex,
      visible: true,
      canvasVisibility: "both",
      locked: false,
      flipH: false,
      flipV: false,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      borderRadius: 0,
      name: name
    };
  }

  // Text entity helper
  function makeText(id, pos, size, zIndex, name, content, fontSize, fontWeight, color) {
    var base = makeBase(id, "text", { position: pos, size: size, rotation: 0, scale: 1 }, zIndex, name);
    base.content = content;
    base.fontSize = fontSize;
    base.fontWeight = fontWeight;
    base.color = color;
    base.textAlign = "left";
    base.fontFamily = "system-ui";
    return base;
  }

  // Widget entity helper
  function makeWidget(id, widgetId, widgetInstanceId, pos, size, zIndex, name, config) {
    var base = makeBase(id, "widget", { position: pos, size: size, rotation: 0, scale: 1 }, zIndex, name);
    base.widgetId = widgetId;
    base.widgetInstanceId = widgetInstanceId;
    base.config = config || {};
    return base;
  }

  var entities = [
    // Header
    makeText(
      "b1111111-1111-4111-a111-111111111111",
      { x: 100, y: 30 }, { width: 600, height: 60 },
      1, "Header",
      "Welcome to Alice's Art Shop!",
      42, 700, "#e91e63"
    ),
    // Subtitle
    makeText(
      "b2222222-2222-4222-a222-222222222222",
      { x: 100, y: 100 }, { width: 600, height: 30 },
      2, "Subtitle",
      "Digital stickers, wallpapers, and exclusive content",
      18, 400, "#666666"
    ),

    // Shop Widget - shows purchasable items
    makeWidget(
      "c1111111-1111-4111-a111-111111111111",
      "sn.builtin.shop",
      "c1111111-1111-4111-a111-111111111112",
      { x: 100, y: 150 }, { width: 600, height: 350 },
      10, "Shop Items Widget",
      { title: "Shop Items", showPrices: true }
    ),

    // Subscription section header
    makeText(
      "b6666666-6666-4666-a666-666666666666",
      { x: 100, y: 520 }, { width: 400, height: 40 },
      3, "Subscription Header",
      "Support My Work - Subscribe!",
      28, 700, "#333333"
    ),

    // Subscribe Widget - shows subscription tiers
    makeWidget(
      "c2222222-2222-4222-a222-222222222222",
      "sn.builtin.subscribe",
      "c2222222-2222-4222-a222-222222222223",
      { x: 100, y: 570 }, { width: 600, height: 300 },
      11, "Subscribe Widget",
      { title: "Subscription Tiers" }
    )
  ];

  console.log('[seed-shop] Created entities:', entities.length);

  // Update canvas index
  var idx = JSON.parse(localStorage.getItem("sn:canvas:index") || '{"items":[]}');
  idx.items = idx.items.filter(function(i) { return i.slug !== slug; });
  idx.items.push({ id: canvasId, slug: slug, name: "Alice's Art Shop", createdAt: now, updatedAt: now });
  localStorage.setItem("sn:canvas:index", JSON.stringify(idx));

  // Create canvas document
  var doc = {
    version: 1,
    meta: {
      id: canvasId,
      name: "Alice's Art Shop",
      createdAt: now,
      updatedAt: now
    },
    viewport: {
      background: { type: "solid", color: "#fff5f5", opacity: 1 },
      isPreviewMode: false
    },
    entities: entities,
    layoutMode: "freeform",
    platform: "web",
    spatialMode: "2d"
  };

  localStorage.setItem("sn:canvas:" + slug, JSON.stringify(doc));

  console.log('[seed-shop] Saved canvas with widgets!');
  console.log('[seed-shop] Widgets added:');
  console.log('  - Shop Widget (sn.builtin.shop) - displays purchasable items');
  console.log('  - Subscribe Widget (sn.builtin.subscribe) - displays subscription tiers');
  console.log('');
  console.log('[seed-shop] NOTE: For the widgets to show data, you need:');
  console.log('  1. Supabase tables set up (run supabase/remote-setup.sql)');
  console.log('  2. Commerce seed data in the database');
  console.log('');
  console.log('[seed-shop] Refresh and go to /canvas/alice-art-shop');
})();
