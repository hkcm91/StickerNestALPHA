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
      .btn:focus-visible { outline: 2px solid var(--sn-accent, #6366f1); outline-offset: 2px; }
      input:focus-visible { outline: 2px solid var(--sn-accent, #6366f1); outline-offset: 1px; }
      .btn { transition: background 0.15s ease, opacity 0.15s ease; }
      .btn:disabled { opacity: 0.6; }
      .signup-root { animation: fadeIn 0.2s ease; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    </style>
    <div class="signup-root" role="region" aria-label="Authentication">
      <div id="auth-form" role="form" aria-labelledby="form-title">
        <h2 id="form-title">Sign Up</h2>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" placeholder="you@example.com" autocomplete="email" aria-required="true" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" placeholder="Min 8 characters" autocomplete="new-password" aria-required="true" aria-describedby="error" />
        </div>
        <div id="error" class="error hidden" role="alert" aria-live="polite"></div>
        <button id="submit-btn" class="btn btn-primary" type="button">Sign Up</button>
        <div id="toggle-mode" class="toggle" role="button" tabindex="0">Already have an account? Sign in</div>
      </div>
      <div id="signed-in" class="signed-in hidden" role="status">
        <h2>Welcome!</h2>
        <p id="user-email" style="color:var(--sn-text-muted,#6b7280);margin:8px 0 16px;font-size:14px;"></p>
        <button id="signout-btn" class="btn btn-secondary" type="button">Sign Out</button>
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

      function toggleMode() {
        isSignUp = !isSignUp;
        titleEl.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        toggleEl.textContent = isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up';
        passwordInput.setAttribute('autocomplete', isSignUp ? 'new-password' : 'current-password');
        clearError();
      }
      toggleEl.onclick = toggleMode;
      toggleEl.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMode(); } };

      // Allow Enter key to submit form
      passwordInput.onkeydown = function(e) { if (e.key === 'Enter') submitBtn.click(); };
      emailInput.onkeydown = function(e) { if (e.key === 'Enter') passwordInput.focus(); };

      submitBtn.onclick = function() {
        clearError();
        var email = emailInput.value.trim();
        var password = passwordInput.value;
        if (!email || !password) { showError('Email and password required'); return; }
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) { showError('Please enter a valid email address'); return; }
        if (password.length < 8) { showError('Password must be at least 8 characters'); return; }
        if (!/[A-Z]/.test(password)) { showError('Password must contain at least one uppercase letter'); return; }
        if (!/[0-9]/.test(password)) { showError('Password must contain at least one number'); return; }
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
      .btn-manage { margin-top: 6px; padding: 6px 12px; border: 1px solid var(--sn-accent, #6366f1); border-radius: var(--sn-radius, 6px); background: transparent; color: var(--sn-accent, #6366f1); font-size: 12px; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.15s ease; }
      .btn-manage:hover { background: rgba(99,102,241,0.08); }
      .btn-manage:focus-visible { outline: 2px solid var(--sn-accent, #6366f1); outline-offset: 2px; }
      .btn-manage:disabled { opacity: 0.6; cursor: default; }
      .loading { text-align: center; padding: 40px; color: var(--sn-text-muted, #6b7280); }
      .empty { text-align: center; padding: 40px; color: var(--sn-text-muted, #6b7280); font-size: 14px; }
      .error-toast { background: #fee2e2; color: #dc2626; padding: 8px 12px; border-radius: var(--sn-radius, 6px); font-size: 13px; margin-bottom: 12px; display: none; }
      .success-toast { background: #dcfce7; color: #16a34a; padding: 10px 14px; border-radius: var(--sn-radius, 6px); font-size: 13px; margin-bottom: 12px; display: none; text-align: center; }
      .btn { transition: background 0.15s ease, opacity 0.15s ease; }
      .btn:disabled { opacity: 0.6; }
      .btn:focus-visible { outline: 2px solid var(--sn-accent, #6366f1); outline-offset: 2px; }
      .tier-card { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
      .tier-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
      .tiers { animation: fadeIn 0.2s ease; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      .skeleton { background: linear-gradient(90deg, var(--sn-border, #e5e7eb) 25%, #f3f4f6 50%, var(--sn-border, #e5e7eb) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--sn-radius, 8px); }
      @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      .skeleton-card { border: 1px solid var(--sn-border, #e5e7eb); border-radius: var(--sn-radius, 8px); padding: 16px; background: var(--sn-surface, #fff); margin-bottom: 12px; }
    </style>
    <div class="sub-root" role="region" aria-label="Subscription Tiers">
      <h2 id="sub-heading">Subscription Tiers</h2>
      <div id="success-toast" class="success-toast" role="status" aria-live="polite"></div>
      <div id="error-toast" class="error-toast" role="alert" aria-live="polite"></div>
      <div id="loading" class="loading" role="status" aria-live="polite" aria-label="Loading subscription tiers"><div class="skeleton-card"><div class="skeleton" style="height:16px;width:60%;margin-bottom:10px"></div><div class="skeleton" style="height:24px;width:40%;margin-bottom:10px"></div><div class="skeleton" style="height:36px;width:100%"></div></div><div class="skeleton-card"><div class="skeleton" style="height:16px;width:60%;margin-bottom:10px"></div><div class="skeleton" style="height:24px;width:40%;margin-bottom:10px"></div><div class="skeleton" style="height:36px;width:100%"></div></div><div class="skeleton-card"><div class="skeleton" style="height:16px;width:60%;margin-bottom:10px"></div><div class="skeleton" style="height:24px;width:40%;margin-bottom:10px"></div><div class="skeleton" style="height:36px;width:100%"></div></div></div>
      <div id="empty" class="empty" style="display:none;" role="status">No subscription tiers available yet.</div>
      <div id="tiers" class="tiers" style="display:none;" role="list" aria-labelledby="sub-heading"></div>
    </div>
    <script>
      var tiersEl = document.getElementById('tiers');
      var loadingEl = document.getElementById('loading');
      var emptyEl = document.getElementById('empty');
      var errorToast = document.getElementById('error-toast');
      var successToast = document.getElementById('success-toast');
      var currentSub = null;

      function showToast(msg) {
        errorToast.textContent = msg;
        errorToast.style.display = 'block';
        setTimeout(function() { errorToast.style.display = 'none'; }, 5000);
      }

      function showSuccess(msg) {
        successToast.textContent = msg;
        successToast.style.display = 'block';
        setTimeout(function() { successToast.style.display = 'none'; }, 6000);
      }

      // Detect return from Stripe checkout via config
      var cfg = StickerNest.getConfig();
      if (cfg.subscribed) { showSuccess('Subscription successful! Welcome aboard.'); }
      if (cfg.canceled) { showToast('Checkout was canceled.'); }

      function formatPrice(cents, currency) {
        return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency || 'usd' });
      }

      function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

      function renderTiers(tiers, mySub) {
        loadingEl.style.display = 'none';
        if (!tiers || tiers.length === 0) {
          emptyEl.style.display = 'block';
          tiersEl.style.display = 'none';
          return;
        }
        emptyEl.style.display = 'none';
        tiersEl.style.display = 'flex';
        tiersEl.innerHTML = '';

        tiers.sort(function(a, b) { return a.sort_order - b.sort_order; });

        tiers.forEach(function(tier) {
          var isActive = mySub && mySub.tier_id === tier.id;
          var card = document.createElement('div');
          card.className = 'tier-card' + (isActive ? ' active' : '');
          card.setAttribute('role', 'listitem');

          var benefits = (tier.benefits || []).map(function(b) { return '<li>' + esc(b) + '</li>'; }).join('');
          var priceLabel = tier.price_cents === 0 ? 'Free' : formatPrice(tier.price_cents, tier.currency);
          var intervalLabel = tier.price_cents > 0 ? '<span>/' + esc(tier.interval || 'month') + '</span>' : '';

          var manageBtn = isActive
            ? '<button class="btn-manage" id="btn-manage-sub" aria-label="Manage subscription">Manage Subscription</button>'
            : '';

          card.innerHTML =
            '<div class="tier-name">' + esc(tier.name) + '</div>' +
            '<div class="tier-price">' + priceLabel + intervalLabel + '</div>' +
            (tier.description ? '<div class="tier-desc">' + esc(tier.description) + '</div>' : '') +
            (benefits ? '<ul class="tier-benefits">' + benefits + '</ul>' : '') +
            '<button class="btn ' + (isActive ? 'btn-muted' : 'btn-accent') + '" data-tier-id="' + tier.id + '" ' + (isActive ? 'disabled' : '') + '>' +
            (isActive ? 'Current' : tier.price_cents === 0 ? 'Select Free' : 'Subscribe') +
            '</button>' + manageBtn;

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
                if (result.error) {
                  showToast(result.error);
                  btn.disabled = false;
                  btn.textContent = 'Subscribe';
                } else if (result.url) {
                  window.open(result.url, '_top');
                } else if (result.free) {
                  btn.textContent = 'Subscribed!';
                  btn.className = 'btn btn-muted';
                }
              })
              .catch(function(err) {
                showToast(err.message || 'Subscription failed. Please try again.');
                btn.disabled = false;
                btn.textContent = 'Subscribe';
              });
          };
        });

        // Manage Subscription button handler
        var manageBtn = document.getElementById('btn-manage-sub');
        if (manageBtn) {
          manageBtn.onclick = function() {
            manageBtn.disabled = true;
            manageBtn.textContent = 'Loading...';
            StickerNest.integration('checkout').mutate({ action: 'customer_portal' })
              .then(function(result) {
                if (result.url) {
                  window.open(result.url, '_blank');
                  manageBtn.disabled = false;
                  manageBtn.textContent = 'Manage Subscription';
                } else {
                  showToast(result.error || 'Failed to open customer portal.');
                  manageBtn.disabled = false;
                  manageBtn.textContent = 'Manage Subscription';
                }
              })
              .catch(function(err) {
                showToast(err.message || 'Failed to open customer portal.');
                manageBtn.disabled = false;
                manageBtn.textContent = 'Manage Subscription';
              });
          };
        }
      }

      function loadAll() {
        loadingEl.style.display = 'block';
        tiersEl.style.display = 'none';
        emptyEl.style.display = 'none';
        Promise.all([
          StickerNest.integration('checkout').query({ action: 'tiers' }),
          StickerNest.integration('checkout').query({ action: 'my_subscription' }),
        ]).then(function(results) {
          renderTiers(results[0] || [], results[1]);
        }).catch(function() {
          loadingEl.textContent = 'Failed to load tiers.';
        });
      }

      // Initial load
      loadAll();

      // Refresh when tiers change or auth state changes
      StickerNest.subscribe('commerce.tier.created', function() { loadAll(); });
      StickerNest.subscribe('commerce.tier.updated', function() { loadAll(); });
      StickerNest.subscribe('commerce.tier.deleted', function() { loadAll(); });
      StickerNest.subscribe('auth.signed_in', function() { loadAll(); });
      StickerNest.subscribe('auth.signed_up', function() { loadAll(); });
      StickerNest.subscribe('auth.signed_out', function() { loadAll(); });

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
      .error-toast { background: #fee2e2; color: #dc2626; padding: 8px 12px; border-radius: var(--sn-radius, 6px); font-size: 13px; margin-bottom: 12px; display: none; }
      .success-toast { background: #dcfce7; color: #16a34a; padding: 10px 14px; border-radius: var(--sn-radius, 6px); font-size: 13px; margin-bottom: 12px; display: none; text-align: center; }
      .btn { transition: background 0.15s ease, opacity 0.15s ease; }
      .btn:focus-visible { outline: 2px solid var(--sn-accent, #6366f1); outline-offset: 2px; }
      .item-card { transition: box-shadow 0.15s ease, transform 0.15s ease; }
      .item-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); transform: translateY(-1px); }
      .items-grid { animation: fadeIn 0.2s ease; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      .skeleton { background: linear-gradient(90deg, var(--sn-border, #e5e7eb) 25%, #f3f4f6 50%, var(--sn-border, #e5e7eb) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--sn-radius, 8px); }
      @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      .skeleton-card { border: 1px solid var(--sn-border, #e5e7eb); border-radius: var(--sn-radius, 8px); overflow: hidden; background: var(--sn-surface, #fff); }
      .skeleton-img { width: 100%; aspect-ratio: 1; }
      .skeleton-info { padding: 10px; }
    </style>
    <div class="shop-root" role="region" aria-label="Shop">
      <h2 id="shop-heading">Shop</h2>
      <div id="success-toast" class="success-toast" role="status" aria-live="polite"></div>
      <div id="error-toast" class="error-toast" role="alert" aria-live="polite"></div>
      <div id="loading" class="loading" role="status" aria-live="polite" aria-label="Loading shop items"><div class="items-grid" style="display:grid"><div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton-info"><div class="skeleton" style="height:14px;width:70%;margin-bottom:8px"></div><div class="skeleton" style="height:16px;width:40%;margin-bottom:8px"></div><div class="skeleton" style="height:30px;width:100%"></div></div></div><div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton-info"><div class="skeleton" style="height:14px;width:70%;margin-bottom:8px"></div><div class="skeleton" style="height:16px;width:40%;margin-bottom:8px"></div><div class="skeleton" style="height:30px;width:100%"></div></div></div><div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton-info"><div class="skeleton" style="height:14px;width:70%;margin-bottom:8px"></div><div class="skeleton" style="height:16px;width:40%;margin-bottom:8px"></div><div class="skeleton" style="height:30px;width:100%"></div></div></div></div></div>
      <div id="items" class="items-grid" style="display:none;" role="list" aria-labelledby="shop-heading"></div>
      <div id="empty" class="empty" style="display:none;" role="status">No items available.</div>
    </div>
    <script>
      var itemsEl = document.getElementById('items');
      var loadingEl = document.getElementById('loading');
      var emptyEl = document.getElementById('empty');
      var shopErrorToast = document.getElementById('error-toast');
      var shopSuccessToast = document.getElementById('success-toast');

      function showShopToast(msg) {
        shopErrorToast.textContent = msg;
        shopErrorToast.style.display = 'block';
        setTimeout(function() { shopErrorToast.style.display = 'none'; }, 5000);
      }

      function showShopSuccess(msg) {
        shopSuccessToast.textContent = msg;
        shopSuccessToast.style.display = 'block';
        setTimeout(function() { shopSuccessToast.style.display = 'none'; }, 6000);
      }

      // Detect return from Stripe checkout via config
      var shopCfg = StickerNest.getConfig();
      if (shopCfg.purchased) { showShopSuccess('Purchase successful! Check My Orders for details.'); }

      function formatPrice(cents, currency) {
        return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency || 'usd' });
      }

      function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

      function loadShopItems() {
        loadingEl.style.display = 'block';
        itemsEl.style.display = 'none';
        emptyEl.style.display = 'none';

        StickerNest.integration('checkout').query({ action: 'shop_items' })
          .then(function(result) {
            // Handle both paginated { data, total } and raw array responses
            var items = Array.isArray(result) ? result : (result && result.data ? result.data : []);
            loadingEl.style.display = 'none';
            if (!items || items.length === 0) {
              emptyEl.style.display = 'block';
              return;
            }
            itemsEl.style.display = 'grid';
            itemsEl.innerHTML = '';

            items.forEach(function(item) {
              var card = document.createElement('div');
              card.className = 'item-card';
              card.setAttribute('role', 'listitem');

              var imgHtml = item.thumbnail_url
                ? '<img class="item-img" src="' + item.thumbnail_url + '" alt="' + esc(item.name) + '" />'
                : '<div class="item-img"></div>';

              var shippingNote = item.requires_shipping && item.shipping_note
                ? '<div class="item-shipping">' + esc(item.shipping_note) + '</div>'
                : '';

              var stockLabel = item.stock_count !== null && item.stock_count <= 0
                ? '<button class="btn" disabled>Sold Out</button>'
                : '<button class="btn buy-btn" data-item-id="' + item.id + '">Buy ' + formatPrice(item.price_cents, item.currency) + '</button>';

              card.innerHTML = imgHtml +
                '<div class="item-info">' +
                  '<div class="item-name">' + esc(item.name) + '</div>' +
                  '<div class="item-type">' + esc(item.item_type) + '</div>' +
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
                    if (result.error) {
                      showShopToast(result.error);
                      btn.disabled = false;
                      btn.textContent = 'Buy';
                    } else if (result.url) {
                      window.open(result.url, '_top');
                    }
                  })
                  .catch(function(err) {
                    showShopToast(err.message || 'Purchase failed. Please try again.');
                    btn.disabled = false;
                    btn.textContent = 'Buy';
                  });
              };
            });
          })
          .catch(function() {
            loadingEl.textContent = 'Failed to load items.';
          });
      }

      // Initial load
      loadShopItems();

      // Refresh when items change or auth state changes
      StickerNest.subscribe('commerce.item.created', function() { loadShopItems(); });
      StickerNest.subscribe('commerce.item.updated', function() { loadShopItems(); });
      StickerNest.subscribe('commerce.item.deleted', function() { loadShopItems(); });
      StickerNest.subscribe('auth.signed_in', function() { loadShopItems(); });
      StickerNest.subscribe('auth.signed_up', function() { loadShopItems(); });
      StickerNest.subscribe('auth.signed_out', function() { loadShopItems(); });

      StickerNest.register({ id: 'wgt-shop', name: 'Shop', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,

  // ===========================================================================
  // Creator Management Widgets — multi-page forms for managing commerce
  // ===========================================================================

  'wgt-creator-setup': `
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:var(--sn-font-family,system-ui);color:var(--sn-text,#1a1a2e)}
      .root{padding:24px;height:100%;overflow-y:auto;max-width:480px;margin:0 auto}
      h2{font-size:1.3em;margin-bottom:8px}
      .subtitle{font-size:13px;color:var(--sn-text-muted,#6b7280);margin-bottom:20px}
      .page{display:none}.page.active{display:block}
      .status-card{border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,8px);padding:20px;background:var(--sn-surface,#fff);margin-bottom:16px}
      .status-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--sn-border,#f3f4f6)}
      .status-row:last-child{border-bottom:none}
      .status-label{font-size:13px;color:var(--sn-text-muted,#6b7280)}
      .status-val{font-size:13px;font-weight:600}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
      .badge-green{background:#dcfce7;color:#16a34a}
      .badge-yellow{background:#fef9c3;color:#a16207}
      .badge-red{background:#fee2e2;color:#dc2626}
      .steps{display:flex;gap:8px;margin-bottom:24px}
      .step-dot{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;border:2px solid var(--sn-border,#e5e7eb);color:var(--sn-text-muted,#6b7280)}
      .step-dot.done{background:var(--sn-accent,#6366f1);border-color:var(--sn-accent,#6366f1);color:#fff}
      .step-dot.current{border-color:var(--sn-accent,#6366f1);color:var(--sn-accent,#6366f1)}
      .step-line{flex:1;height:2px;background:var(--sn-border,#e5e7eb);align-self:center}
      .step-line.done{background:var(--sn-accent,#6366f1)}
      .btn{width:100%;padding:10px;border:none;border-radius:var(--sn-radius,6px);font-size:14px;font-weight:600;cursor:pointer;margin-top:8px}
      .btn-primary{background:var(--sn-accent,#6366f1);color:#fff}
      .btn-secondary{background:transparent;border:1px solid var(--sn-border,#e5e7eb);color:var(--sn-text,#1a1a2e)}
      .btn:disabled{opacity:.5;cursor:default}
      .check-list{list-style:none;padding:0;margin:16px 0}
      .check-list li{padding:8px 0;font-size:14px;display:flex;align-items:center;gap:8px}
      .check-icon{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px}
      .check-yes{background:#dcfce7;color:#16a34a}
      .check-no{background:#fee2e2;color:#dc2626}
      .info-box{background:var(--sn-surface,#f9fafb);border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,6px);padding:16px;margin:16px 0;font-size:13px;line-height:1.6}
      .error{color:#ef4444;font-size:12px;margin-top:8px}
      .loading{text-align:center;padding:40px;color:var(--sn-text-muted,#6b7280)}
      .btn{transition:background 0.15s ease,opacity 0.15s ease}
      .btn:disabled{opacity:.5;cursor:default}
      .btn:focus-visible{outline:2px solid var(--sn-accent,#6366f1);outline-offset:2px}
      .page.active{animation:fadeIn 0.2s ease}
      @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      .success-banner{background:#dcfce7;color:#16a34a;padding:10px 14px;border-radius:var(--sn-radius,6px);font-size:13px;margin-bottom:12px;text-align:center;display:none}
    </style>
    <div class="root" role="region" aria-label="Creator Setup">
      <div id="loading" class="loading" role="status" aria-live="polite">Checking account status...</div>
      <div id="success-banner" class="success-banner" role="status" aria-live="polite"></div>

      <!-- Page 1: Status overview -->
      <div id="page-status" class="page" role="region" aria-label="Account Status">
        <h2>Creator Setup</h2>
        <p class="subtitle">Connect with Stripe to start selling on your canvas</p>
        <div id="steps-bar" class="steps"></div>
        <div id="status-content"></div>
      </div>

      <!-- Page 2: Onboarding info -->
      <div id="page-onboard" class="page" role="region" aria-label="Connect with Stripe">
        <h2>Connect with Stripe</h2>
        <p class="subtitle">Stripe handles all payments securely — you never touch card details</p>
        <div class="info-box">
          <strong>What happens next:</strong><br/>
          1. You will be redirected to Stripe<br/>
          2. Complete identity verification<br/>
          3. Add your bank account for payouts<br/>
          4. Return here when done
        </div>
        <ul class="check-list">
          <li><span class="check-icon check-yes">&#10003;</span> No monthly fees</li>
          <li><span class="check-icon check-yes">&#10003;</span> Get paid directly to your bank</li>
          <li><span class="check-icon check-yes">&#10003;</span> Set your own prices</li>
          <li><span class="check-icon check-yes">&#10003;</span> Platform handles taxes and compliance</li>
        </ul>
        <button id="btn-onboard" class="btn btn-primary">Connect with Stripe</button>
        <button id="btn-back-status" class="btn btn-secondary">Back</button>
        <div id="onboard-error" class="error" style="display:none"></div>
      </div>

      <!-- Page 3: Complete / Dashboard -->
      <div id="page-complete" class="page" role="region" aria-label="Setup Complete">
        <h2 style="color:#16a34a">You are all set!</h2>
        <p class="subtitle">Your Stripe account is connected and ready to accept payments</p>
        <div class="status-card">
          <div class="status-row"><span class="status-label">Charges</span><span class="badge badge-green">Enabled</span></div>
          <div class="status-row"><span class="status-label">Payouts</span><span id="payout-badge" class="badge badge-green">Enabled</span></div>
        </div>
        <button id="btn-dashboard" class="btn btn-primary">Open Stripe Dashboard</button>
        <div id="dashboard-error" class="error" style="display:none"></div>
        <div class="info-box" style="margin-top:16px">
          Now add Subscription Tiers and Shop Items to your canvas using the <strong>Tier Manager</strong> and <strong>Item Manager</strong> widgets.
        </div>
      </div>
    </div>
    <script>
      var checkout = StickerNest.integration('checkout');
      var pages = ['page-status','page-onboard','page-complete'];

      function showPage(id) {
        pages.forEach(function(p) {
          document.getElementById(p).classList.remove('active');
        });
        document.getElementById(id).classList.add('active');
      }

      function renderSteps(step) {
        var bar = document.getElementById('steps-bar');
        var labels = ['Account','Connect','Ready'];
        bar.innerHTML = labels.map(function(l, i) {
          var cls = i < step ? 'done' : i === step ? 'current' : '';
          var dot = '<div class="step-dot ' + cls + '">' + (i < step ? '&#10003;' : (i+1)) + '</div>';
          var line = i < labels.length - 1 ? '<div class="step-line ' + (i < step ? 'done' : '') + '"></div>' : '';
          return dot + line;
        }).join('');
      }

      function load() {
        checkout.query({ action: 'connect_status' }).then(function(s) {
          document.getElementById('loading').style.display = 'none';
          if (s.chargesEnabled) {
            renderSteps(3);
            var pb = document.getElementById('payout-badge');
            if (!s.payoutsEnabled) { pb.className = 'badge badge-yellow'; pb.textContent = 'Pending'; }
            showPage('page-complete');
          } else if (s.connected) {
            renderSteps(1);
            var html = '<div class="status-card">' +
              '<div class="status-row"><span class="status-label">Stripe Account</span><span class="badge badge-yellow">Pending verification</span></div>' +
              '</div>' +
              '<p style="font-size:13px;color:var(--sn-text-muted,#6b7280);margin-bottom:12px">Complete your Stripe onboarding to start accepting payments.</p>' +
              '<button id="btn-continue" class="btn btn-primary">Continue Onboarding</button>';
            document.getElementById('status-content').innerHTML = html;
            document.getElementById('btn-continue').onclick = function() { showPage('page-onboard'); };
            showPage('page-status');
          } else {
            renderSteps(0);
            var html2 = '<div class="info-box">You need a Stripe account to sell subscriptions and items on your canvas.</div>' +
              '<button id="btn-start" class="btn btn-primary">Get Started</button>';
            document.getElementById('status-content').innerHTML = html2;
            document.getElementById('btn-start').onclick = function() { showPage('page-onboard'); };
            showPage('page-status');
          }
        }).catch(function() {
          document.getElementById('loading').textContent = 'Failed to load account status.';
        });
      }

      document.getElementById('btn-onboard').onclick = function() {
        var btn = this;
        btn.disabled = true;
        btn.textContent = 'Redirecting...';
        document.getElementById('onboard-error').style.display = 'none';
        checkout.mutate({ action: 'connect_onboard' }).then(function(r) {
          if (r.error) {
            document.getElementById('onboard-error').textContent = r.error;
            document.getElementById('onboard-error').style.display = 'block';
            btn.disabled = false; btn.textContent = 'Connect with Stripe';
          } else if (r.url) {
            window.open(r.url, '_top');
          } else {
            StickerNest.emit('commerce.connect.completed', {});
            load();
          }
        }).catch(function(e) {
          document.getElementById('onboard-error').textContent = e.message || 'Something went wrong';
          document.getElementById('onboard-error').style.display = 'block';
          btn.disabled = false; btn.textContent = 'Connect with Stripe';
        });
      };

      document.getElementById('btn-back-status').onclick = function() { load(); };

      document.getElementById('btn-dashboard').onclick = function() {
        var btn = this;
        btn.disabled = true;
        document.getElementById('dashboard-error').style.display = 'none';
        checkout.mutate({ action: 'connect_dashboard' }).then(function(r) {
          btn.disabled = false;
          if (r.error) {
            document.getElementById('dashboard-error').textContent = r.error;
            document.getElementById('dashboard-error').style.display = 'block';
          } else if (r.url) {
            window.open(r.url, '_blank');
          }
        }).catch(function(e) {
          btn.disabled = false;
          document.getElementById('dashboard-error').textContent = e.message;
          document.getElementById('dashboard-error').style.display = 'block';
        });
      };

      // Detect return from Stripe Connect onboarding via config
      var setupCfg = StickerNest.getConfig();
      if (setupCfg.connectReturning) {
        var banner = document.getElementById('success-banner');
        banner.textContent = 'Welcome back from Stripe! Checking your account status...';
        banner.style.display = 'block';
        setTimeout(function() { banner.style.display = 'none'; }, 8000);
      }

      StickerNest.register({ id: 'wgt-creator-setup', name: 'Creator Setup', version: '1.0.0' });
      load();
      StickerNest.ready();
    </script>
  `,

  'wgt-tier-manager': `
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:var(--sn-font-family,system-ui);color:var(--sn-text,#1a1a2e)}
      .root{padding:20px;height:100%;overflow-y:auto}
      h2{font-size:1.2em;margin-bottom:4px}
      .subtitle{font-size:13px;color:var(--sn-text-muted,#6b7280);margin-bottom:16px}
      .page{display:none}.page.active{display:block}
      .tier-list{display:flex;flex-direction:column;gap:10px}
      .tier-row{border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,8px);padding:14px;background:var(--sn-surface,#fff);display:flex;justify-content:space-between;align-items:center}
      .tier-info h3{font-size:14px;font-weight:600;margin-bottom:2px}
      .tier-meta{font-size:12px;color:var(--sn-text-muted,#6b7280)}
      .tier-actions{display:flex;gap:6px;align-items:center}
      .btn-sm{padding:5px 10px;border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,4px);background:var(--sn-surface,#fff);font-size:12px;cursor:pointer;color:var(--sn-text,#1a1a2e)}
      .btn-sm:hover{background:var(--sn-border,#f3f4f6)}
      .btn-sm.danger{color:#ef4444;border-color:#fca5a5}
      .btn-sm:disabled{opacity:.4;cursor:default}
      .btn{width:100%;padding:10px;border:none;border-radius:var(--sn-radius,6px);font-size:14px;font-weight:600;cursor:pointer;margin-top:8px}
      .btn-primary{background:var(--sn-accent,#6366f1);color:#fff}
      .btn-secondary{background:transparent;border:1px solid var(--sn-border,#e5e7eb);color:var(--sn-text,#1a1a2e)}
      .btn:disabled{opacity:.5;cursor:default}
      .form-group{margin-bottom:14px}
      .form-group label{display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:var(--sn-text-muted,#6b7280)}
      .form-group input,.form-group textarea,.form-group select{width:100%;padding:8px 12px;border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,6px);font-size:14px;background:var(--sn-surface,#fff);color:var(--sn-text,#1a1a2e);font-family:inherit}
      .form-group textarea{resize:vertical;min-height:60px}
      .form-row{display:flex;gap:12px}
      .form-row .form-group{flex:1}
      .badge{display:inline-block;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:600}
      .badge-green{background:#dcfce7;color:#16a34a}
      .badge-gray{background:#f3f4f6;color:#6b7280}
      .benefit-list{margin-top:8px}
      .benefit-row{display:flex;gap:6px;margin-bottom:6px}
      .benefit-row input{flex:1}
      .benefit-row button{padding:4px 8px;border:1px solid var(--sn-border,#e5e7eb);border-radius:4px;background:var(--sn-surface,#fff);cursor:pointer;font-size:12px}
      .error{color:#ef4444;font-size:12px;margin-top:8px}
      .empty{text-align:center;padding:30px;color:var(--sn-text-muted,#6b7280);font-size:14px}
      .loading{text-align:center;padding:30px;color:var(--sn-text-muted,#6b7280)}
      .success-msg{background:#dcfce7;color:#16a34a;padding:10px;border-radius:var(--sn-radius,6px);font-size:13px;text-align:center;margin-bottom:12px;animation:successPop 0.3s ease}
      @keyframes successPop{0%{transform:scale(0.9);opacity:0}100%{transform:scale(1);opacity:1}}
      .btn{transition:background 0.15s ease,opacity 0.15s ease}
      .btn:disabled{opacity:.5;cursor:default}
      .btn:focus-visible,.btn-sm:focus-visible{outline:2px solid var(--sn-accent,#6366f1);outline-offset:2px}
      .form-group input:focus-visible,.form-group textarea:focus-visible,.form-group select:focus-visible{outline:2px solid var(--sn-accent,#6366f1);outline-offset:1px}
      .tier-row{transition:box-shadow 0.15s ease}
      .tier-row:hover{box-shadow:0 1px 6px rgba(0,0,0,0.06)}
      .page.active{animation:fadeIn 0.2s ease}
      @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      .skeleton{background:linear-gradient(90deg,var(--sn-border,#e5e7eb) 25%,#f3f4f6 50%,var(--sn-border,#e5e7eb) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:var(--sn-radius,8px)}
      @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      .skeleton-tier-row{border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,8px);padding:14px;background:var(--sn-surface,#fff);display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
      .toggle-switch{position:relative;display:inline-block;width:34px;height:18px;flex-shrink:0}
      .toggle-switch input{opacity:0;width:0;height:0;position:absolute}
      .toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:var(--sn-border,#d1d5db);border-radius:18px;transition:background 0.2s ease}
      .toggle-slider:before{content:"";position:absolute;height:14px;width:14px;left:2px;bottom:2px;background:#fff;border-radius:50%;transition:transform 0.2s ease}
      .toggle-switch input:checked+.toggle-slider{background:var(--sn-accent,#6366f1)}
      .toggle-switch input:checked+.toggle-slider:before{transform:translateX(16px)}
      .toggle-switch input:focus-visible+.toggle-slider{outline:2px solid var(--sn-accent,#6366f1);outline-offset:2px}
    </style>
    <div class="root" role="region" aria-label="Tier Manager">
      <div id="loading" class="loading" role="status" aria-live="polite" aria-label="Loading tiers"><div class="skeleton-tier-row"><div style="flex:1"><div class="skeleton" style="height:14px;width:50%;margin-bottom:8px"></div><div class="skeleton" style="height:12px;width:70%"></div></div><div style="display:flex;gap:6px"><div class="skeleton" style="height:28px;width:50px"></div><div class="skeleton" style="height:28px;width:56px"></div></div></div><div class="skeleton-tier-row"><div style="flex:1"><div class="skeleton" style="height:14px;width:50%;margin-bottom:8px"></div><div class="skeleton" style="height:12px;width:70%"></div></div><div style="display:flex;gap:6px"><div class="skeleton" style="height:28px;width:50px"></div><div class="skeleton" style="height:28px;width:56px"></div></div></div></div>

      <!-- Page 1: Tier list -->
      <div id="page-list" class="page" role="region" aria-label="Tier List">
        <h2>Subscription Tiers</h2>
        <p class="subtitle">Manage tiers visitors can subscribe to on your canvas</p>
        <div id="success" class="success-msg" role="status" aria-live="polite" style="display:none"></div>
        <div id="tier-list" role="list"></div>
        <button id="btn-add" class="btn btn-primary" style="margin-top:16px" type="button">+ Add Tier</button>
      </div>

      <!-- Page 2: Create/Edit form -->
      <div id="page-form" class="page" role="form" aria-labelledby="form-title">
        <h2 id="form-title">Add Tier</h2>
        <p class="subtitle" id="form-subtitle">Create a new subscription tier for your canvas</p>
        <div class="form-group">
          <label>Tier Name</label>
          <input id="f-name" type="text" placeholder="e.g. Free Supporter, Pro Fan" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="f-desc" placeholder="What do subscribers get?"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Price (cents)</label>
            <input id="f-price" type="number" min="0" value="0" placeholder="0 = free" />
          </div>
          <div class="form-group">
            <label>Currency</label>
            <select id="f-currency"><option value="usd">USD</option><option value="eur">EUR</option><option value="gbp">GBP</option></select>
          </div>
          <div class="form-group">
            <label>Interval</label>
            <select id="f-interval"><option value="month">Monthly</option><option value="year">Yearly</option></select>
          </div>
        </div>
        <div class="form-group">
          <label>Benefits</label>
          <div id="benefits-list" class="benefit-list"></div>
          <button id="btn-add-benefit" class="btn-sm" style="margin-top:4px">+ Add Benefit</button>
        </div>
        <div id="form-error" class="error" style="display:none"></div>
        <button id="btn-save" class="btn btn-primary">Save Tier</button>
        <button id="btn-cancel" class="btn btn-secondary">Cancel</button>
      </div>

      <!-- Page 3: Confirm delete -->
      <div id="page-delete" class="page" role="alertdialog" aria-label="Confirm Tier Deletion">
        <h2>Delete Tier</h2>
        <p class="subtitle">Are you sure you want to delete this tier? Active subscribers will lose access.</p>
        <div id="delete-name" style="font-weight:600;font-size:16px;padding:16px 0"></div>
        <button id="btn-confirm-del" class="btn btn-primary" style="background:#ef4444" type="button">Delete Tier</button>
        <button id="btn-cancel-del" class="btn btn-secondary" type="button">Cancel</button>
        <div id="del-error" class="error" role="alert" style="display:none"></div>
      </div>
    </div>
    <script>
      var checkout = StickerNest.integration('checkout');
      var tiers = [];
      var editingId = null;
      var deletingId = null;
      var benefits = [];

      function showPage(id) {
        ['page-list','page-form','page-delete'].forEach(function(p) {
          document.getElementById(p).classList.remove('active');
        });
        document.getElementById(id).classList.add('active');
        setTimeout(function() {
          if (id === 'page-form') { var fn = document.getElementById('f-name'); if (fn) fn.focus(); }
          else if (id === 'page-delete') { var cb = document.getElementById('btn-cancel-del'); if (cb) cb.focus(); }
          else if (id === 'page-list') { var ab = document.getElementById('btn-add'); if (ab) ab.focus(); }
        }, 50);
      }

      function formatPrice(cents, currency) {
        if (cents === 0) return 'Free';
        return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency || 'usd' });
      }

      function loadTiers() {
        checkout.query({ action: 'my_tiers' }).then(function(result) {
          // Handle both paginated { data } and raw array responses
          tiers = (result && result.data) ? result.data : (Array.isArray(result) ? result : []);
          tiers.sort(function(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
          document.getElementById('loading').style.display = 'none';
          renderList();
          showPage('page-list');
        }).catch(function() {
          document.getElementById('loading').textContent = 'Failed to load tiers.';
        });
      }

      window.moveTierUp = function(id) {
        var idx = tiers.findIndex(function(x) { return x.id === id; });
        if (idx <= 0) return;
        var above = tiers[idx - 1];
        var current = tiers[idx];
        var orderA = above.sort_order !== undefined ? above.sort_order : idx - 1;
        var orderB = current.sort_order !== undefined ? current.sort_order : idx;
        Promise.all([
          checkout.mutate({ action: 'update_tier', tierId: current.id, data: { sortOrder: orderA } }),
          checkout.mutate({ action: 'update_tier', tierId: above.id, data: { sortOrder: orderB } })
        ]).then(function() { loadTiers(); }).catch(function() {
          var msg = document.getElementById('success');
          if (msg) { msg.textContent = 'Failed to reorder tiers.'; msg.style.display = 'block'; setTimeout(function() { msg.style.display = 'none'; }, 3000); }
        });
      };

      window.moveTierDown = function(id) {
        var idx = tiers.findIndex(function(x) { return x.id === id; });
        if (idx < 0 || idx >= tiers.length - 1) return;
        var below = tiers[idx + 1];
        var current = tiers[idx];
        var orderA = current.sort_order !== undefined ? current.sort_order : idx;
        var orderB = below.sort_order !== undefined ? below.sort_order : idx + 1;
        Promise.all([
          checkout.mutate({ action: 'update_tier', tierId: current.id, data: { sortOrder: orderB } }),
          checkout.mutate({ action: 'update_tier', tierId: below.id, data: { sortOrder: orderA } })
        ]).then(function() { loadTiers(); }).catch(function() {
          var msg = document.getElementById('success');
          if (msg) { msg.textContent = 'Failed to reorder tiers.'; msg.style.display = 'block'; setTimeout(function() { msg.style.display = 'none'; }, 3000); }
        });
      };

      window.toggleTierActive = function(id) {
        var t = tiers.find(function(x) { return x.id === id; });
        if (!t) return;
        checkout.mutate({ action: 'update_tier', tierId: id, data: { isActive: !t.is_active } }).then(function(r) {
          if (!r.error) {
            var msg = document.getElementById('success');
            msg.textContent = t.is_active ? 'Tier deactivated.' : 'Tier activated.';
            msg.style.display = 'block';
            setTimeout(function() { msg.style.display = 'none'; }, 2000);
            loadTiers();
          }
        }).catch(function() {
          var msg = document.getElementById('success');
          if (msg) { msg.textContent = 'Failed to toggle tier.'; msg.style.display = 'block'; setTimeout(function() { msg.style.display = 'none'; }, 3000); }
        });
      };

      function renderList() {
        var el = document.getElementById('tier-list');
        if (!tiers.length) {
          el.innerHTML = '<div class="empty">No tiers yet. Add your first subscription tier!</div>';
          return;
        }
        el.innerHTML = tiers.map(function(t, idx) {
          var statusBadge = t.is_active
            ? '<span class="badge badge-green">Active</span>'
            : '<span class="badge badge-gray">Inactive</span>';
          var toggleChecked = t.is_active ? 'checked' : '';
          var toggleHtml = '<label class="toggle-switch"><input type="checkbox" ' + toggleChecked + ' onchange="toggleTierActive(' + "'" + t.id + "'" + ')" role="switch" aria-checked="' + (t.is_active ? 'true' : 'false') + '" aria-label="Toggle active state for ' + esc(t.name) + '" /><span class="toggle-slider"></span></label>';
          var upDisabled = idx === 0 ? ' disabled' : '';
          var downDisabled = idx === tiers.length - 1 ? ' disabled' : '';
          return '<div class="tier-row" role="listitem">' +
            '<div class="tier-info"><h3>' + esc(t.name) + ' ' + statusBadge + '</h3>' +
            '<div class="tier-meta">' + formatPrice(t.price_cents, t.currency) + '/' + (t.interval || 'month') +
            (t.benefits && t.benefits.length ? ' &middot; ' + t.benefits.length + ' benefits' : '') + '</div></div>' +
            '<div class="tier-actions">' +
            toggleHtml +
            '<button class="btn-sm" onclick="moveTierUp(' + "'" + t.id + "'" + ')"' + upDisabled + ' aria-label="Move tier up">&uarr;</button>' +
            '<button class="btn-sm" onclick="moveTierDown(' + "'" + t.id + "'" + ')"' + downDisabled + ' aria-label="Move tier down">&darr;</button>' +
            '<button class="btn-sm" onclick="editTier(' + "'" + t.id + "'" + ')" aria-label="Edit ' + esc(t.name) + '">Edit</button>' +
            '<button class="btn-sm danger" onclick="deleteTier(' + "'" + t.id + "'" + ')" aria-label="Delete ' + esc(t.name) + '">Delete</button>' +
            '</div></div>';
        }).join('');
      }

      function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

      function renderBenefits() {
        var el = document.getElementById('benefits-list');
        el.innerHTML = benefits.map(function(b, i) {
          return '<div class="benefit-row"><input type="text" value="' + esc(b) + '" data-idx="' + i + '" />' +
            '<button onclick="removeBenefit(' + i + ')">x</button></div>';
        }).join('');
        el.querySelectorAll('input').forEach(function(inp) {
          inp.onchange = function() { benefits[parseInt(inp.dataset.idx)] = inp.value; };
        });
      }

      window.removeBenefit = function(i) { benefits.splice(i, 1); renderBenefits(); };

      document.getElementById('btn-add-benefit').onclick = function() {
        benefits.push('');
        renderBenefits();
        var inputs = document.querySelectorAll('#benefits-list input');
        if (inputs.length) inputs[inputs.length - 1].focus();
      };

      document.getElementById('btn-add').onclick = function() {
        editingId = null;
        document.getElementById('form-title').textContent = 'Add Tier';
        document.getElementById('form-subtitle').textContent = 'Create a new subscription tier';
        document.getElementById('f-name').value = '';
        document.getElementById('f-desc').value = '';
        document.getElementById('f-price').value = '0';
        document.getElementById('f-currency').value = 'usd';
        document.getElementById('f-interval').value = 'month';
        benefits = [];
        renderBenefits();
        document.getElementById('form-error').style.display = 'none';
        showPage('page-form');
      };

      window.editTier = function(id) {
        var t = tiers.find(function(x) { return x.id === id; });
        if (!t) return;
        editingId = id;
        document.getElementById('form-title').textContent = 'Edit Tier';
        document.getElementById('form-subtitle').textContent = 'Update "' + t.name + '"';
        document.getElementById('f-name').value = t.name || '';
        document.getElementById('f-desc').value = t.description || '';
        document.getElementById('f-price').value = t.price_cents || 0;
        document.getElementById('f-currency').value = t.currency || 'usd';
        document.getElementById('f-interval').value = t.interval || 'month';
        benefits = (t.benefits || []).slice();
        renderBenefits();
        document.getElementById('form-error').style.display = 'none';
        showPage('page-form');
      };

      window.deleteTier = function(id) {
        var t = tiers.find(function(x) { return x.id === id; });
        if (!t) return;
        deletingId = id;
        document.getElementById('delete-name').textContent = '"' + t.name + '" — ' + formatPrice(t.price_cents, t.currency);
        document.getElementById('del-error').style.display = 'none';
        showPage('page-delete');
      };

      document.getElementById('btn-save').onclick = function() {
        var btn = this;
        var name = document.getElementById('f-name').value.trim();
        if (!name) {
          document.getElementById('form-error').textContent = 'Name is required';
          document.getElementById('form-error').style.display = 'block';
          return;
        }
        var synced = [];
        document.querySelectorAll('#benefits-list input').forEach(function(inp) { if (inp.value.trim()) synced.push(inp.value.trim()); });

        btn.disabled = true;
        document.getElementById('form-error').style.display = 'none';

        var payload = {
          data: {
            name: name,
            description: document.getElementById('f-desc').value.trim(),
            priceCents: parseInt(document.getElementById('f-price').value) || 0,
            currency: document.getElementById('f-currency').value,
            interval: document.getElementById('f-interval').value,
            benefits: synced,
          }
        };

        var promise;
        if (editingId) {
          promise = checkout.mutate(Object.assign({ action: 'update_tier', tierId: editingId }, payload));
        } else {
          promise = checkout.mutate(Object.assign({ action: 'create_tier' }, payload));
        }

        promise.then(function(r) {
          btn.disabled = false;
          if (r.error) {
            document.getElementById('form-error').textContent = r.error;
            document.getElementById('form-error').style.display = 'block';
          } else {
            StickerNest.emit('commerce.tier.' + (editingId ? 'updated' : 'created'), { tier: r });
            var msg = document.getElementById('success');
            msg.textContent = editingId ? 'Tier updated!' : 'Tier created!';
            msg.style.display = 'block';
            setTimeout(function() { msg.style.display = 'none'; }, 3000);
            loadTiers();
          }
        }).catch(function(e) {
          btn.disabled = false;
          document.getElementById('form-error').textContent = e.message || 'Save failed';
          document.getElementById('form-error').style.display = 'block';
        });
      };

      document.getElementById('btn-cancel').onclick = function() { showPage('page-list'); };
      document.getElementById('btn-cancel-del').onclick = function() { showPage('page-list'); };

      document.getElementById('btn-confirm-del').onclick = function() {
        var btn = this;
        btn.disabled = true;
        document.getElementById('del-error').style.display = 'none';
        checkout.mutate({ action: 'delete_tier', tierId: deletingId }).then(function(r) {
          btn.disabled = false;
          if (r.error) {
            document.getElementById('del-error').textContent = r.error;
            document.getElementById('del-error').style.display = 'block';
          } else {
            StickerNest.emit('commerce.tier.deleted', { tierId: deletingId });
            var msg = document.getElementById('success');
            msg.textContent = 'Tier deleted.';
            msg.style.display = 'block';
            setTimeout(function() { msg.style.display = 'none'; }, 3000);
            loadTiers();
          }
        }).catch(function(e) {
          btn.disabled = false;
          document.getElementById('del-error').textContent = e.message;
          document.getElementById('del-error').style.display = 'block';
        });
      };

      StickerNest.register({ id: 'wgt-tier-manager', name: 'Tier Manager', version: '1.0.0' });
      loadTiers();
      StickerNest.ready();
    </script>
  `,

  'wgt-item-manager': `
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:var(--sn-font-family,system-ui);color:var(--sn-text,#1a1a2e)}
      .root{padding:20px;height:100%;overflow-y:auto}
      h2{font-size:1.2em;margin-bottom:4px}
      .subtitle{font-size:13px;color:var(--sn-text-muted,#6b7280);margin-bottom:16px}
      .page{display:none}.page.active{display:block}
      .item-list{display:flex;flex-direction:column;gap:10px}
      .item-row{border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,8px);padding:14px;background:var(--sn-surface,#fff);display:flex;justify-content:space-between;align-items:center}
      .item-info h3{font-size:14px;font-weight:600;margin-bottom:2px}
      .item-meta{font-size:12px;color:var(--sn-text-muted,#6b7280)}
      .item-actions{display:flex;gap:6px;align-items:center}
      .btn-sm{padding:5px 10px;border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,4px);background:var(--sn-surface,#fff);font-size:12px;cursor:pointer;color:var(--sn-text,#1a1a2e)}
      .btn-sm:hover{background:var(--sn-border,#f3f4f6)}
      .btn-sm.danger{color:#ef4444;border-color:#fca5a5}
      .btn{width:100%;padding:10px;border:none;border-radius:var(--sn-radius,6px);font-size:14px;font-weight:600;cursor:pointer;margin-top:8px}
      .btn-primary{background:var(--sn-accent,#6366f1);color:#fff}
      .btn-secondary{background:transparent;border:1px solid var(--sn-border,#e5e7eb);color:var(--sn-text,#1a1a2e)}
      .btn:disabled{opacity:.5;cursor:default}
      .form-group{margin-bottom:14px}
      .form-group label{display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:var(--sn-text-muted,#6b7280)}
      .form-group input,.form-group textarea,.form-group select{width:100%;padding:8px 12px;border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,6px);font-size:14px;background:var(--sn-surface,#fff);color:var(--sn-text,#1a1a2e);font-family:inherit}
      .form-group textarea{resize:vertical;min-height:60px}
      .form-row{display:flex;gap:12px}
      .form-row .form-group{flex:1}
      .badge{display:inline-block;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:600}
      .badge-green{background:#dcfce7;color:#16a34a}
      .badge-gray{background:#f3f4f6;color:#6b7280}
      .badge-blue{background:#dbeafe;color:#2563eb}
      .checkbox-row{display:flex;align-items:center;gap:8px;margin-bottom:14px}
      .checkbox-row input[type=checkbox]{width:16px;height:16px}
      .checkbox-row label{font-size:13px;margin-bottom:0}
      .error{color:#ef4444;font-size:12px;margin-top:8px}
      .empty{text-align:center;padding:30px;color:var(--sn-text-muted,#6b7280);font-size:14px}
      .loading{text-align:center;padding:30px;color:var(--sn-text-muted,#6b7280)}
      .success-msg{background:#dcfce7;color:#16a34a;padding:10px;border-radius:var(--sn-radius,6px);font-size:13px;text-align:center;margin-bottom:12px;animation:successPop 0.3s ease}
      @keyframes successPop{0%{transform:scale(0.9);opacity:0}100%{transform:scale(1);opacity:1}}
      .btn{transition:background 0.15s ease,opacity 0.15s ease}
      .btn:disabled{opacity:.5;cursor:default}
      .btn:focus-visible,.btn-sm:focus-visible{outline:2px solid var(--sn-accent,#6366f1);outline-offset:2px}
      .form-group input:focus-visible,.form-group textarea:focus-visible,.form-group select:focus-visible{outline:2px solid var(--sn-accent,#6366f1);outline-offset:1px}
      .item-row{transition:box-shadow 0.15s ease}
      .item-row:hover{box-shadow:0 1px 6px rgba(0,0,0,0.06)}
      .page.active{animation:fadeIn 0.2s ease}
      @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      .skeleton{background:linear-gradient(90deg,var(--sn-border,#e5e7eb) 25%,#f3f4f6 50%,var(--sn-border,#e5e7eb) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:var(--sn-radius,8px)}
      @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      .skeleton-item-row{border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,8px);padding:14px;background:var(--sn-surface,#fff);display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
      .toggle-switch{position:relative;display:inline-block;width:34px;height:18px;flex-shrink:0}
      .toggle-switch input{opacity:0;width:0;height:0;position:absolute}
      .toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:var(--sn-border,#d1d5db);border-radius:18px;transition:background 0.2s ease}
      .toggle-slider:before{content:"";position:absolute;height:14px;width:14px;left:2px;bottom:2px;background:#fff;border-radius:50%;transition:transform 0.2s ease}
      .toggle-switch input:checked+.toggle-slider{background:var(--sn-accent,#6366f1)}
      .toggle-switch input:checked+.toggle-slider:before{transform:translateX(16px)}
      .toggle-switch input:focus-visible+.toggle-slider{outline:2px solid var(--sn-accent,#6366f1);outline-offset:2px}
    </style>
    <div class="root" role="region" aria-label="Item Manager">
      <div id="loading" class="loading" role="status" aria-live="polite" aria-label="Loading items"><div class="skeleton-item-row"><div style="flex:1"><div class="skeleton" style="height:14px;width:50%;margin-bottom:8px"></div><div class="skeleton" style="height:12px;width:70%"></div></div><div style="display:flex;gap:6px"><div class="skeleton" style="height:28px;width:50px"></div><div class="skeleton" style="height:28px;width:56px"></div></div></div><div class="skeleton-item-row"><div style="flex:1"><div class="skeleton" style="height:14px;width:50%;margin-bottom:8px"></div><div class="skeleton" style="height:12px;width:70%"></div></div><div style="display:flex;gap:6px"><div class="skeleton" style="height:28px;width:50px"></div><div class="skeleton" style="height:28px;width:56px"></div></div></div></div>

      <!-- Page 1: Item list -->
      <div id="page-list" class="page" role="region" aria-label="Item List">
        <h2>Shop Items</h2>
        <p class="subtitle">Manage products and digital goods for sale on your canvas</p>
        <div id="success" class="success-msg" role="status" aria-live="polite" style="display:none"></div>
        <div id="item-list" role="list"></div>
        <button id="btn-add" class="btn btn-primary" style="margin-top:16px" type="button">+ Add Item</button>
      </div>

      <!-- Page 2: Create/Edit form -->
      <div id="page-form" class="page" role="form" aria-labelledby="form-title">
        <h2 id="form-title">Add Item</h2>
        <p class="subtitle" id="form-subtitle">Create a new shop item</p>
        <div class="form-group">
          <label>Item Name</label>
          <input id="f-name" type="text" placeholder="e.g. Sticker Pack, Art Print" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="f-desc" placeholder="What are you selling?"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Price (cents)</label>
            <input id="f-price" type="number" min="0" value="0" placeholder="0 = free" />
          </div>
          <div class="form-group">
            <label>Currency</label>
            <select id="f-currency"><option value="usd">USD</option><option value="eur">EUR</option><option value="gbp">GBP</option></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select id="f-type"><option value="digital">Digital</option><option value="physical">Physical</option></select>
          </div>
          <div class="form-group">
            <label>Fulfillment</label>
            <select id="f-fulfillment"><option value="auto">Automatic</option><option value="manual">Manual</option><option value="external">External</option></select>
          </div>
        </div>
        <div class="form-group">
          <label>Stock Count (leave empty for unlimited)</label>
          <input id="f-stock" type="number" min="0" placeholder="Unlimited" />
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="f-shipping" />
          <label for="f-shipping">Requires shipping</label>
        </div>
        <div id="form-error" class="error" style="display:none"></div>
        <button id="btn-save" class="btn btn-primary">Save Item</button>
        <button id="btn-cancel" class="btn btn-secondary">Cancel</button>
      </div>

      <!-- Page 3: Confirm delete -->
      <div id="page-delete" class="page" role="alertdialog" aria-label="Confirm Item Deletion">
        <h2>Delete Item</h2>
        <p class="subtitle">Are you sure? Existing orders will not be affected but no new purchases can be made.</p>
        <div id="delete-name" style="font-weight:600;font-size:16px;padding:16px 0"></div>
        <button id="btn-confirm-del" class="btn btn-primary" style="background:#ef4444" type="button">Delete Item</button>
        <button id="btn-cancel-del" class="btn btn-secondary" type="button">Cancel</button>
        <div id="del-error" class="error" role="alert" style="display:none"></div>
      </div>
    </div>
    <script>
      var checkout = StickerNest.integration('checkout');
      var items = [];
      var editingId = null;
      var deletingId = null;

      function showPage(id) {
        ['page-list','page-form','page-delete'].forEach(function(p) {
          document.getElementById(p).classList.remove('active');
        });
        document.getElementById(id).classList.add('active');
        setTimeout(function() {
          if (id === 'page-form') { var fn = document.getElementById('f-name'); if (fn) fn.focus(); }
          else if (id === 'page-delete') { var cb = document.getElementById('btn-cancel-del'); if (cb) cb.focus(); }
          else if (id === 'page-list') { var ab = document.getElementById('btn-add'); if (ab) ab.focus(); }
        }, 50);
      }

      function formatPrice(cents, currency) {
        if (cents === 0) return 'Free';
        return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency || 'usd' });
      }

      function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

      window.toggleItemActive = function(id) {
        var t = items.find(function(x) { return x.id === id; });
        if (!t) return;
        checkout.mutate({ action: 'update_item', itemId: id, data: { isActive: !t.is_active } }).then(function(r) {
          if (!r.error) {
            var msg = document.getElementById('success');
            msg.textContent = t.is_active ? 'Item deactivated.' : 'Item activated.';
            msg.style.display = 'block';
            setTimeout(function() { msg.style.display = 'none'; }, 2000);
            loadItems();
          }
        }).catch(function() {
          var msg = document.getElementById('success');
          if (msg) { msg.textContent = 'Failed to toggle item.'; msg.style.display = 'block'; setTimeout(function() { msg.style.display = 'none'; }, 3000); }
        });
      };

      function loadItems() {
        checkout.query({ action: 'my_items' }).then(function(result) {
          // Handle both paginated { data } and raw array responses
          items = Array.isArray(result) ? result : (result && result.data ? result.data : []);
          document.getElementById('loading').style.display = 'none';
          renderList();
          showPage('page-list');
        }).catch(function() {
          document.getElementById('loading').textContent = 'Failed to load items.';
        });
      }

      function renderList() {
        var el = document.getElementById('item-list');
        if (!items.length) {
          el.innerHTML = '<div class="empty">No items yet. Add your first product!</div>';
          return;
        }
        el.innerHTML = items.map(function(t) {
          var statusBadge = t.is_active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Inactive</span>';
          var typeBadge = '<span class="badge badge-blue">' + (t.item_type || 'digital') + '</span>';
          var stockStr = t.stock_count !== null && t.stock_count !== undefined ? t.stock_count + ' in stock' : 'Unlimited';
          var toggleChecked = t.is_active ? 'checked' : '';
          var toggleHtml = '<label class="toggle-switch"><input type="checkbox" ' + toggleChecked + ' onchange="toggleItemActive(' + "'" + t.id + "'" + ')" role="switch" aria-checked="' + (t.is_active ? 'true' : 'false') + '" aria-label="Toggle active state for ' + esc(t.name) + '" /><span class="toggle-slider"></span></label>';
          return '<div class="item-row" role="listitem">' +
            '<div class="item-info"><h3>' + esc(t.name) + ' ' + statusBadge + ' ' + typeBadge + '</h3>' +
            '<div class="item-meta">' + formatPrice(t.price_cents, t.currency) + ' &middot; ' + stockStr +
            (t.requires_shipping ? ' &middot; Ships' : '') + '</div></div>' +
            '<div class="item-actions">' +
            toggleHtml +
            '<button class="btn-sm" onclick="editItem(' + "'" + t.id + "'" + ')" aria-label="Edit ' + esc(t.name) + '">Edit</button>' +
            '<button class="btn-sm danger" onclick="deleteItem(' + "'" + t.id + "'" + ')" aria-label="Delete ' + esc(t.name) + '">Delete</button>' +
            '</div></div>';
        }).join('');
      }

      document.getElementById('btn-add').onclick = function() {
        editingId = null;
        document.getElementById('form-title').textContent = 'Add Item';
        document.getElementById('form-subtitle').textContent = 'Create a new shop item';
        document.getElementById('f-name').value = '';
        document.getElementById('f-desc').value = '';
        document.getElementById('f-price').value = '0';
        document.getElementById('f-currency').value = 'usd';
        document.getElementById('f-type').value = 'digital';
        document.getElementById('f-fulfillment').value = 'auto';
        document.getElementById('f-stock').value = '';
        document.getElementById('f-shipping').checked = false;
        document.getElementById('form-error').style.display = 'none';
        showPage('page-form');
      };

      window.editItem = function(id) {
        var t = items.find(function(x) { return x.id === id; });
        if (!t) return;
        editingId = id;
        document.getElementById('form-title').textContent = 'Edit Item';
        document.getElementById('form-subtitle').textContent = 'Update "' + t.name + '"';
        document.getElementById('f-name').value = t.name || '';
        document.getElementById('f-desc').value = t.description || '';
        document.getElementById('f-price').value = t.price_cents || 0;
        document.getElementById('f-currency').value = t.currency || 'usd';
        document.getElementById('f-type').value = t.item_type || 'digital';
        document.getElementById('f-fulfillment').value = t.fulfillment || 'auto';
        document.getElementById('f-stock').value = t.stock_count !== null && t.stock_count !== undefined ? t.stock_count : '';
        document.getElementById('f-shipping').checked = !!t.requires_shipping;
        document.getElementById('form-error').style.display = 'none';
        showPage('page-form');
      };

      window.deleteItem = function(id) {
        var t = items.find(function(x) { return x.id === id; });
        if (!t) return;
        deletingId = id;
        document.getElementById('delete-name').textContent = '"' + t.name + '" — ' + formatPrice(t.price_cents, t.currency);
        document.getElementById('del-error').style.display = 'none';
        showPage('page-delete');
      };

      document.getElementById('btn-save').onclick = function() {
        var btn = this;
        var name = document.getElementById('f-name').value.trim();
        if (!name) {
          document.getElementById('form-error').textContent = 'Name is required';
          document.getElementById('form-error').style.display = 'block';
          return;
        }
        btn.disabled = true;
        document.getElementById('form-error').style.display = 'none';

        var stockVal = document.getElementById('f-stock').value.trim();
        var payload = {
          data: {
            name: name,
            description: document.getElementById('f-desc').value.trim(),
            priceCents: parseInt(document.getElementById('f-price').value) || 0,
            currency: document.getElementById('f-currency').value,
            itemType: document.getElementById('f-type').value,
            fulfillment: document.getElementById('f-fulfillment').value,
            stockCount: stockVal !== '' ? parseInt(stockVal) : null,
            requiresShipping: document.getElementById('f-shipping').checked,
          }
        };

        var promise;
        if (editingId) {
          promise = checkout.mutate(Object.assign({ action: 'update_item', itemId: editingId }, payload));
        } else {
          promise = checkout.mutate(Object.assign({ action: 'create_item' }, payload));
        }

        promise.then(function(r) {
          btn.disabled = false;
          if (r.error) {
            document.getElementById('form-error').textContent = r.error;
            document.getElementById('form-error').style.display = 'block';
          } else {
            StickerNest.emit('commerce.item.' + (editingId ? 'updated' : 'created'), { item: r });
            var msg = document.getElementById('success');
            msg.textContent = editingId ? 'Item updated!' : 'Item created!';
            msg.style.display = 'block';
            setTimeout(function() { msg.style.display = 'none'; }, 3000);
            loadItems();
          }
        }).catch(function(e) {
          btn.disabled = false;
          document.getElementById('form-error').textContent = e.message || 'Save failed';
          document.getElementById('form-error').style.display = 'block';
        });
      };

      document.getElementById('btn-cancel').onclick = function() { showPage('page-list'); };
      document.getElementById('btn-cancel-del').onclick = function() { showPage('page-list'); };

      document.getElementById('btn-confirm-del').onclick = function() {
        var btn = this;
        btn.disabled = true;
        document.getElementById('del-error').style.display = 'none';
        checkout.mutate({ action: 'delete_item', itemId: deletingId }).then(function(r) {
          btn.disabled = false;
          if (r.error) {
            document.getElementById('del-error').textContent = r.error;
            document.getElementById('del-error').style.display = 'block';
          } else {
            StickerNest.emit('commerce.item.deleted', { itemId: deletingId });
            var msg = document.getElementById('success');
            msg.textContent = 'Item deleted.';
            msg.style.display = 'block';
            setTimeout(function() { msg.style.display = 'none'; }, 3000);
            loadItems();
          }
        }).catch(function(e) {
          btn.disabled = false;
          document.getElementById('del-error').textContent = e.message;
          document.getElementById('del-error').style.display = 'block';
        });
      };

      StickerNest.register({ id: 'wgt-item-manager', name: 'Item Manager', version: '1.0.0' });
      loadItems();
      StickerNest.ready();
    </script>
  `,

  'wgt-orders': `
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:var(--sn-font-family,system-ui);color:var(--sn-text,#1a1a2e)}
      .root{padding:20px;height:100%;overflow-y:auto}
      h2{font-size:1.2em;margin-bottom:4px}
      .subtitle{font-size:13px;color:var(--sn-text-muted,#6b7280);margin-bottom:16px}
      .tabs{display:flex;gap:0;margin-bottom:16px;border-bottom:1px solid var(--sn-border,#e5e7eb)}
      .tab{padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;color:var(--sn-text-muted,#6b7280)}
      .tab.active{color:var(--sn-accent,#6366f1);border-bottom-color:var(--sn-accent,#6366f1)}
      .order-list{display:flex;flex-direction:column;gap:8px}
      .order-row{border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,8px);padding:14px;background:var(--sn-surface,#fff)}
      .order-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
      .order-name{font-weight:600;font-size:14px}
      .order-meta{font-size:12px;color:var(--sn-text-muted,#6b7280);display:flex;gap:8px;align-items:center}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
      .badge-green{background:#dcfce7;color:#16a34a}
      .badge-blue{background:#dbeafe;color:#2563eb}
      .badge-yellow{background:#fef9c3;color:#a16207}
      .badge-red{background:#fee2e2;color:#dc2626}
      .badge-gray{background:#f3f4f6;color:#6b7280}
      .empty{text-align:center;padding:40px;color:var(--sn-text-muted,#6b7280);font-size:14px}
      .loading{text-align:center;padding:40px;color:var(--sn-text-muted,#6b7280)}
      .order-amount{font-weight:700;font-size:15px}
      .btn-download{padding:4px 10px;border:1px solid var(--sn-accent,#6366f1);border-radius:var(--sn-radius,4px);background:transparent;color:var(--sn-accent,#6366f1);font-size:12px;cursor:pointer;font-weight:600;transition:background 0.15s ease}
      .btn-download:hover{background:rgba(99,102,241,0.08)}
      .btn-download:focus-visible{outline:2px solid var(--sn-accent,#6366f1);outline-offset:2px}
      .btn-cancel{padding:4px 10px;border:1px solid #dc2626;border-radius:var(--sn-radius,4px);background:transparent;color:#dc2626;font-size:12px;cursor:pointer;font-weight:600;transition:background 0.15s ease}
      .btn-cancel:hover{background:rgba(220,38,38,0.08)}
      .btn-cancel:focus-visible{outline:2px solid #dc2626;outline-offset:2px}
      .btn-cancel:disabled{opacity:0.6;cursor:default}
      .btn-refund{padding:4px 10px;border:1px solid var(--sn-text-muted,#6b7280);border-radius:var(--sn-radius,4px);background:transparent;color:var(--sn-text-muted,#6b7280);font-size:12px;cursor:pointer;font-weight:600;transition:background 0.15s ease}
      .btn-refund:hover{background:rgba(107,114,128,0.08)}
      .btn-refund:focus-visible{outline:2px solid var(--sn-text-muted,#6b7280);outline-offset:2px}
      .btn-refund:disabled{opacity:0.6;cursor:default}
      .error-toast{background:#fee2e2;color:#dc2626;padding:8px 12px;border-radius:var(--sn-radius,6px);font-size:13px;margin-bottom:12px;display:none}
      .success-toast{background:#dcfce7;color:#16a34a;padding:8px 12px;border-radius:var(--sn-radius,6px);font-size:13px;margin-bottom:12px;display:none}
      .tab{transition:color 0.15s ease,border-color 0.15s ease}
      .tab:focus-visible{outline:2px solid var(--sn-accent,#6366f1);outline-offset:2px}
      .order-row{transition:box-shadow 0.15s ease}
      .order-row:hover{box-shadow:0 1px 6px rgba(0,0,0,0.06)}
      .order-list{animation:fadeIn 0.2s ease}
      @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      .skeleton{background:linear-gradient(90deg,var(--sn-border,#e5e7eb) 25%,#f3f4f6 50%,var(--sn-border,#e5e7eb) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:var(--sn-radius,8px)}
      @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      .skeleton-row{border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,8px);padding:14px;background:var(--sn-surface,#fff);margin-bottom:8px}
      .filter-bar{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
      .filter-bar input,.filter-bar select{padding:6px 10px;border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,6px);font-size:13px;background:var(--sn-surface,#fff);color:var(--sn-text,#1a1a2e);font-family:inherit}
      .filter-bar input{flex:1;min-width:140px}
      .filter-bar select{min-width:100px}
      .filter-bar input:focus-visible,.filter-bar select:focus-visible{outline:2px solid var(--sn-accent,#6366f1);outline-offset:1px}
    </style>
    <div class="root" role="region" aria-label="My Orders">
      <h2 id="orders-heading">My Orders</h2>
      <p class="subtitle">Your purchases and subscriptions</p>
      <div id="error-toast" class="error-toast" role="alert" aria-live="polite"></div>
      <div id="success-toast" class="success-toast" role="status" aria-live="polite"></div>
      <div class="tabs" role="tablist" aria-label="Order categories">
        <div class="tab active" id="tab-purchases" data-tab="purchases" role="tab" tabindex="0" aria-selected="true" aria-controls="content">Purchases</div>
        <div class="tab" id="tab-subscriptions" data-tab="subscriptions" role="tab" tabindex="0" aria-selected="false" aria-controls="content">Subscriptions</div>
      </div>
      <div id="filter-bar" class="filter-bar" style="display:none"><input id="search-input" type="text" placeholder="Search by item name..." aria-label="Search orders by item name" /><select id="status-filter" aria-label="Filter orders by status"><option value="">All Statuses</option><option value="paid">Paid</option><option value="fulfilled">Fulfilled</option><option value="refunded">Refunded</option><option value="pending">Pending</option></select></div>
      <div id="loading" class="loading" role="status" aria-live="polite" aria-label="Loading orders"><div class="skeleton-row"><div class="skeleton" style="height:14px;width:50%;margin-bottom:8px"></div><div style="display:flex;gap:8px"><div class="skeleton" style="height:16px;width:60px"></div><div class="skeleton" style="height:16px;width:80px"></div><div class="skeleton" style="height:16px;width:60px"></div></div></div><div class="skeleton-row"><div class="skeleton" style="height:14px;width:50%;margin-bottom:8px"></div><div style="display:flex;gap:8px"><div class="skeleton" style="height:16px;width:60px"></div><div class="skeleton" style="height:16px;width:80px"></div><div class="skeleton" style="height:16px;width:60px"></div></div></div><div class="skeleton-row"><div class="skeleton" style="height:14px;width:50%;margin-bottom:8px"></div><div style="display:flex;gap:8px"><div class="skeleton" style="height:16px;width:60px"></div><div class="skeleton" style="height:16px;width:80px"></div><div class="skeleton" style="height:16px;width:60px"></div></div></div></div>
      <div id="content" role="tabpanel" aria-labelledby="tab-purchases"></div>
    </div>
    <script>
      var checkout = StickerNest.integration('checkout');
      var currentTab = 'purchases';
      var orders = [];
      var subscriptions = [];

      function formatPrice(cents, currency) {
        if (cents === 0) return 'Free';
        return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency || 'usd' });
      }

      function formatDate(d) {
        return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }

      function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

      function statusBadge(status) {
        var map = { paid: 'badge-green', active: 'badge-green', fulfilled: 'badge-blue', pending: 'badge-yellow', refunded: 'badge-red', cancelled: 'badge-red', refund_requested: 'badge-yellow', past_due: 'badge-yellow' };
        return '<span class="badge ' + (map[status] || 'badge-gray') + '">' + esc(status) + '</span>';
      }

      var ordersErrorToast = document.getElementById('error-toast');
      var ordersSuccessToast = document.getElementById('success-toast');

      function showOrdersError(msg) {
        ordersErrorToast.textContent = msg;
        ordersErrorToast.style.display = 'block';
        setTimeout(function() { ordersErrorToast.style.display = 'none'; }, 5000);
      }

      function showOrdersSuccess(msg) {
        ordersSuccessToast.textContent = msg;
        ordersSuccessToast.style.display = 'block';
        setTimeout(function() { ordersSuccessToast.style.display = 'none'; }, 5000);
      }

      function isRefundEligible(order) {
        if (order.status !== 'paid' && order.status !== 'fulfilled') return false;
        var orderDate = new Date(order.created_at);
        var now = new Date();
        var daysSince = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 30;
      }

      var searchInput = document.getElementById('search-input');
      var statusFilter = document.getElementById('status-filter');
      var filterBar = document.getElementById('filter-bar');

      searchInput.oninput = function() { render(); };
      statusFilter.onchange = function() { render(); };

      function getFilteredOrders() {
        var query = (searchInput.value || '').trim().toLowerCase();
        var statusVal = statusFilter.value;
        return orders.filter(function(o) {
          var nameMatch = !query || ((o.item_name || o.type || '').toLowerCase().indexOf(query) !== -1);
          var statusMatch = !statusVal || o.status === statusVal;
          return nameMatch && statusMatch;
        });
      }

      function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.tab').forEach(function(t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        var activeTab = document.getElementById('tab-' + tab);
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
        document.getElementById('content').setAttribute('aria-labelledby', 'tab-' + tab);
        filterBar.style.display = tab === 'purchases' ? 'flex' : 'none';
        render();
      }

      var tabEls = document.querySelectorAll('.tab');
      tabEls.forEach(function(t) {
        t.onclick = function() { switchTab(t.dataset.tab); };
        t.onkeydown = function(e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchTab(t.dataset.tab); }
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            var tabs = Array.from(tabEls);
            var idx = tabs.indexOf(t);
            var next = e.key === 'ArrowRight' ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
            tabs[next].focus();
          }
        };
      });

      function render() {
        var el = document.getElementById('content');
        if (currentTab === 'purchases') {
          var filtered = getFilteredOrders();
          if (!orders.length) { el.innerHTML = '<div class="empty">No purchases yet.</div>'; return; }
          if (!filtered.length) { el.innerHTML = '<div class="empty">No orders match your filters.</div>'; return; }
          el.innerHTML = '<div class="order-list">' + filtered.map(function(o) {
            var dlBtn = (o.type === 'shop_item' && (o.status === 'paid' || o.status === 'fulfilled'))
              ? '<button class="btn-download" data-order-id="' + o.id + '" aria-label="Download ' + esc(o.item_name || o.type) + '">Download</button>' : '';
            var refundBtn = isRefundEligible(o)
              ? ' <button class="btn-refund" data-refund-order-id="' + o.id + '" aria-label="Request refund for ' + esc(o.item_name || o.type) + '">Request Refund</button>' : '';
            return '<div class="order-row">' +
              '<div class="order-header"><span class="order-name">' + esc(o.item_name || o.type) + '</span>' + statusBadge(o.status) + '</div>' +
              '<div class="order-meta"><span class="order-amount">' + formatPrice(o.amount_cents, o.currency) + '</span>' +
              '<span>' + formatDate(o.created_at) + '</span>' +
              '<span style="text-transform:uppercase;font-size:10px">' + esc(o.type) + '</span>' +
              dlBtn + refundBtn + '</div></div>';
          }).join('') + '</div>';
          el.querySelectorAll('.btn-download').forEach(function(btn) {
            btn.onclick = function() {
              var oid = btn.dataset.orderId;
              btn.textContent = '...';
              btn.disabled = true;
              checkout.query({ action: 'download', orderId: oid }).then(function(r) {
                if (r.downloadUrl) {
                  window.open(r.downloadUrl, '_blank');
                  btn.textContent = 'Download';
                  btn.disabled = false;
                } else {
                  btn.textContent = r.error || 'Unavailable';
                  setTimeout(function() { btn.textContent = 'Retry'; btn.disabled = false; }, 3000);
                }
              }).catch(function() {
                btn.textContent = 'Error';
                setTimeout(function() { btn.textContent = 'Retry'; btn.disabled = false; }, 3000);
              });
            };
          });
          el.querySelectorAll('.btn-refund').forEach(function(btn) {
            btn.onclick = function() {
              var oid = btn.dataset.refundOrderId;
              btn.textContent = 'Requesting...';
              btn.disabled = true;
              checkout.mutate({ action: 'request_refund', orderId: oid }).then(function(r) {
                if (r.success) {
                  showOrdersSuccess('Refund requested successfully.');
                  loadOrders();
                } else {
                  showOrdersError(r.error || 'Failed to request refund.');
                  btn.textContent = 'Request Refund';
                  btn.disabled = false;
                }
              }).catch(function(err) {
                showOrdersError(err.message || 'Failed to request refund.');
                btn.textContent = 'Request Refund';
                btn.disabled = false;
              });
            };
          });
        } else {
          if (!subscriptions.length) { el.innerHTML = '<div class="empty">No active subscriptions.</div>'; return; }
          el.innerHTML = '<div class="order-list">' + subscriptions.map(function(s) {
            var renewal = s.current_period_end ? 'Renews ' + formatDate(s.current_period_end) : '';
            var cancelBtn = s.status === 'active'
              ? ' <button class="btn-cancel" data-sub-id="' + s.id + '" aria-label="Cancel subscription ' + esc(s.tier_name || 'Subscription') + '">Cancel</button>' : '';
            return '<div class="order-row">' +
              '<div class="order-header"><span class="order-name">' + esc(s.tier_name || 'Subscription') + '</span>' + statusBadge(s.status) + '</div>' +
              '<div class="order-meta">' + (renewal ? '<span>' + renewal + '</span>' : '') + cancelBtn + '</div></div>';
          }).join('') + '</div>';
          el.querySelectorAll('.btn-cancel').forEach(function(btn) {
            btn.onclick = function() {
              var sid = btn.dataset.subId;
              btn.textContent = 'Cancelling...';
              btn.disabled = true;
              checkout.mutate({ action: 'cancel_subscription', subscriptionId: sid }).then(function(r) {
                if (r.success) {
                  showOrdersSuccess('Subscription cancelled.');
                  loadOrders();
                } else {
                  showOrdersError(r.error || 'Failed to cancel subscription.');
                  btn.textContent = 'Cancel';
                  btn.disabled = false;
                }
              }).catch(function(err) {
                showOrdersError(err.message || 'Failed to cancel subscription.');
                btn.textContent = 'Cancel';
                btn.disabled = false;
              });
            };
          });
        }
      }

      function loadOrders() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('content').innerHTML = '';
        filterBar.style.display = 'none';
        Promise.all([
          checkout.query({ action: 'my_orders' }),
          checkout.query({ action: 'my_subscription' }),
        ]).then(function(results) {
          document.getElementById('loading').style.display = 'none';
          // Handle both paginated { data } and raw array responses
          var rawOrders = results[0];
          orders = Array.isArray(rawOrders) ? rawOrders : (rawOrders && rawOrders.data ? rawOrders.data : []);
          var sub = results[1];
          subscriptions = sub ? (Array.isArray(sub) ? sub : [sub]) : [];
          if (currentTab === 'purchases') { filterBar.style.display = 'flex'; }
          render();
        }).catch(function() {
          document.getElementById('loading').textContent = 'Failed to load orders.';
        });
      }

      // Initial load
      loadOrders();

      // Refresh on auth changes
      StickerNest.subscribe('auth.signed_in', function() { loadOrders(); });
      StickerNest.subscribe('auth.signed_up', function() { loadOrders(); });
      StickerNest.subscribe('auth.signed_out', function() { loadOrders(); });

      StickerNest.register({ id: 'wgt-orders', name: 'My Orders', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,

  'wgt-creator-dashboard': `
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:var(--sn-font-family,system-ui);color:var(--sn-text,#1a1a2e)}
      .root{padding:20px;height:100%;overflow-y:auto}
      h2{font-size:1.2em;margin-bottom:4px}
      .subtitle{font-size:13px;color:var(--sn-text-muted,#6b7280);margin-bottom:16px}
      .stats-row{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
      .stat-card{flex:1;min-width:120px;border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,8px);padding:16px;background:var(--sn-surface,#fff);transition:box-shadow 0.15s ease,border-color 0.15s ease}
      .stat-card:hover{box-shadow:0 2px 8px rgba(0,0,0,0.06)}
      .stat-label{font-size:12px;font-weight:600;color:var(--sn-text-muted,#6b7280);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.03em}
      .stat-value{font-size:24px;font-weight:700}
      .section-title{font-size:14px;font-weight:600;margin-bottom:10px}
      .activity-list{display:flex;flex-direction:column;gap:8px}
      .activity-row{border:1px solid var(--sn-border,#e5e7eb);border-radius:var(--sn-radius,8px);padding:14px;background:var(--sn-surface,#fff);transition:box-shadow 0.15s ease}
      .activity-row:hover{box-shadow:0 1px 6px rgba(0,0,0,0.06)}
      .activity-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
      .activity-name{font-weight:600;font-size:14px}
      .activity-meta{font-size:12px;color:var(--sn-text-muted,#6b7280);display:flex;gap:8px;align-items:center}
      .activity-amount{font-weight:700;font-size:14px}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
      .badge-green{background:#dcfce7;color:#16a34a}
      .badge-blue{background:#dbeafe;color:#2563eb}
      .badge-yellow{background:#fef9c3;color:#a16207}
      .badge-red{background:#fee2e2;color:#dc2626}
      .badge-gray{background:#f3f4f6;color:#6b7280}
      .empty{text-align:center;padding:40px;color:var(--sn-text-muted,#6b7280);font-size:14px}
      .loading{text-align:center;padding:40px;color:var(--sn-text-muted,#6b7280)}
      .error-toast{background:#fee2e2;color:#dc2626;padding:8px 12px;border-radius:var(--sn-radius,6px);font-size:13px;margin-bottom:12px;display:none}
      .stats-row{animation:fadeIn 0.2s ease}
      .activity-list{animation:fadeIn 0.25s ease}
      @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      .stat-card:focus-visible{outline:2px solid var(--sn-accent,#6366f1);outline-offset:2px}
    </style>
    <div class="root" role="region" aria-label="Creator Dashboard">
      <h2 id="dashboard-heading">Creator Dashboard</h2>
      <p class="subtitle">Overview of your revenue, subscribers, and orders</p>
      <div id="error-toast" class="error-toast" role="alert" aria-live="polite"></div>
      <div id="loading" class="loading" role="status" aria-live="polite">Loading dashboard...</div>
      <div id="dashboard-content" style="display:none;">
        <div class="stats-row" role="region" aria-label="Statistics">
          <div class="stat-card" role="status" aria-label="Total Revenue" tabindex="0">
            <div class="stat-label">Total Revenue</div>
            <div class="stat-value" id="stat-revenue">--</div>
          </div>
          <div class="stat-card" role="status" aria-label="Active Subscribers" tabindex="0">
            <div class="stat-label">Active Subscribers</div>
            <div class="stat-value" id="stat-subscribers">--</div>
          </div>
          <div class="stat-card" role="status" aria-label="Total Orders" tabindex="0">
            <div class="stat-label">Total Orders</div>
            <div class="stat-value" id="stat-orders">--</div>
          </div>
        </div>
        <div class="section-title" id="activity-heading">Recent Activity</div>
        <div id="activity" class="activity-list" role="list" aria-labelledby="activity-heading"></div>
      </div>
    </div>
    <script>
      var checkout = StickerNest.integration('checkout');
      var stats = null;
      var recentOrders = [];

      function formatPrice(cents, currency) {
        if (cents === 0) return '$0.00';
        return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency || 'usd' });
      }

      function formatDate(d) {
        return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }

      function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

      function statusBadge(status) {
        var map = { paid: 'badge-green', active: 'badge-green', fulfilled: 'badge-blue', pending: 'badge-yellow', refunded: 'badge-red', cancelled: 'badge-red', refund_requested: 'badge-yellow', past_due: 'badge-yellow' };
        return '<span class="badge ' + (map[status] || 'badge-gray') + '">' + esc(status) + '</span>';
      }

      var dashErrorToast = document.getElementById('error-toast');

      function showDashError(msg) {
        dashErrorToast.textContent = msg;
        dashErrorToast.style.display = 'block';
        setTimeout(function() { dashErrorToast.style.display = 'none'; }, 5000);
      }

      function renderStats() {
        if (!stats) return;
        document.getElementById('stat-revenue').textContent = formatPrice(stats.totalRevenue, 'usd');
        document.getElementById('stat-subscribers').textContent = String(stats.activeSubscribers);
        document.getElementById('stat-orders').textContent = String(stats.totalOrders);
      }

      function renderActivity() {
        var el = document.getElementById('activity');
        if (!recentOrders.length) {
          el.innerHTML = '<div class="empty">No recent orders yet.</div>';
          return;
        }
        el.innerHTML = recentOrders.map(function(o) {
          return '<div class="activity-row" role="listitem">' +
            '<div class="activity-header"><span class="activity-name">' + esc(o.item_name || o.tier_name || o.type || 'Order') + '</span>' + statusBadge(o.status) + '</div>' +
            '<div class="activity-meta"><span class="activity-amount">' + formatPrice(o.amount_cents, o.currency) + '</span>' +
            '<span>' + formatDate(o.created_at) + '</span></div></div>';
        }).join('');
      }

      function loadDashboard() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('dashboard-content').style.display = 'none';
        Promise.all([
          checkout.query({ action: 'dashboard_stats' }),
          checkout.query({ action: 'recent_activity' }),
        ]).then(function(results) {
          document.getElementById('loading').style.display = 'none';
          document.getElementById('dashboard-content').style.display = 'block';
          stats = results[0] || { totalRevenue: 0, activeSubscribers: 0, totalOrders: 0 };
          recentOrders = Array.isArray(results[1]) ? results[1] : (results[1] && results[1].data ? results[1].data : []);
          renderStats();
          renderActivity();
        }).catch(function(e) {
          document.getElementById('loading').style.display = 'none';
          document.getElementById('dashboard-content').style.display = 'block';
          showDashError(e.message || 'Failed to load dashboard.');
        });
      }

      // Initial load
      loadDashboard();

      // Refresh on relevant events
      StickerNest.subscribe('commerce.order.created', function() { loadDashboard(); });
      StickerNest.subscribe('commerce.tier.created', function() { loadDashboard(); });
      StickerNest.subscribe('auth.signed_in', function() { loadDashboard(); });
      StickerNest.subscribe('auth.signed_out', function() { loadDashboard(); });

      StickerNest.register({ id: 'wgt-creator-dashboard', name: 'Creator Dashboard', version: '1.0.0' });
      StickerNest.ready();
    </script>
  `,
};
