/**
 * Built-in Widget HTML Templates
 *
 * Single-file HTML sources for built-in widgets keyed by widget ID.
 * These use the same SDK interface as third-party sandboxed widgets.
 *
 * @module runtime/widgets
 * @layer L3
 */

export const BUILT_IN_WIDGET_HTML: Record<string, string> = {
  'wgt-clock': `
    <div id="clock" style="display:flex;align-items:center;justify-content:center;height:100%;font-family:system-ui;font-size:2em;color:var(--sn-text,#1a1a2e);">
      <span id="time">--:--:--</span>
    </div>
    <script>
      function updateClock() {
        document.getElementById('time').textContent = new Date().toLocaleTimeString();
      }
      setInterval(updateClock, 1000);
      updateClock();
      StickerNest.register({ id: 'wgt-clock', name: 'Clock', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,

  'wgt-note': `
    <div style="padding:12px;height:100%;background:var(--sn-surface,#fffde7);font-family:system-ui;font-size:14px;">
      <div contenteditable="true" style="outline:none;height:100%;color:var(--sn-text,#1a1a2e);">Type here...</div>
    </div>
    <script>
      StickerNest.register({ id: 'wgt-note', name: 'Sticky Note', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,

  'wgt-counter': `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-family:system-ui;gap:12px;">
      <span id="count" style="font-size:3em;font-weight:bold;color:var(--sn-text,#1a1a2e);">0</span>
      <div style="display:flex;gap:8px;">
        <button id="dec" style="padding:8px 16px;border:1px solid var(--sn-border,#e0e0e0);border-radius:6px;background:var(--sn-surface,#fff);cursor:pointer;font-size:1.2em;">-</button>
        <button id="inc" style="padding:8px 16px;border:1px solid var(--sn-border,#e0e0e0);border-radius:6px;background:var(--sn-surface,#fff);cursor:pointer;font-size:1.2em;">+</button>
      </div>
    </div>
    <script>
      var count = 0;
      var el = document.getElementById('count');
      document.getElementById('inc').onclick = function() { count++; el.textContent = count; };
      document.getElementById('dec').onclick = function() { count--; el.textContent = count; };
      StickerNest.register({ id: 'wgt-counter', name: 'Counter', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,

  // ===========================================================================
  // Commerce Widgets — signup, subscribe, and shop
  // These use StickerNest.integration('auth') and StickerNest.integration('checkout')
  // to proxy all backend calls through the host bridge.
  // ===========================================================================

  'wgt-signup': `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--sn-font-family, system-ui); color: var(--sn-text, #1a1a2e); }
      .signup-root { padding: 20px; height: 100%; display: flex; flex-direction: column; justify-content: center; max-width: 360px; margin: 0 auto; }
      h2 { font-size: 1.3em; margin-bottom: 16px; text-align: center; }
      .form-group { margin-bottom: 12px; }
      label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: var(--sn-text-muted, #6b7280); }
      input { width: 100%; padding: 8px 12px; border: 1px solid var(--sn-border, #e5e7eb); border-radius: var(--sn-radius, 6px); font-size: 14px; background: var(--sn-surface, #fff); color: var(--sn-text, #1a1a2e); }
      .btn { width: 100%; padding: 10px; border: none; border-radius: var(--sn-radius, 6px); font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 4px; }
      .btn-primary { background: var(--sn-accent, #6366f1); color: #fff; }
      .btn-secondary { background: transparent; border: 1px solid var(--sn-border, #e5e7eb); color: var(--sn-text, #1a1a2e); margin-top: 8px; }
      .error { color: #ef4444; font-size: 12px; margin-top: 4px; }
      .success { color: #22c55e; font-size: 13px; text-align: center; margin-top: 12px; }
      .toggle { font-size: 13px; text-align: center; margin-top: 12px; color: var(--sn-accent, #6366f1); cursor: pointer; }
      .signed-in { text-align: center; padding: 20px; }
      .hidden { display: none; }
    </style>
    <div class="signup-root">
      <div id="auth-form">
        <h2 id="form-title">Sign Up</h2>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" placeholder="Min 6 characters" />
        </div>
        <div id="error" class="error hidden"></div>
        <button id="submit-btn" class="btn btn-primary">Sign Up</button>
        <div id="toggle-mode" class="toggle">Already have an account? Sign in</div>
      </div>
      <div id="signed-in" class="signed-in hidden">
        <h2>Welcome!</h2>
        <p id="user-email" style="color:var(--sn-text-muted,#6b7280);margin:8px 0 16px;font-size:14px;"></p>
        <button id="signout-btn" class="btn btn-secondary">Sign Out</button>
      </div>
    </div>
    <script>
      var isSignUp = true;
      var formEl = document.getElementById('auth-form');
      var signedInEl = document.getElementById('signed-in');
      var titleEl = document.getElementById('form-title');
      var emailInput = document.getElementById('email');
      var passwordInput = document.getElementById('password');
      var submitBtn = document.getElementById('submit-btn');
      var toggleEl = document.getElementById('toggle-mode');
      var errorEl = document.getElementById('error');
      var userEmailEl = document.getElementById('user-email');
      var signoutBtn = document.getElementById('signout-btn');

      function showError(msg) {
        errorEl.textContent = msg;
        errorEl.classList.remove('hidden');
      }
      function clearError() {
        errorEl.classList.add('hidden');
      }

      // Check if already signed in
      StickerNest.integration('auth').query({ action: 'session' }).then(function(result) {
        if (result && result.isAuthenticated) {
          showSignedIn(result.user);
        }
      });

      function showSignedIn(user) {
        formEl.classList.add('hidden');
        signedInEl.classList.remove('hidden');
        userEmailEl.textContent = user.email || '';
      }

      toggleEl.onclick = function() {
        isSignUp = !isSignUp;
        titleEl.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        toggleEl.textContent = isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up';
        clearError();
      };

      submitBtn.onclick = function() {
        clearError();
        var email = emailInput.value.trim();
        var password = passwordInput.value;
        if (!email || !password) { showError('Email and password required'); return; }
        if (password.length < 6) { showError('Password must be at least 6 characters'); return; }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Loading...';

        var action = isSignUp ? 'signup' : 'signin';
        StickerNest.integration('auth').mutate({ action: action, email: email, password: password })
          .then(function(result) {
            if (result.error) {
              showError(result.error);
              submitBtn.disabled = false;
              submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
            } else {
              StickerNest.emit('auth.' + (isSignUp ? 'signed_up' : 'signed_in'), { email: email });
              showSignedIn(result.user || { email: email });
            }
          })
          .catch(function(err) {
            showError(err.message || 'Something went wrong');
            submitBtn.disabled = false;
            submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
          });
      };

      signoutBtn.onclick = function() {
        StickerNest.integration('auth').mutate({ action: 'signout' }).then(function() {
          signedInEl.classList.add('hidden');
          formEl.classList.remove('hidden');
          emailInput.value = '';
          passwordInput.value = '';
          StickerNest.emit('auth.signed_out', {});
        });
      };

      StickerNest.register({ id: 'wgt-signup', name: 'Sign Up', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,

  'wgt-subscribe': `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--sn-font-family, system-ui); color: var(--sn-text, #1a1a2e); }
      .sub-root { padding: 20px; height: 100%; overflow-y: auto; }
      h2 { font-size: 1.2em; margin-bottom: 16px; }
      .tiers { display: flex; flex-direction: column; gap: 12px; }
      .tier-card { border: 1px solid var(--sn-border, #e5e7eb); border-radius: var(--sn-radius, 8px); padding: 16px; background: var(--sn-surface, #fff); }
      .tier-card.active { border-color: var(--sn-accent, #6366f1); }
      .tier-name { font-weight: 600; font-size: 16px; }
      .tier-price { font-size: 24px; font-weight: 700; margin: 4px 0; }
      .tier-price span { font-size: 13px; font-weight: 400; color: var(--sn-text-muted, #6b7280); }
      .tier-desc { font-size: 13px; color: var(--sn-text-muted, #6b7280); margin-bottom: 8px; }
      .tier-benefits { list-style: none; padding: 0; margin: 0 0 12px; }
      .tier-benefits li { font-size: 12px; padding: 2px 0; }
      .btn { padding: 8px 16px; border: none; border-radius: var(--sn-radius, 6px); font-size: 13px; font-weight: 600; cursor: pointer; width: 100%; }
      .btn-accent { background: var(--sn-accent, #6366f1); color: #fff; }
      .btn-muted { background: var(--sn-border, #e5e7eb); color: var(--sn-text-muted, #6b7280); cursor: default; }
      .loading { text-align: center; padding: 40px; color: var(--sn-text-muted, #6b7280); }
    </style>
    <div class="sub-root">
      <h2>Subscription Tiers</h2>
      <div id="loading" class="loading">Loading tiers...</div>
      <div id="tiers" class="tiers" style="display:none;"></div>
    </div>
    <script>
      var tiersEl = document.getElementById('tiers');
      var loadingEl = document.getElementById('loading');
      var currentSub = null;

      function formatPrice(cents, currency) {
        return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency || 'usd' });
      }

      function renderTiers(tiers, mySub) {
        loadingEl.style.display = 'none';
        tiersEl.style.display = 'flex';
        tiersEl.innerHTML = '';

        tiers.sort(function(a, b) { return a.sort_order - b.sort_order; });

        tiers.forEach(function(tier) {
          var isActive = mySub && mySub.tier_id === tier.id;
          var card = document.createElement('div');
          card.className = 'tier-card' + (isActive ? ' active' : '');

          var benefits = (tier.benefits || []).map(function(b) { return '<li>' + b + '</li>'; }).join('');
          var priceLabel = tier.price_cents === 0 ? 'Free' : formatPrice(tier.price_cents, tier.currency);
          var intervalLabel = tier.price_cents > 0 ? '<span>/' + (tier.interval || 'month') + '</span>' : '';

          card.innerHTML =
            '<div class="tier-name">' + tier.name + '</div>' +
            '<div class="tier-price">' + priceLabel + intervalLabel + '</div>' +
            (tier.description ? '<div class="tier-desc">' + tier.description + '</div>' : '') +
            (benefits ? '<ul class="tier-benefits">' + benefits + '</ul>' : '') +
            '<button class="btn ' + (isActive ? 'btn-muted' : 'btn-accent') + '" data-tier-id="' + tier.id + '" ' + (isActive ? 'disabled' : '') + '>' +
            (isActive ? 'Current' : tier.price_cents === 0 ? 'Select Free' : 'Subscribe') +
            '</button>';

          tiersEl.appendChild(card);
        });

        // Attach click handlers
        tiersEl.querySelectorAll('button[data-tier-id]').forEach(function(btn) {
          btn.onclick = function() {
            var tierId = btn.getAttribute('data-tier-id');
            btn.disabled = true;
            btn.textContent = 'Loading...';
            StickerNest.integration('checkout').mutate({ action: 'subscribe', tierId: tierId })
              .then(function(result) {
                if (result.url) {
                  window.open(result.url, '_top');
                } else if (result.free) {
                  btn.textContent = 'Subscribed!';
                  btn.className = 'btn btn-muted';
                }
              })
              .catch(function() {
                btn.disabled = false;
                btn.textContent = 'Subscribe';
              });
          };
        });
      }

      // Load tiers and current subscription
      var config = StickerNest.getConfig();
      Promise.all([
        StickerNest.integration('checkout').query({ action: 'tiers' }),
        StickerNest.integration('checkout').query({ action: 'my_subscription' }),
      ]).then(function(results) {
        renderTiers(results[0] || [], results[1]);
      }).catch(function() {
        loadingEl.textContent = 'Failed to load tiers.';
      });

      StickerNest.register({ id: 'wgt-subscribe', name: 'Subscribe', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,

  'wgt-shop': `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--sn-font-family, system-ui); color: var(--sn-text, #1a1a2e); }
      .shop-root { padding: 20px; height: 100%; overflow-y: auto; }
      h2 { font-size: 1.2em; margin-bottom: 16px; }
      .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
      .item-card { border: 1px solid var(--sn-border, #e5e7eb); border-radius: var(--sn-radius, 8px); overflow: hidden; background: var(--sn-surface, #fff); }
      .item-img { width: 100%; aspect-ratio: 1; object-fit: cover; background: var(--sn-border, #f3f4f6); }
      .item-info { padding: 10px; }
      .item-name { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
      .item-price { font-size: 16px; font-weight: 700; color: var(--sn-accent, #6366f1); }
      .item-type { font-size: 11px; color: var(--sn-text-muted, #6b7280); text-transform: uppercase; margin-bottom: 6px; }
      .item-shipping { font-size: 11px; color: var(--sn-text-muted, #6b7280); margin-bottom: 6px; }
      .btn { padding: 6px 12px; border: none; border-radius: var(--sn-radius, 6px); font-size: 12px; font-weight: 600; cursor: pointer; width: 100%; background: var(--sn-accent, #6366f1); color: #fff; }
      .btn:disabled { background: var(--sn-border, #d1d5db); cursor: default; }
      .empty { text-align: center; padding: 40px; color: var(--sn-text-muted, #6b7280); font-size: 14px; }
      .loading { text-align: center; padding: 40px; color: var(--sn-text-muted, #6b7280); }
    </style>
    <div class="shop-root">
      <h2>Shop</h2>
      <div id="loading" class="loading">Loading items...</div>
      <div id="items" class="items-grid" style="display:none;"></div>
      <div id="empty" class="empty" style="display:none;">No items available.</div>
    </div>
    <script>
      var itemsEl = document.getElementById('items');
      var loadingEl = document.getElementById('loading');
      var emptyEl = document.getElementById('empty');

      function formatPrice(cents, currency) {
        return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency || 'usd' });
      }

      StickerNest.integration('checkout').query({ action: 'shop_items' })
        .then(function(items) {
          loadingEl.style.display = 'none';
          if (!items || items.length === 0) {
            emptyEl.style.display = 'block';
            return;
          }
          itemsEl.style.display = 'grid';

          items.forEach(function(item) {
            var card = document.createElement('div');
            card.className = 'item-card';

            var imgHtml = item.thumbnail_url
              ? '<img class="item-img" src="' + item.thumbnail_url + '" alt="' + item.name + '" />'
              : '<div class="item-img"></div>';

            var shippingNote = item.requires_shipping && item.shipping_note
              ? '<div class="item-shipping">' + item.shipping_note + '</div>'
              : '';

            var stockLabel = item.stock_count !== null && item.stock_count <= 0
              ? '<button class="btn" disabled>Sold Out</button>'
              : '<button class="btn buy-btn" data-item-id="' + item.id + '">Buy ' + formatPrice(item.price_cents, item.currency) + '</button>';

            card.innerHTML = imgHtml +
              '<div class="item-info">' +
                '<div class="item-name">' + item.name + '</div>' +
                '<div class="item-type">' + item.item_type + '</div>' +
                shippingNote +
                '<div class="item-price">' + formatPrice(item.price_cents, item.currency) + '</div>' +
                stockLabel +
              '</div>';

            itemsEl.appendChild(card);
          });

          // Buy button handlers
          itemsEl.querySelectorAll('.buy-btn').forEach(function(btn) {
            btn.onclick = function() {
              var itemId = btn.getAttribute('data-item-id');
              btn.disabled = true;
              btn.textContent = 'Loading...';
              StickerNest.integration('checkout').mutate({ action: 'buy', itemId: itemId })
                .then(function(result) {
                  if (result.url) {
                    window.open(result.url, '_top');
                  }
                })
                .catch(function() {
                  btn.disabled = false;
                  btn.textContent = 'Buy';
                });
            };
          });
        })
        .catch(function() {
          loadingEl.textContent = 'Failed to load items.';
        });

      StickerNest.register({ id: 'wgt-shop', name: 'Shop', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,
};
