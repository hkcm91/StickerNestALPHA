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
            var items = (result && result.data) ? result.data : (Array.isArray(result) ? result : []);
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
          items = (result && result.data) ? result.data : (Array.isArray(result) ? result : []);
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
          orders = (rawOrders && rawOrders.data) ? rawOrders.data : (Array.isArray(rawOrders) ? rawOrders : []);
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
          recentOrders = results[1] || [];
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

  'wgt-text-settings': `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--sn-font-family, system-ui); background: var(--sn-surface, #ffffff); color: var(--sn-text, #1a1a2e); }
      .container { padding: 12px; display: flex; flex-direction: column; gap: 12px; height: 100%; overflow-y: auto; }
      .empty-state { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--sn-text-muted, #666); font-size: 14px; text-align: center; padding: 16px; }
      .field { display: flex; flex-direction: column; gap: 4px; }
      .field-label { font-size: 11px; font-weight: 500; color: var(--sn-text-muted, #666); text-transform: uppercase; letter-spacing: 0.5px; }
      .field-row { display: flex; gap: 8px; align-items: center; }
      select, input[type="number"] { flex: 1; padding: 8px; border: 1px solid var(--sn-border, #e0e0e0); border-radius: 6px; background: var(--sn-bg, #fff); color: var(--sn-text, #1a1a2e); font-size: 13px; }
      select:focus, input:focus { outline: none; border-color: var(--sn-accent, #6366f1); }
      input[type="color"] { width: 40px; height: 36px; padding: 2px; border: 1px solid var(--sn-border, #e0e0e0); border-radius: 6px; cursor: pointer; }
      .color-preview { width: 100%; height: 24px; border-radius: 4px; border: 1px solid var(--sn-border, #e0e0e0); }
      .weight-buttons { display: flex; gap: 4px; }
      .weight-btn { padding: 6px 10px; border: 1px solid var(--sn-border, #e0e0e0); border-radius: 4px; background: var(--sn-bg, #fff); cursor: pointer; font-size: 12px; color: var(--sn-text, #1a1a2e); transition: all 0.15s; }
      .weight-btn:hover { background: var(--sn-surface, #f5f5f5); }
      .weight-btn.active { background: var(--sn-accent, #6366f1); color: white; border-color: var(--sn-accent, #6366f1); }
      .align-buttons { display: flex; gap: 4px; }
      .align-btn { padding: 6px 12px; border: 1px solid var(--sn-border, #e0e0e0); border-radius: 4px; background: var(--sn-bg, #fff); cursor: pointer; font-size: 14px; transition: all 0.15s; }
      .align-btn:hover { background: var(--sn-surface, #f5f5f5); }
      .align-btn.active { background: var(--sn-accent, #6366f1); color: white; border-color: var(--sn-accent, #6366f1); }
      .multi-hint { font-size: 11px; color: var(--sn-text-muted, #999); font-style: italic; }
    </style>
    <div id="empty" class="empty-state">Select a text entity to edit its properties</div>
    <div id="editor" class="container" style="display:none;">
      <div class="field">
        <span class="field-label">Font Family</span>
        <select id="fontFamily">
          <option value="system-ui">System UI</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="Times New Roman, serif">Times New Roman</option>
          <option value="Courier New, monospace">Courier New</option>
          <option value="Verdana, sans-serif">Verdana</option>
          <option value="Trebuchet MS, sans-serif">Trebuchet MS</option>
          <option value="Comic Sans MS, cursive">Comic Sans MS</option>
        </select>
      </div>
      <div class="field">
        <span class="field-label">Font Size</span>
        <input type="number" id="fontSize" min="8" max="200" step="1" />
      </div>
      <div class="field">
        <span class="field-label">Font Weight</span>
        <div class="weight-buttons" id="weightButtons">
          <button class="weight-btn" data-weight="300">Light</button>
          <button class="weight-btn" data-weight="400">Normal</button>
          <button class="weight-btn" data-weight="500">Medium</button>
          <button class="weight-btn" data-weight="700">Bold</button>
        </div>
      </div>
      <div class="field">
        <span class="field-label">Text Alignment</span>
        <div class="align-buttons" id="alignButtons">
          <button class="align-btn" data-align="left" title="Align Left">⬅</button>
          <button class="align-btn" data-align="center" title="Center">⬌</button>
          <button class="align-btn" data-align="right" title="Align Right">➡</button>
        </div>
      </div>
      <div class="field">
        <span class="field-label">Text Color</span>
        <div class="field-row">
          <input type="color" id="colorPicker" />
          <input type="text" id="colorHex" style="flex:1;padding:8px;border:1px solid var(--sn-border,#e0e0e0);border-radius:6px;font-family:monospace;" placeholder="#000000" />
        </div>
      </div>
      <div id="multiHint" class="multi-hint" style="display:none;">Changes apply to all selected text entities</div>
    </div>
    <script>
      (function() {
        var selectedTextEntities = [];
        var emptyEl = document.getElementById('empty');
        var editorEl = document.getElementById('editor');
        var multiHintEl = document.getElementById('multiHint');
        var fontFamilyEl = document.getElementById('fontFamily');
        var fontSizeEl = document.getElementById('fontSize');
        var weightButtonsEl = document.getElementById('weightButtons');
        var alignButtonsEl = document.getElementById('alignButtons');
        var colorPickerEl = document.getElementById('colorPicker');
        var colorHexEl = document.getElementById('colorHex');

        function updateUI() {
          if (selectedTextEntities.length === 0) {
            emptyEl.style.display = 'flex';
            editorEl.style.display = 'none';
            return;
          }
          emptyEl.style.display = 'none';
          editorEl.style.display = 'flex';
          multiHintEl.style.display = selectedTextEntities.length > 1 ? 'block' : 'none';

          var first = selectedTextEntities[0];
          fontFamilyEl.value = first.fontFamily || 'system-ui';
          fontSizeEl.value = first.fontSize || 16;
          colorPickerEl.value = first.color || '#000000';
          colorHexEl.value = first.color || '#000000';

          var weight = first.fontWeight || 400;
          Array.from(weightButtonsEl.children).forEach(function(btn) {
            btn.classList.toggle('active', parseInt(btn.dataset.weight) === weight);
          });

          var align = first.textAlign || 'left';
          Array.from(alignButtonsEl.children).forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.align === align);
          });
        }

        function emitUpdates(updates) {
          selectedTextEntities.forEach(function(entity) {
            StickerNest.emit('canvas.entity.updated', { id: entity.id, updates: updates });
          });
        }

        fontFamilyEl.addEventListener('change', function() {
          emitUpdates({ fontFamily: fontFamilyEl.value });
        });

        fontSizeEl.addEventListener('input', function() {
          var size = parseInt(fontSizeEl.value);
          if (!isNaN(size) && size > 0) {
            emitUpdates({ fontSize: size });
          }
        });

        weightButtonsEl.addEventListener('click', function(e) {
          if (e.target.classList.contains('weight-btn')) {
            var weight = parseInt(e.target.dataset.weight);
            emitUpdates({ fontWeight: weight });
            Array.from(weightButtonsEl.children).forEach(function(btn) {
              btn.classList.toggle('active', parseInt(btn.dataset.weight) === weight);
            });
          }
        });

        alignButtonsEl.addEventListener('click', function(e) {
          if (e.target.classList.contains('align-btn')) {
            var align = e.target.dataset.align;
            emitUpdates({ textAlign: align });
            Array.from(alignButtonsEl.children).forEach(function(btn) {
              btn.classList.toggle('active', btn.dataset.align === align);
            });
          }
        });

        colorPickerEl.addEventListener('input', function() {
          colorHexEl.value = colorPickerEl.value;
          emitUpdates({ color: colorPickerEl.value });
        });

        colorHexEl.addEventListener('input', function() {
          var val = colorHexEl.value;
          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            colorPickerEl.value = val;
            emitUpdates({ color: val });
          }
        });

        StickerNest.subscribe('canvas.entity.selected', function(payload) {
          var entities = payload.entities || [];
          selectedTextEntities = entities.filter(function(e) { return e.type === 'text'; });
          updateUI();
        });

        StickerNest.subscribe('canvas.selection.cleared', function() {
          selectedTextEntities = [];
          updateUI();
        });

        StickerNest.register({
          id: 'wgt-text-settings',
          name: 'Text Settings',
          version: '1.0.0',
          description: 'Configure font, weight, and color for selected text entities',
          events: {
            subscribes: ['canvas.entity.selected', 'canvas.selection.cleared'],
            emits: ['canvas.entity.updated']
          }
        });
        StickerNest.ready();
      })();
    </script>
  `,

  // =========================================================================
  // Cross-Canvas Communication Widgets
  // =========================================================================

  'wgt-xc-broadcaster': `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--sn-font-family, system-ui); color: var(--sn-text, #e5e7eb); background: var(--sn-surface, #1f2937); }
      .root { padding: 12px; height: 100%; display: flex; flex-direction: column; }
      .title { font-size: 11px; font-weight: 700; color: var(--sn-accent, #6366f1); margin-bottom: 8px; letter-spacing: 0.5px; }
      .channel-row { display: flex; gap: 4px; margin-bottom: 8px; align-items: center; }
      .channel-label { font-size: 10px; color: var(--sn-text-muted, #9ca3af); }
      input { flex: 1; padding: 4px 8px; border: 1px solid var(--sn-border, #374151); border-radius: 4px; background: var(--sn-bg, #111827); color: var(--sn-text, #e5e7eb); font-size: 12px; }
      .msg-row { display: flex; gap: 4px; margin-bottom: 8px; }
      .btn { padding: 4px 12px; border: none; border-radius: 4px; background: var(--sn-accent, #6366f1); color: #fff; cursor: pointer; font-size: 11px; font-weight: 600; }
      .btn:active { opacity: 0.8; }
      .log { flex: 1; overflow-y: auto; font-size: 10px; color: var(--sn-text-muted, #9ca3af); }
      .log div { padding: 1px 0; }
      .status { font-size: 9px; color: var(--sn-text-muted, #6b7280); margin-top: 4px; }
    </style>
    <div class="root">
      <div class="title">BROADCASTER</div>
      <div class="channel-row">
        <span class="channel-label">Channel:</span>
        <input id="channel" type="text" value="global" />
      </div>
      <div class="msg-row">
        <input id="msg" type="text" placeholder="Message..." value="hello" />
        <button class="btn" id="send">Send</button>
      </div>
      <div class="log" id="log"></div>
      <div class="status" id="status">Sent: 0</div>
    </div>
    <script>
      (function() {
        var sent = 0;
        var channelEl = document.getElementById('channel');
        var msgEl = document.getElementById('msg');
        var logEl = document.getElementById('log');
        var statusEl = document.getElementById('status');

        // Use config channel if provided
        var cfg = StickerNest.getConfig();
        if (cfg && cfg.channel) channelEl.value = cfg.channel;

        // Restore saved channel
        StickerNest.getState('channel').then(function(v) { if (v) channelEl.value = v; });

        function addLog(text) {
          var t = new Date().toLocaleTimeString();
          logEl.innerHTML = '<div>[' + t + '] ' + text + '</div>' + logEl.innerHTML;
        }

        document.getElementById('send').onclick = function() {
          var ch = channelEl.value.trim();
          var text = msgEl.value.trim();
          if (!ch || !text) return;
          StickerNest.emitCrossCanvas(ch, { text: text, from: 'broadcaster', timestamp: Date.now() });
          sent++;
          statusEl.textContent = 'Sent: ' + sent + ' on ' + ch;
          addLog('Sent: ' + text);
          StickerNest.setState('channel', ch);
        };

        msgEl.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') document.getElementById('send').click();
        });

        StickerNest.register({
          id: 'sn.builtin.xc-broadcaster',
          name: 'Broadcaster',
          version: '1.0.0',
          permissions: ['cross-canvas'],
          events: { emits: [], subscribes: [] }
        });
        StickerNest.ready();
        addLog('Ready');
      })();
    </script>
  `,

  'wgt-xc-listener': `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--sn-font-family, system-ui); color: var(--sn-text, #e5e7eb); background: var(--sn-surface, #1f2937); }
      .root { padding: 12px; height: 100%; display: flex; flex-direction: column; }
      .title { font-size: 11px; font-weight: 700; color: #22c55e; margin-bottom: 8px; letter-spacing: 0.5px; }
      .channel-row { display: flex; gap: 4px; margin-bottom: 8px; align-items: center; }
      .channel-label { font-size: 10px; color: var(--sn-text-muted, #9ca3af); }
      input { flex: 1; padding: 4px 8px; border: 1px solid var(--sn-border, #374151); border-radius: 4px; background: var(--sn-bg, #111827); color: var(--sn-text, #e5e7eb); font-size: 12px; }
      .btn { padding: 4px 12px; border: none; border-radius: 4px; background: #22c55e; color: #fff; cursor: pointer; font-size: 11px; font-weight: 600; }
      .btn:active { opacity: 0.8; }
      .log { flex: 1; overflow-y: auto; font-size: 10px; color: var(--sn-text-muted, #9ca3af); }
      .log div { padding: 1px 0; }
      .log .msg { color: #22c55e; }
      .status { font-size: 9px; color: var(--sn-text-muted, #6b7280); margin-top: 4px; }
    </style>
    <div class="root">
      <div class="title">LISTENER</div>
      <div class="channel-row">
        <span class="channel-label">Channel:</span>
        <input id="channel" type="text" value="global" />
        <button class="btn" id="listen">Listen</button>
      </div>
      <div class="log" id="log"></div>
      <div class="status" id="status">Received: 0 | Not listening</div>
    </div>
    <script>
      (function() {
        var received = 0;
        var currentChannel = null;
        var channelEl = document.getElementById('channel');
        var logEl = document.getElementById('log');
        var statusEl = document.getElementById('status');

        // Use config channel if provided
        var cfg = StickerNest.getConfig();
        if (cfg && cfg.channel) channelEl.value = cfg.channel;

        // Restore saved channel
        StickerNest.getState('channel').then(function(v) { if (v) channelEl.value = v; });

        function addLog(text, cls) {
          var t = new Date().toLocaleTimeString();
          logEl.innerHTML = '<div class="' + (cls || '') + '">[' + t + '] ' + text + '</div>' + logEl.innerHTML;
        }

        function startListening() {
          var ch = channelEl.value.trim();
          if (!ch) return;
          if (currentChannel) {
            StickerNest.unsubscribeCrossCanvas(currentChannel);
          }
          currentChannel = ch;
          StickerNest.subscribeCrossCanvas(ch, function(payload) {
            received++;
            var latency = payload.timestamp ? ' (' + (Date.now() - payload.timestamp) + 'ms)' : '';
            addLog(payload.text + latency, 'msg');
            statusEl.textContent = 'Received: ' + received + ' on ' + ch;
          });
          addLog('Listening on: ' + ch);
          statusEl.textContent = 'Received: 0 | Listening on ' + ch;
          StickerNest.setState('channel', ch);
        }

        document.getElementById('listen').onclick = startListening;
        channelEl.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') startListening();
        });

        StickerNest.register({
          id: 'sn.builtin.xc-listener',
          name: 'Listener',
          version: '1.0.0',
          permissions: ['cross-canvas'],
          events: { emits: [], subscribes: [] }
        });
        StickerNest.ready();

        // Auto-start listening on saved/default channel
        setTimeout(startListening, 100);
      })();
    </script>
  `,

  // ===========================================================================
  // Connection Invite Test Widgets
  // These are used to test the widget invite/connection flow between users.
  // ===========================================================================

  'wgt-live-chat': `
    <div id="chat-root" style="display:flex;flex-direction:column;height:100%;font-family:var(--sn-font-family,system-ui);background:var(--sn-surface,#fff);color:var(--sn-text,#1a1a2e);">
      <div id="chat-header" style="padding:10px 14px;border-bottom:1px solid var(--sn-border,#e0e0e0);font-weight:600;font-size:13px;display:flex;align-items:center;gap:8px;">
        <span id="status-dot" style="width:8px;height:8px;border-radius:50%;background:#4caf50;"></span>
        <span>Live Chat</span>
        <span id="peer-name" style="font-weight:400;opacity:0.6;font-size:12px;margin-left:auto;"></span>
      </div>
      <div id="messages" style="flex:1;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:6px;">
        <div style="font-size:12px;opacity:0.5;text-align:center;padding:20px 0;">Connected — messages appear here</div>
      </div>
      <div style="padding:8px 10px;border-top:1px solid var(--sn-border,#e0e0e0);display:flex;gap:6px;">
        <input id="msg-input" type="text" placeholder="Type a message..." style="flex:1;padding:8px 12px;border:1px solid var(--sn-border,#e0e0e0);border-radius:8px;font-size:13px;font-family:inherit;background:var(--sn-bg,#f5f5f5);color:inherit;outline:none;" />
        <button id="send-btn" style="padding:8px 14px;border:none;border-radius:8px;background:var(--sn-accent,#7c9a92);color:#fff;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit;">Send</button>
      </div>
    </div>
    <script>
      (function() {
        var messages = document.getElementById('messages');
        var input = document.getElementById('msg-input');
        var sendBtn = document.getElementById('send-btn');
        var peerNameEl = document.getElementById('peer-name');
        var statusDot = document.getElementById('status-dot');

        var myId = ''; // Set from stable instanceId after INIT
        var history = []; // { text, fromMe, senderName, ts, msgId }
        var seenMsgIds = {}; // dedup cross-canvas + local

        function addMessage(text, fromMe, senderName, skipSave, msgId) {
          // Dedup by msgId
          if (msgId && seenMsgIds[msgId]) return;
          if (msgId) seenMsgIds[msgId] = true;

          var div = document.createElement('div');
          var nameTag = '';
          if (!fromMe && senderName) {
            nameTag = '<div style="font-size:10px;opacity:0.6;margin-bottom:2px;">' + senderName + '</div>';
          }
          div.style.cssText = 'padding:8px 12px;border-radius:12px;max-width:80%;font-size:13px;line-height:1.4;' +
            (fromMe
              ? 'align-self:flex-end;background:var(--sn-accent,#7c9a92);color:#fff;border-bottom-right-radius:4px;'
              : 'align-self:flex-start;background:var(--sn-bg,#f0f0f0);color:var(--sn-text,#333);border-bottom-left-radius:4px;');
          div.innerHTML = nameTag + '<div>' + text.replace(/</g, '&lt;') + '</div>';
          messages.appendChild(div);
          messages.scrollTop = messages.scrollHeight;

          if (!skipSave) {
            var id = msgId || (myId + '-' + Date.now());
            history.push({ text: text, fromMe: fromMe, senderName: senderName || '', ts: Date.now(), msgId: id });
            if (history.length > 100) history = history.slice(-100);
            StickerNest.setState('messages', history);
          }
        }

        function send() {
          var text = input.value.trim();
          if (!text) return;
          var msgId = myId + '-' + Date.now();
          addMessage(text, true, null, false, msgId);
          input.value = '';
          var payload = { text: text, senderId: myId, senderName: 'Kimber', ts: Date.now(), msgId: msgId };
          // Emit to local bus (same-canvas widgets)
          StickerNest.emit('chat.message', payload);
          // Emit to cross-canvas channel (other tabs/canvases)
          StickerNest.emitCrossCanvas(crossChannel, payload);
        }

        function handleIncoming(payload) {
          if (payload.senderId === myId) return;
          addMessage(payload.text, false, payload.senderName || 'Someone', false, payload.msgId);
          if (payload.senderName && peerNameEl) {
            peerNameEl.textContent = 'with ' + payload.senderName;
          }
        }

        sendBtn.addEventListener('click', send);
        input.addEventListener('keydown', function(e) { if (e.key === 'Enter') send(); });

        // Listen on local bus (same-canvas)
        StickerNest.subscribe('chat.message', handleIncoming);

        StickerNest.register({
          id: 'live-chat-v1', name: 'Live Chat', version: '1.0.0',
          permissions: ['cross-canvas'],
          events: { emits: ['chat.message'], receives: ['chat.message'] }
        });
        StickerNest.ready();

        // After INIT, set stable ID and subscribe cross-canvas
        var crossChannel = 'chat.live'; // default channel
        setTimeout(function() {
          myId = StickerNest.getInstanceId() || ('user-' + Math.random().toString(36).slice(2, 8));
          // Check config for a custom cross-canvas channel (from invite)
          var cfg = StickerNest.getConfig();
          if (cfg && cfg.crossCanvasChannel) crossChannel = cfg.crossCanvasChannel;
          StickerNest.subscribeCrossCanvas(crossChannel, handleIncoming);
          statusDot.style.background = '#4caf50';
        }, 100);

        // Restore saved messages
        StickerNest.getState('messages').then(function(saved) {
          if (saved && saved.length) {
            messages.innerHTML = '';
            history = saved;
            // Re-populate dedup set
            saved.forEach(function(m) { if (m.msgId) seenMsgIds[m.msgId] = true; });
            saved.forEach(function(m) { addMessage(m.text, m.fromMe, m.senderName, true, m.msgId); });
          }
        });
      })();
    </script>
  `,

  'wgt-price-ticker': `
    <div id="ticker-root" style="display:flex;flex-direction:column;height:100%;font-family:var(--sn-font-family,system-ui);background:var(--sn-surface,#fff);color:var(--sn-text,#1a1a2e);padding:16px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.5;margin-bottom:8px;">Price Ticker</div>
      <div id="ticker-list" style="display:flex;flex-direction:column;gap:12px;flex:1;"></div>
    </div>
    <script>
      (function() {
        var tickers = [
          { sym: 'BTC', price: 67234.50, color: '#f7931a' },
          { sym: 'ETH', price: 3456.78, color: '#627eea' },
          { sym: 'SOL', price: 142.33, color: '#9945ff' },
        ];
        var list = document.getElementById('ticker-list');

        function render() {
          list.innerHTML = '';
          tickers.forEach(function(t) {
            var change = (Math.random() * 6 - 3).toFixed(2);
            var isUp = parseFloat(change) >= 0;
            t.price = t.price * (1 + parseFloat(change) / 100);
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;background:var(--sn-bg,#f8f8f8);';
            row.innerHTML =
              '<div style="display:flex;align-items:center;gap:8px;">' +
                '<div style="width:32px;height:32px;border-radius:50%;background:' + t.color + ';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;">' + t.sym.charAt(0) + '</div>' +
                '<div><div style="font-weight:600;font-size:14px;">' + t.sym + '</div></div>' +
              '</div>' +
              '<div style="text-align:right;">' +
                '<div style="font-weight:600;font-size:14px;">$' + t.price.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + '</div>' +
                '<div style="font-size:12px;color:' + (isUp ? '#4caf50' : '#ef5350') + ';">' + (isUp ? '+' : '') + change + '%</div>' +
              '</div>';
            list.appendChild(row);
          });

          StickerNest.emit('price.update', {
            prices: tickers.map(function(t) { return { sym: t.sym, price: t.price }; }),
            ts: Date.now()
          });
        }

        render();
        setInterval(render, 3000);

        StickerNest.register({
          id: 'price-ticker-v2', name: 'Price Ticker', version: '2.0.0',
          events: { emits: ['price.update'], receives: [] }
        });
        StickerNest.ready();
      })();
    </script>
  `,

  'wgt-weather': `
    <div id="weather-root" style="display:flex;flex-direction:column;height:100%;font-family:var(--sn-font-family,system-ui);background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:#fff;padding:20px;position:relative;overflow:hidden;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.7;margin-bottom:4px;">Weather Dashboard</div>
      <div style="font-size:13px;opacity:0.8;margin-bottom:16px;" id="location">San Francisco, CA</div>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
        <div id="temp" style="font-size:48px;font-weight:300;line-height:1;">72°</div>
        <div id="icon" style="font-size:40px;">☀️</div>
      </div>
      <div id="condition" style="font-size:14px;opacity:0.9;margin-bottom:16px;">Sunny</div>
      <div id="forecast" style="display:flex;gap:8px;margin-top:auto;"></div>
    </div>
    <script>
      (function() {
        var conditions = [
          { temp: 72, icon: '☀️', label: 'Sunny' },
          { temp: 68, icon: '⛅', label: 'Partly Cloudy' },
          { temp: 65, icon: '🌧️', label: 'Light Rain' },
          { temp: 58, icon: '🌫️', label: 'Foggy' },
          { temp: 75, icon: '🌤️', label: 'Mostly Sunny' },
        ];
        var days = ['Mon','Tue','Wed','Thu','Fri'];
        var tempEl = document.getElementById('temp');
        var iconEl = document.getElementById('icon');
        var condEl = document.getElementById('condition');
        var forecastEl = document.getElementById('forecast');

        function update() {
          var c = conditions[Math.floor(Math.random() * conditions.length)];
          var jitter = Math.floor(Math.random() * 6) - 3;
          tempEl.textContent = (c.temp + jitter) + '°';
          iconEl.textContent = c.icon;
          condEl.textContent = c.label;

          forecastEl.innerHTML = '';
          days.forEach(function(d) {
            var fc = conditions[Math.floor(Math.random() * conditions.length)];
            var div = document.createElement('div');
            div.style.cssText = 'flex:1;text-align:center;padding:8px 4px;background:rgba(255,255,255,0.15);border-radius:8px;';
            div.innerHTML = '<div style="font-size:10px;opacity:0.7;">' + d + '</div>' +
              '<div style="font-size:18px;margin:4px 0;">' + fc.icon + '</div>' +
              '<div style="font-size:12px;font-weight:600;">' + (fc.temp + Math.floor(Math.random()*6)-3) + '°</div>';
            forecastEl.appendChild(div);
          });

          StickerNest.emit('weather.update', {
            temp: c.temp + jitter, condition: c.label, ts: Date.now()
          });
        }

        update();
        setInterval(update, 5000);

        StickerNest.register({
          id: 'weather-dashboard-v1', name: 'Weather Dashboard', version: '1.0.0',
          events: { emits: ['weather.update'], receives: [] }
        });
        StickerNest.ready();
      })();
    </script>
  `,

  // ===========================================================================
  // AI Agent Widget — Claude on the canvas
  // Subscribes to chat.message events and responds intelligently.
  // Place alongside Live Chat to test two-way widget communication.
  // ===========================================================================

  'wgt-ai-agent': `
    <div style="display:flex;flex-direction:column;height:100%;font-family:var(--sn-font-family,system-ui);background:linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);color:#e0e0e0;">
      <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.1);font-weight:600;font-size:13px;display:flex;align-items:center;gap:8px;">
        <div style="width:24px;height:24px;border-radius:6px;background:linear-gradient(135deg,#d4a574,#c4956a);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#1a1a2e;">C</div>
        <span>Claude Agent</span>
        <span id="agent-status" style="margin-left:auto;font-size:11px;opacity:0.5;">listening</span>
      </div>
      <div id="agent-log" style="flex:1;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:6px;font-size:12px;">
        <div style="opacity:0.4;text-align:center;padding:12px 0;">AI Agent active — listening to bus events</div>
      </div>
      <div style="padding:8px 14px;border-top:1px solid rgba(255,255,255,0.1);display:flex;gap:6px;">
        <input id="agent-input" type="text" placeholder="Say something as Claude..." style="flex:1;padding:8px 12px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:12px;font-family:inherit;background:rgba(255,255,255,0.08);color:#e0e0e0;outline:none;" />
        <button id="agent-send" style="padding:8px 12px;border:none;border-radius:8px;background:#d4a574;color:#1a1a2e;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit;">Send</button>
      </div>
    </div>
    <script>
      (function() {
        var log = document.getElementById('agent-log');
        var statusEl = document.getElementById('agent-status');
        var agentInput = document.getElementById('agent-input');
        var agentSend = document.getElementById('agent-send');
        var agentId = ''; // Set from stable instanceId after INIT
        var logHistory = []; // { text, type }
        var seenMsgIds = {}; // dedup

        var contextResponses = {
          hello: ['Hello! I am Claude, your AI agent on this canvas. How can I help?', 'Hi there! What would you like to work on?'],
          hi: ['Hey! Claude here. What can I do for you?', 'Hi! I am listening to all bus events on this canvas.'],
          help: ['I can respond to chat messages, monitor widget events, and help you test connections. Try asking me anything!'],
          weather: ['I can see weather updates coming through the bus! The Weather Dashboard widget emits temperature data every few seconds.'],
          price: ['The Price Ticker broadcasts BTC, ETH, and SOL prices via price.update events. I can see them on the bus!'],
          widget: ['Widgets communicate through the StickerNest event bus. Each widget emits and subscribes to typed events — I am one of those widgets!'],
          canvas: ['This canvas is your workspace. You can place widgets, connect them with pipelines, and I will help monitor the data flow.'],
          test: ['Everything looks good! The bus is running, events are flowing, and widget connections are active.'],
          how: ['I work by subscribing to bus events. When you send a chat message, it flows through the bus and I pick it up, process it, and respond.'],
          connect: ['Widget connections work through invites. When you accept an invite, the widget gets placed on your canvas and connects via the event bus.'],
          invite: ['The invite system lets users share widgets with each other. Mutual follows can send direct invites, and creators can broadcast to all followers.'],
        };

        var fallbackResponses = [
          'Interesting! Tell me more about what you are working on.',
          'I am processing that. What else would you like to know?',
          'Got it! I am here if you need help with anything on the canvas.',
          'That is a great question. Let me think about how the widget system handles that...',
          'I can see events flowing through the bus. Everything looks healthy!',
          'As an AI agent on the canvas, I can monitor all widget communication. Pretty cool, right?',
        ];
        var fallbackIdx = 0;

        function addLog(text, type, skipSave) {
          var div = document.createElement('div');
          var colors = {
            received: 'rgba(100,200,255,0.15)',
            sent: 'rgba(212,165,116,0.2)',
            system: 'rgba(255,255,255,0.05)',
            thinking: 'rgba(212,165,116,0.1)',
          };
          div.style.cssText = 'padding:8px 10px;border-radius:8px;background:' + (colors[type] || colors.system) + ';line-height:1.4;';

          var prefix = '';
          if (type === 'received') prefix = '<span style="color:#64b5f6;font-weight:600;">IN</span> ';
          if (type === 'sent') prefix = '<span style="color:#d4a574;font-weight:600;">OUT</span> ';
          if (type === 'thinking') prefix = '<span style="color:#d4a574;opacity:0.6;">...</span> ';

          div.innerHTML = prefix + text.replace(/</g, '&lt;');
          log.appendChild(div);
          log.scrollTop = log.scrollHeight;

          if (!skipSave && type !== 'thinking') {
            logHistory.push({ text: text, type: type });
            if (logHistory.length > 100) logHistory = logHistory.slice(-100);
            StickerNest.setState('log', logHistory);
          }
          return div;
        }

        function getResponse(text) {
          var lower = text.toLowerCase();
          var keys = Object.keys(contextResponses);
          for (var i = 0; i < keys.length; i++) {
            if (lower.indexOf(keys[i]) !== -1) {
              var options = contextResponses[keys[i]];
              return options[Math.floor(Math.random() * options.length)];
            }
          }
          var resp = fallbackResponses[fallbackIdx % fallbackResponses.length];
          fallbackIdx++;
          return resp;
        }

        function handleIncoming(payload) {
          if (payload.senderId === agentId) return;
          // Dedup
          if (payload.msgId && seenMsgIds[payload.msgId]) return;
          if (payload.msgId) seenMsgIds[payload.msgId] = true;

          var sender = payload.senderName || 'Unknown';
          addLog(sender + ': ' + payload.text, 'received');
          statusEl.textContent = 'thinking...';
          statusEl.style.color = '#d4a574';

          var thinkingEl = addLog('generating response...', 'thinking');

          setTimeout(function() {
            if (thinkingEl.parentNode) log.removeChild(thinkingEl);
            var response = getResponse(payload.text);
            var msgId = agentId + '-' + Date.now();
            addLog(response, 'sent');
            statusEl.textContent = 'listening';
            statusEl.style.color = '';

            var responsePayload = {
              text: response,
              senderId: agentId,
              senderName: 'Claude',
              ts: Date.now(),
              msgId: msgId
            };
            // Emit to local bus and cross-canvas
            StickerNest.emit('chat.message', responsePayload);
            StickerNest.emitCrossCanvas(agentCrossChannel, responsePayload);
          }, 1000 + Math.random() * 1500);
        }

        // Manual send from agent input
        function agentManualSend() {
          var text = agentInput.value.trim();
          if (!text) return;
          agentInput.value = '';
          var msgId = agentId + '-' + Date.now();
          addLog(text, 'sent');
          var payload = { text: text, senderId: agentId, senderName: 'Claude', ts: Date.now(), msgId: msgId };
          StickerNest.emit('chat.message', payload);
          StickerNest.emitCrossCanvas(agentCrossChannel, payload);
        }

        agentSend.addEventListener('click', agentManualSend);
        agentInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') agentManualSend(); });

        // Listen for chat messages on local bus
        StickerNest.subscribe('chat.message', handleIncoming);

        // Also monitor other events for the log
        StickerNest.subscribe('weather.update', function(payload) {
          addLog('weather: ' + payload.temp + '° ' + payload.condition, 'system');
        });

        StickerNest.subscribe('price.update', function(payload) {
          if (payload.prices && payload.prices.length > 0) {
            var summary = payload.prices.map(function(p) { return p.sym + ' $' + p.price.toFixed(0); }).join(' | ');
            addLog('prices: ' + summary, 'system');
          }
        });

        StickerNest.register({
          id: 'ai-agent-v1', name: 'Claude Agent', version: '1.0.0',
          permissions: ['cross-canvas'],
          events: {
            emits: ['chat.message'],
            receives: ['chat.message', 'weather.update', 'price.update']
          }
        });
        StickerNest.ready();

        // After INIT, set stable ID and subscribe cross-canvas
        var agentCrossChannel = 'chat.live'; // default channel
        setTimeout(function() {
          agentId = StickerNest.getInstanceId() || 'claude-agent';
          var cfg = StickerNest.getConfig();
          if (cfg && cfg.crossCanvasChannel) agentCrossChannel = cfg.crossCanvasChannel;
          StickerNest.subscribeCrossCanvas(agentCrossChannel, handleIncoming);
          statusEl.textContent = 'listening (cross-canvas)';
        }, 100);

        // Restore saved log
        StickerNest.getState('log').then(function(saved) {
          if (saved && saved.length) {
            log.innerHTML = '';
            logHistory = saved;
            saved.forEach(function(entry) { addLog(entry.text, entry.type, true); });
          } else {
            addLog('Claude Agent initialized. Listening for chat.message, weather.update, price.update events.', 'system');
          }
        });
      })();
    </script>
  `,

  'wgt-tictactoe': `
    <div id="ttt-root" style="display:flex;flex-direction:column;height:100%;font-family:var(--sn-font-family,system-ui);background:var(--sn-surface,#fff);color:var(--sn-text,#1a1a2e);overflow:hidden;">
      <!-- Lobby Screen -->
      <div id="lobby" style="display:flex;flex-direction:column;height:100%;padding:16px;">
        <div style="text-align:center;padding:16px 0 8px;">
          <div style="font-size:22px;font-weight:700;letter-spacing:-0.5px;">Tic-Tac-Toe</div>
          <div style="font-size:11px;opacity:0.5;margin-top:4px;">Cross-canvas multiplayer</div>
        </div>
        <button id="create-btn" style="margin:12px 0;padding:12px 0;border:none;border-radius:10px;background:var(--sn-accent,#7c9a92);color:#fff;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;transition:opacity 0.15s;">Create Room</button>
        <div id="waiting" style="display:none;text-align:center;padding:16px 0;">
          <div style="font-size:13px;font-weight:600;">Waiting for opponent...</div>
          <div id="room-code" style="font-size:11px;opacity:0.5;margin-top:4px;"></div>
        </div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.4;margin-top:12px;margin-bottom:6px;">Available Rooms</div>
        <div id="rooms-list" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
          <div id="no-rooms" style="font-size:12px;opacity:0.4;text-align:center;padding:20px 0;">No rooms available yet</div>
        </div>
      </div>
      <!-- Game Screen -->
      <div id="game" style="display:none;flex-direction:column;height:100%;padding:16px;">
        <div id="players" style="text-align:center;font-size:13px;font-weight:600;padding:6px 0;"></div>
        <div id="turn-indicator" style="text-align:center;font-size:12px;opacity:0.7;padding:4px 0 12px;"></div>
        <div id="board" style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;aspect-ratio:1;max-width:260px;width:100%;margin:0 auto;"></div>
      </div>
      <!-- Result Screen -->
      <div id="result" style="display:none;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:16px;gap:16px;">
        <div id="result-text" style="font-size:28px;font-weight:700;"></div>
        <div id="result-sub" style="font-size:13px;opacity:0.6;"></div>
        <button id="play-again" style="margin-top:12px;padding:12px 32px;border:none;border-radius:10px;background:var(--sn-accent,#7c9a92);color:#fff;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;">Play Again</button>
      </div>
    </div>
    <script>
      (function() {
        var LOBBY_CH = 'game.lobby';
        var myPlayerId = '';
        var myName = 'Player';
        var roomId = null;
        var isHost = false;
        var opponentName = '';
        var gameActive = false;
        var board = [null,null,null,null,null,null,null,null,null];
        var currentTurn = 0;
        var myMark = 'X';
        var rooms = {}; // roomId -> { hostName, hostId }
        var gameChannelSub = null;

        var WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

        // DOM refs
        var lobbyEl = document.getElementById('lobby');
        var gameEl = document.getElementById('game');
        var resultEl = document.getElementById('result');
        var createBtn = document.getElementById('create-btn');
        var waitingEl = document.getElementById('waiting');
        var roomCodeEl = document.getElementById('room-code');
        var roomsListEl = document.getElementById('rooms-list');
        var noRoomsEl = document.getElementById('no-rooms');
        var playersEl = document.getElementById('players');
        var turnEl = document.getElementById('turn-indicator');
        var boardEl = document.getElementById('board');
        var resultText = document.getElementById('result-text');
        var resultSub = document.getElementById('result-sub');
        var playAgainBtn = document.getElementById('play-again');

        function generateRoomId() {
          return 'r-' + Math.random().toString(36).slice(2, 8);
        }

        function showScreen(name) {
          lobbyEl.style.display = name === 'lobby' ? 'flex' : 'none';
          gameEl.style.display = name === 'game' ? 'flex' : 'none';
          resultEl.style.display = name === 'result' ? 'flex' : 'none';
        }

        function renderRoomsList() {
          var keys = Object.keys(rooms);
          if (keys.length === 0) {
            noRoomsEl.style.display = 'block';
            // Remove any room cards
            var cards = roomsListEl.querySelectorAll('.room-card');
            for (var i = 0; i < cards.length; i++) roomsListEl.removeChild(cards[i]);
            return;
          }
          noRoomsEl.style.display = 'none';
          // Clear old cards
          var old = roomsListEl.querySelectorAll('.room-card');
          for (var j = 0; j < old.length; j++) roomsListEl.removeChild(old[j]);
          for (var k = 0; k < keys.length; k++) {
            (function(rid) {
              var r = rooms[rid];
              var card = document.createElement('div');
              card.className = 'room-card';
              card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--sn-border,#e0e0e0);border-radius:8px;background:var(--sn-bg,#f5f5f5);';
              var info = document.createElement('div');
              info.style.cssText = 'font-size:13px;font-weight:500;';
              info.textContent = r.hostName + "'s room";
              var joinBtn = document.createElement('button');
              joinBtn.style.cssText = 'padding:6px 14px;border:none;border-radius:6px;background:var(--sn-accent,#7c9a92);color:#fff;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit;';
              joinBtn.textContent = 'Join';
              joinBtn.addEventListener('click', function() { joinRoom(rid, r); });
              card.appendChild(info);
              card.appendChild(joinBtn);
              roomsListEl.appendChild(card);
            })(keys[k]);
          }
        }

        function renderBoard() {
          boardEl.innerHTML = '';
          for (var i = 0; i < 9; i++) {
            (function(idx) {
              var cell = document.createElement('div');
              cell.style.cssText = 'display:flex;align-items:center;justify-content:center;background:var(--sn-bg,#f5f5f5);border-radius:8px;font-size:32px;font-weight:700;cursor:pointer;aspect-ratio:1;transition:background 0.12s;user-select:none;';
              if (board[idx] === 'X') {
                cell.textContent = 'X';
                cell.style.color = 'var(--sn-accent,#7c9a92)';
              } else if (board[idx] === 'O') {
                cell.textContent = 'O';
                cell.style.color = '#e17055';
              }
              cell.addEventListener('click', function() { onCellClick(idx); });
              cell.addEventListener('mouseenter', function() { if (!board[idx] && isMyTurn()) cell.style.background = 'var(--sn-border,#e0e0e0)'; });
              cell.addEventListener('mouseleave', function() { cell.style.background = 'var(--sn-bg,#f5f5f5)'; });
              boardEl.appendChild(cell);
            })(i);
          }
        }

        function isMyTurn() {
          if (!gameActive) return false;
          if (isHost) return currentTurn % 2 === 0;
          return currentTurn % 2 === 1;
        }

        function updateTurnIndicator() {
          if (isMyTurn()) {
            turnEl.textContent = 'Your turn (' + myMark + ')';
            turnEl.style.fontWeight = '600';
            turnEl.style.opacity = '1';
          } else {
            turnEl.textContent = "Opponent's turn";
            turnEl.style.fontWeight = '400';
            turnEl.style.opacity = '0.5';
          }
        }

        function checkWin(mark) {
          for (var i = 0; i < WIN_LINES.length; i++) {
            var line = WIN_LINES[i];
            if (board[line[0]] === mark && board[line[1]] === mark && board[line[2]] === mark) return true;
          }
          return false;
        }

        function checkDraw() {
          for (var i = 0; i < 9; i++) { if (board[i] === null) return false; }
          return true;
        }

        function showResult(outcome) {
          gameActive = false;
          if (outcome === 'win') {
            resultText.textContent = 'You Win!';
            resultText.style.color = 'var(--sn-accent,#7c9a92)';
            resultSub.textContent = opponentName + ' was no match for you';
          } else if (outcome === 'lose') {
            resultText.textContent = 'You Lose!';
            resultText.style.color = '#e17055';
            resultSub.textContent = opponentName + ' wins this round';
          } else {
            resultText.textContent = 'Draw!';
            resultText.style.color = 'var(--sn-text,#1a1a2e)';
            resultSub.textContent = 'Evenly matched';
          }
          showScreen('result');
        }

        function onCellClick(idx) {
          if (!gameActive || !isMyTurn() || board[idx] !== null) return;
          board[idx] = myMark;
          currentTurn++;
          renderBoard();
          // Emit move
          StickerNest.emitCrossCanvas('game.' + roomId + '.move', {
            type: 'move', cell: idx, mark: myMark, turn: currentTurn
          });
          // Check result
          if (checkWin(myMark)) { showResult('win'); return; }
          if (checkDraw()) { showResult('draw'); return; }
          updateTurnIndicator();
        }

        function handleMove(payload) {
          if (payload.type !== 'move') return;
          if (payload.mark === myMark) return; // Ignore own moves
          board[payload.cell] = payload.mark;
          currentTurn = payload.turn;
          renderBoard();
          // Check if opponent won
          if (checkWin(payload.mark)) { showResult('lose'); return; }
          if (checkDraw()) { showResult('draw'); return; }
          updateTurnIndicator();
        }

        function startGame(hostName, guestName, amHost) {
          isHost = amHost;
          myMark = isHost ? 'X' : 'O';
          opponentName = isHost ? guestName : hostName;
          board = [null,null,null,null,null,null,null,null,null];
          currentTurn = 0;
          gameActive = true;
          playersEl.textContent = (isHost ? myName : opponentName) + ' (X) vs ' + (isHost ? opponentName : myName) + ' (O)';
          renderBoard();
          updateTurnIndicator();
          showScreen('game');
        }

        function createRoom() {
          roomId = generateRoomId();
          isHost = true;
          createBtn.style.display = 'none';
          waitingEl.style.display = 'block';
          roomCodeEl.textContent = 'Room: ' + roomId;
          // Subscribe to game channel
          StickerNest.subscribeCrossCanvas('game.' + roomId + '.move', handleMove);
          // Broadcast room availability
          StickerNest.emitCrossCanvas(LOBBY_CH, {
            type: 'room.created', roomId: roomId, hostId: myPlayerId, hostName: myName
          });
          // Re-broadcast periodically so new tabs see it
          var broadcastInterval = setInterval(function() {
            if (gameActive) { clearInterval(broadcastInterval); return; }
            StickerNest.emitCrossCanvas(LOBBY_CH, {
              type: 'room.created', roomId: roomId, hostId: myPlayerId, hostName: myName
            });
          }, 2000);
        }

        function joinRoom(rid, r) {
          roomId = rid;
          isHost = false;
          // Subscribe to game channel
          StickerNest.subscribeCrossCanvas('game.' + roomId + '.move', handleMove);
          // Notify host
          StickerNest.emitCrossCanvas(LOBBY_CH, {
            type: 'room.joined', roomId: rid, guestId: myPlayerId, guestName: myName
          });
          // Start game as guest
          startGame(r.hostName, myName, false);
        }

        function handleLobbyMessage(payload) {
          if (!payload || !payload.type) return;
          if (payload.type === 'room.created') {
            if (payload.hostId === myPlayerId) return; // own room
            rooms[payload.roomId] = { hostName: payload.hostName, hostId: payload.hostId };
            renderRoomsList();
          }
          if (payload.type === 'room.closed') {
            delete rooms[payload.roomId];
            renderRoomsList();
          }
          if (payload.type === 'room.joined') {
            if (payload.roomId === roomId && isHost) {
              opponentName = payload.guestName || 'Guest';
              // Notify lobby that room is taken
              StickerNest.emitCrossCanvas(LOBBY_CH, { type: 'room.closed', roomId: roomId });
              // Notify guest to confirm game start
              StickerNest.emitCrossCanvas('game.' + roomId + '.move', {
                type: 'game.start', hostName: myName, guestName: opponentName
              });
              startGame(myName, opponentName, true);
            }
          }
        }

        function resetToLobby() {
          roomId = null;
          isHost = false;
          opponentName = '';
          gameActive = false;
          board = [null,null,null,null,null,null,null,null,null];
          currentTurn = 0;
          rooms = {};
          createBtn.style.display = 'block';
          waitingEl.style.display = 'none';
          renderRoomsList();
          showScreen('lobby');
          // Re-announce presence to discover rooms
          StickerNest.emitCrossCanvas(LOBBY_CH, { type: 'discover' });
        }

        createBtn.addEventListener('click', createRoom);
        playAgainBtn.addEventListener('click', resetToLobby);

        // Register manifest and signal ready
        StickerNest.register({
          id: 'tictactoe-v1', name: 'Tic-Tac-Toe', version: '1.0.0',
          permissions: ['cross-canvas'],
          events: { emits: ['game.lobby', 'game.move'], receives: ['game.lobby', 'game.move'] }
        });
        StickerNest.ready();

        // After INIT, set stable ID and subscribe to lobby
        setTimeout(function() {
          myPlayerId = StickerNest.getInstanceId() || ('p-' + Math.random().toString(36).slice(2, 8));
          var cfg = StickerNest.getConfig();
          if (cfg && cfg.playerName) myName = cfg.playerName;
          StickerNest.subscribeCrossCanvas(LOBBY_CH, handleLobbyMessage);
        }, 100);
      })();
    </script>
  `,

  'wgt-connect4': `
    <div id="c4-root" style="display:flex;flex-direction:column;height:100%;font-family:var(--sn-font-family,system-ui);background:var(--sn-surface,#fff);color:var(--sn-text,#1a1a2e);overflow:hidden;">
      <!-- Lobby Screen -->
      <div id="lobby" style="display:flex;flex-direction:column;height:100%;padding:16px;">
        <div style="text-align:center;padding:16px 0 8px;">
          <div style="font-size:22px;font-weight:700;letter-spacing:-0.5px;">Connect Four</div>
          <div style="font-size:11px;opacity:0.5;margin-top:4px;">Cross-canvas multiplayer</div>
        </div>
        <button id="create-btn" style="margin:12px 0;padding:12px 0;border:none;border-radius:10px;background:var(--sn-accent,#7c9a92);color:#fff;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;transition:opacity 0.15s;">Create Room</button>
        <div id="waiting" style="display:none;text-align:center;padding:16px 0;">
          <div style="font-size:13px;font-weight:600;">Waiting for opponent...</div>
          <div id="room-code" style="font-size:11px;opacity:0.5;margin-top:4px;"></div>
        </div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.4;margin-top:12px;margin-bottom:6px;">Available Rooms</div>
        <div id="rooms-list" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
          <div id="no-rooms" style="font-size:12px;opacity:0.4;text-align:center;padding:20px 0;">No rooms available yet</div>
        </div>
      </div>
      <!-- Game Screen -->
      <div id="game" style="display:none;flex-direction:column;height:100%;padding:12px;">
        <div id="players" style="text-align:center;font-size:13px;font-weight:600;padding:4px 0;"></div>
        <div id="turn-indicator" style="text-align:center;font-size:12px;opacity:0.7;padding:4px 0 8px;"></div>
        <div id="board-wrapper" style="flex:1;display:flex;align-items:center;justify-content:center;">
          <div id="board" style="display:grid;grid-template-columns:repeat(7,1fr);grid-template-rows:repeat(6,1fr);gap:4px;background:#1565c0;border-radius:10px;padding:6px;width:100%;max-width:320px;aspect-ratio:7/6;"></div>
        </div>
      </div>
      <!-- Result Screen -->
      <div id="result" style="display:none;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:16px;gap:16px;">
        <div id="result-text" style="font-size:28px;font-weight:700;"></div>
        <div id="result-sub" style="font-size:13px;opacity:0.6;"></div>
        <button id="play-again" style="margin-top:12px;padding:12px 32px;border:none;border-radius:10px;background:var(--sn-accent,#7c9a92);color:#fff;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;">Play Again</button>
      </div>
    </div>
    <style>
      .c4-cell { width:100%;aspect-ratio:1;border-radius:50%;transition:background 0.25s,transform 0.15s; }
      .c4-col:hover .c4-cell.c4-empty { background:rgba(255,255,255,0.35) !important; }
    </style>
    <script>
      (function() {
        var LOBBY_CH = 'game.lobby';
        var ROWS = 6;
        var COLS = 7;
        var myPlayerId = '';
        var myName = 'Player';
        var roomId = null;
        var isHost = false;
        var opponentName = '';
        var gameActive = false;
        var board = [];
        var currentTurn = 0;
        var myMark = 'R';
        var rooms = {};
        var gameChannelSub = null;

        function initBoard() {
          board = [];
          for (var r = 0; r < ROWS; r++) {
            board.push([null, null, null, null, null, null, null]);
          }
        }
        initBoard();

        // DOM refs
        var lobbyEl = document.getElementById('lobby');
        var gameEl = document.getElementById('game');
        var resultEl = document.getElementById('result');
        var createBtn = document.getElementById('create-btn');
        var waitingEl = document.getElementById('waiting');
        var roomCodeEl = document.getElementById('room-code');
        var roomsListEl = document.getElementById('rooms-list');
        var noRoomsEl = document.getElementById('no-rooms');
        var playersEl = document.getElementById('players');
        var turnEl = document.getElementById('turn-indicator');
        var boardEl = document.getElementById('board');
        var resultText = document.getElementById('result-text');
        var resultSub = document.getElementById('result-sub');
        var playAgainBtn = document.getElementById('play-again');

        function generateRoomId() {
          return 'c4-' + Math.random().toString(36).slice(2, 8);
        }

        function showScreen(name) {
          lobbyEl.style.display = name === 'lobby' ? 'flex' : 'none';
          gameEl.style.display = name === 'game' ? 'flex' : 'none';
          resultEl.style.display = name === 'result' ? 'flex' : 'none';
        }

        function renderRoomsList() {
          var keys = Object.keys(rooms);
          if (keys.length === 0) {
            noRoomsEl.style.display = 'block';
            var cards = roomsListEl.querySelectorAll('.room-card');
            for (var i = 0; i < cards.length; i++) roomsListEl.removeChild(cards[i]);
            return;
          }
          noRoomsEl.style.display = 'none';
          var old = roomsListEl.querySelectorAll('.room-card');
          for (var j = 0; j < old.length; j++) roomsListEl.removeChild(old[j]);
          for (var k = 0; k < keys.length; k++) {
            (function(rid) {
              var r = rooms[rid];
              var card = document.createElement('div');
              card.className = 'room-card';
              card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--sn-border,#e0e0e0);border-radius:8px;background:var(--sn-bg,#f5f5f5);';
              var info = document.createElement('div');
              info.style.cssText = 'font-size:13px;font-weight:500;';
              info.textContent = r.hostName + "'s room";
              var joinBtn = document.createElement('button');
              joinBtn.style.cssText = 'padding:6px 14px;border:none;border-radius:6px;background:var(--sn-accent,#7c9a92);color:#fff;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit;';
              joinBtn.textContent = 'Join';
              joinBtn.addEventListener('click', function() { joinRoom(rid, r); });
              card.appendChild(info);
              card.appendChild(joinBtn);
              roomsListEl.appendChild(card);
            })(keys[k]);
          }
        }

        function findLowestEmptyRow(col) {
          for (var r = ROWS - 1; r >= 0; r--) {
            if (board[r][col] === null) return r;
          }
          return -1;
        }

        function renderBoard() {
          boardEl.innerHTML = '';
          for (var c = 0; c < COLS; c++) {
            (function(col) {
              var colDiv = document.createElement('div');
              colDiv.className = 'c4-col';
              colDiv.style.cssText = 'display:flex;flex-direction:column;gap:4px;cursor:pointer;';
              for (var r = 0; r < ROWS; r++) {
                var cell = document.createElement('div');
                cell.className = 'c4-cell';
                var val = board[r][col];
                if (val === 'R') {
                  cell.style.cssText = 'width:100%;aspect-ratio:1;border-radius:50%;background:#f44336;transition:background 0.25s,transform 0.15s;box-shadow:inset 0 -2px 4px rgba(0,0,0,0.2);';
                } else if (val === 'Y') {
                  cell.style.cssText = 'width:100%;aspect-ratio:1;border-radius:50%;background:#ffeb3b;transition:background 0.25s,transform 0.15s;box-shadow:inset 0 -2px 4px rgba(0,0,0,0.15);';
                } else {
                  cell.className = 'c4-cell c4-empty';
                  cell.style.cssText = 'width:100%;aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,0.2);transition:background 0.25s,transform 0.15s;';
                }
                colDiv.appendChild(cell);
              }
              colDiv.addEventListener('click', function() { onColumnClick(col); });
              boardEl.appendChild(colDiv);
            })(c);
          }
        }

        function isMyTurn() {
          if (!gameActive) return false;
          if (isHost) return currentTurn % 2 === 0;
          return currentTurn % 2 === 1;
        }

        function updateTurnIndicator() {
          if (isMyTurn()) {
            turnEl.textContent = 'Your turn (' + (myMark === 'R' ? 'Red' : 'Yellow') + ')';
            turnEl.style.fontWeight = '600';
            turnEl.style.opacity = '1';
          } else {
            turnEl.textContent = "Opponent's turn";
            turnEl.style.fontWeight = '400';
            turnEl.style.opacity = '0.5';
          }
        }

        function checkWin(mark) {
          var r, c;
          // Horizontal
          for (r = 0; r < ROWS; r++) {
            for (c = 0; c <= COLS - 4; c++) {
              if (board[r][c] === mark && board[r][c+1] === mark && board[r][c+2] === mark && board[r][c+3] === mark) return true;
            }
          }
          // Vertical
          for (c = 0; c < COLS; c++) {
            for (r = 0; r <= ROWS - 4; r++) {
              if (board[r][c] === mark && board[r+1][c] === mark && board[r+2][c] === mark && board[r+3][c] === mark) return true;
            }
          }
          // Diagonal down-right
          for (r = 0; r <= ROWS - 4; r++) {
            for (c = 0; c <= COLS - 4; c++) {
              if (board[r][c] === mark && board[r+1][c+1] === mark && board[r+2][c+2] === mark && board[r+3][c+3] === mark) return true;
            }
          }
          // Diagonal down-left
          for (r = 0; r <= ROWS - 4; r++) {
            for (c = 3; c < COLS; c++) {
              if (board[r][c] === mark && board[r+1][c-1] === mark && board[r+2][c-2] === mark && board[r+3][c-3] === mark) return true;
            }
          }
          return false;
        }

        function checkDraw() {
          for (var c = 0; c < COLS; c++) {
            if (board[0][c] === null) return false;
          }
          return true;
        }

        function showResult(outcome) {
          gameActive = false;
          if (outcome === 'win') {
            resultText.textContent = 'You Win!';
            resultText.style.color = myMark === 'R' ? '#f44336' : '#f9a825';
            resultSub.textContent = opponentName + ' was no match for you';
          } else if (outcome === 'lose') {
            var oppMark = myMark === 'R' ? 'Y' : 'R';
            resultText.textContent = 'You Lose!';
            resultText.style.color = oppMark === 'R' ? '#f44336' : '#f9a825';
            resultSub.textContent = opponentName + ' wins this round';
          } else {
            resultText.textContent = 'Draw!';
            resultText.style.color = 'var(--sn-text,#1a1a2e)';
            resultSub.textContent = 'The board is full!';
          }
          showScreen('result');
        }

        function onColumnClick(col) {
          if (!gameActive || !isMyTurn()) return;
          var row = findLowestEmptyRow(col);
          if (row === -1) return;
          board[row][col] = myMark;
          currentTurn++;
          renderBoard();
          StickerNest.emitCrossCanvas('game.' + roomId + '.move', {
            type: 'move', col: col, row: row, mark: myMark, turn: currentTurn
          });
          if (checkWin(myMark)) { showResult('win'); return; }
          if (checkDraw()) { showResult('draw'); return; }
          updateTurnIndicator();
        }

        function handleMove(payload) {
          if (payload.type !== 'move') return;
          if (payload.mark === myMark) return;
          board[payload.row][payload.col] = payload.mark;
          currentTurn = payload.turn;
          renderBoard();
          if (checkWin(payload.mark)) { showResult('lose'); return; }
          if (checkDraw()) { showResult('draw'); return; }
          updateTurnIndicator();
        }

        function startGame(hostName, guestName, amHost) {
          isHost = amHost;
          myMark = isHost ? 'R' : 'Y';
          opponentName = isHost ? guestName : hostName;
          initBoard();
          currentTurn = 0;
          gameActive = true;
          var redName = isHost ? myName : opponentName;
          var yellowName = isHost ? opponentName : myName;
          playersEl.innerHTML = '<span style="color:#f44336;font-weight:700;">' + redName + '</span> vs <span style="color:#f9a825;font-weight:700;">' + yellowName + '</span>';
          renderBoard();
          updateTurnIndicator();
          showScreen('game');
        }

        function createRoom() {
          roomId = generateRoomId();
          isHost = true;
          createBtn.style.display = 'none';
          waitingEl.style.display = 'block';
          roomCodeEl.textContent = 'Room: ' + roomId;
          StickerNest.subscribeCrossCanvas('game.' + roomId + '.move', handleMove);
          StickerNest.emitCrossCanvas(LOBBY_CH, {
            type: 'room.created', roomId: roomId, hostId: myPlayerId, hostName: myName, gameId: 'connect4'
          });
          var broadcastInterval = setInterval(function() {
            if (gameActive) { clearInterval(broadcastInterval); return; }
            StickerNest.emitCrossCanvas(LOBBY_CH, {
              type: 'room.created', roomId: roomId, hostId: myPlayerId, hostName: myName, gameId: 'connect4'
            });
          }, 2000);
        }

        function joinRoom(rid, r) {
          roomId = rid;
          isHost = false;
          StickerNest.subscribeCrossCanvas('game.' + roomId + '.move', handleMove);
          StickerNest.emitCrossCanvas(LOBBY_CH, {
            type: 'room.joined', roomId: rid, guestId: myPlayerId, guestName: myName, gameId: 'connect4'
          });
          startGame(r.hostName, myName, false);
        }

        function handleLobbyMessage(payload) {
          if (!payload || !payload.type) return;
          if (payload.gameId && payload.gameId !== 'connect4') return;
          if (payload.type === 'room.created') {
            if (payload.hostId === myPlayerId) return;
            rooms[payload.roomId] = { hostName: payload.hostName, hostId: payload.hostId };
            renderRoomsList();
          }
          if (payload.type === 'room.closed') {
            delete rooms[payload.roomId];
            renderRoomsList();
          }
          if (payload.type === 'room.joined') {
            if (payload.roomId === roomId && isHost) {
              opponentName = payload.guestName || 'Guest';
              StickerNest.emitCrossCanvas(LOBBY_CH, { type: 'room.closed', roomId: roomId });
              StickerNest.emitCrossCanvas('game.' + roomId + '.move', {
                type: 'game.start', hostName: myName, guestName: opponentName
              });
              startGame(myName, opponentName, true);
            }
          }
        }

        function resetToLobby() {
          roomId = null;
          isHost = false;
          opponentName = '';
          gameActive = false;
          initBoard();
          currentTurn = 0;
          rooms = {};
          createBtn.style.display = 'block';
          waitingEl.style.display = 'none';
          renderRoomsList();
          showScreen('lobby');
          StickerNest.emitCrossCanvas(LOBBY_CH, { type: 'discover', gameId: 'connect4' });
        }

        createBtn.addEventListener('click', createRoom);
        playAgainBtn.addEventListener('click', resetToLobby);

        StickerNest.register({
          id: 'connect4-v1', name: 'Connect Four', version: '1.0.0',
          permissions: ['cross-canvas'],
          events: { emits: ['game.lobby', 'game.move'], receives: ['game.lobby', 'game.move'] }
        });
        StickerNest.ready();

        setTimeout(function() {
          myPlayerId = StickerNest.getInstanceId() || ('p-' + Math.random().toString(36).slice(2, 8));
          var cfg = StickerNest.getConfig();
          if (cfg && cfg.playerName) myName = cfg.playerName;
          StickerNest.subscribeCrossCanvas(LOBBY_CH, handleLobbyMessage);
        }, 100);
      })();
    </script>
  `,

  'wgt-pong': `
    <div id="pong-root" style="display:flex;flex-direction:column;height:100%;font-family:var(--sn-font-family,system-ui);background:#000;color:#fff;overflow:hidden;">
      <!-- Lobby Screen -->
      <div id="lobby" style="display:flex;flex-direction:column;height:100%;padding:16px;">
        <div style="text-align:center;padding:16px 0 8px;">
          <div style="font-size:22px;font-weight:700;letter-spacing:-0.5px;">Pong</div>
          <div style="font-size:11px;opacity:0.5;margin-top:4px;">Cross-canvas multiplayer</div>
        </div>
        <button id="create-btn" style="margin:12px 0;padding:12px 0;border:none;border-radius:10px;background:var(--sn-accent,#7c9a92);color:#fff;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;transition:opacity 0.15s;">Create Room</button>
        <div id="waiting" style="display:none;text-align:center;padding:16px 0;">
          <div style="font-size:13px;font-weight:600;">Waiting for opponent...</div>
          <div id="room-code" style="font-size:11px;opacity:0.5;margin-top:4px;"></div>
        </div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.4;margin-top:12px;margin-bottom:6px;">Available Rooms</div>
        <div id="rooms-list" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
          <div id="no-rooms" style="font-size:12px;opacity:0.4;text-align:center;padding:20px 0;">No rooms available yet</div>
        </div>
      </div>
      <!-- Game Screen -->
      <div id="game" style="display:none;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:8px;">
        <canvas id="pong-canvas" width="400" height="300" style="width:100%;max-width:400px;background:#000;display:block;image-rendering:pixelated;"></canvas>
      </div>
      <!-- Result Screen -->
      <div id="result" style="display:none;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:16px;gap:16px;">
        <div id="result-text" style="font-size:28px;font-weight:700;"></div>
        <div id="result-sub" style="font-size:13px;opacity:0.6;"></div>
        <button id="play-again" style="margin-top:12px;padding:12px 32px;border:none;border-radius:10px;background:var(--sn-accent,#7c9a92);color:#fff;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;">Play Again</button>
      </div>
    </div>
    <script>
      (function() {
        var LOBBY_CH = 'game.lobby';
        var GAME_ID = 'pong';
        var W = 400;
        var H = 300;
        var PADDLE_W = 10;
        var PADDLE_H = 60;
        var BALL_SIZE = 8;
        var WIN_SCORE = 5;
        var INITIAL_BALL_SPEED = 3;

        var myPlayerId = '';
        var myName = 'Player';
        var roomId = null;
        var isHost = false;
        var opponentName = '';
        var gameActive = false;
        var rooms = {};
        var animFrameId = null;

        // Game state
        var paddleLeft = H / 2 - PADDLE_H / 2;
        var paddleRight = H / 2 - PADDLE_H / 2;
        var ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
        var score = { left: 0, right: 0 };
        var ballSpeed = INITIAL_BALL_SPEED;
        var guestPaddleY = H / 2 - PADDLE_H / 2;
        var lastPaddleBroadcast = 0;

        // DOM refs
        var lobbyEl = document.getElementById('lobby');
        var gameEl = document.getElementById('game');
        var resultEl = document.getElementById('result');
        var createBtn = document.getElementById('create-btn');
        var waitingEl = document.getElementById('waiting');
        var roomCodeEl = document.getElementById('room-code');
        var roomsListEl = document.getElementById('rooms-list');
        var noRoomsEl = document.getElementById('no-rooms');
        var resultText = document.getElementById('result-text');
        var resultSub = document.getElementById('result-sub');
        var playAgainBtn = document.getElementById('play-again');
        var canvas = document.getElementById('pong-canvas');
        var ctx = canvas.getContext('2d');

        function generateRoomId() {
          return 'pn-' + Math.random().toString(36).slice(2, 8);
        }

        function showScreen(name) {
          lobbyEl.style.display = name === 'lobby' ? 'flex' : 'none';
          gameEl.style.display = name === 'game' ? 'flex' : 'none';
          resultEl.style.display = name === 'result' ? 'flex' : 'none';
        }

        function renderRoomsList() {
          var keys = Object.keys(rooms);
          if (keys.length === 0) {
            noRoomsEl.style.display = 'block';
            var cards = roomsListEl.querySelectorAll('.room-card');
            for (var i = 0; i < cards.length; i++) roomsListEl.removeChild(cards[i]);
            return;
          }
          noRoomsEl.style.display = 'none';
          var old = roomsListEl.querySelectorAll('.room-card');
          for (var j = 0; j < old.length; j++) roomsListEl.removeChild(old[j]);
          for (var k = 0; k < keys.length; k++) {
            (function(rid) {
              var r = rooms[rid];
              var card = document.createElement('div');
              card.className = 'room-card';
              card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.05);';
              var info = document.createElement('div');
              info.style.cssText = 'font-size:13px;font-weight:500;';
              info.textContent = r.hostName + "'s room";
              var joinBtn = document.createElement('button');
              joinBtn.style.cssText = 'padding:6px 14px;border:none;border-radius:6px;background:var(--sn-accent,#7c9a92);color:#fff;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit;';
              joinBtn.textContent = 'Join';
              joinBtn.addEventListener('click', function() { joinRoom(rid, r); });
              card.appendChild(info);
              card.appendChild(joinBtn);
              roomsListEl.appendChild(card);
            })(keys[k]);
          }
        }

        function resetBall() {
          ball.x = W / 2;
          ball.y = H / 2;
          ballSpeed = INITIAL_BALL_SPEED;
          var dir = Math.random() > 0.5 ? 1 : -1;
          var angle = (Math.random() * 0.8 - 0.4);
          ball.vx = dir * ballSpeed * Math.cos(angle);
          ball.vy = ballSpeed * Math.sin(angle);
        }

        function clampPaddle(y) {
          if (y < 0) return 0;
          if (y > H - PADDLE_H) return H - PADDLE_H;
          return y;
        }

        function updatePhysics() {
          if (!isHost || !gameActive) return;

          // Use guest paddle position
          paddleRight = guestPaddleY;

          // Move ball
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Bounce off top/bottom
          if (ball.y <= 0) { ball.y = 0; ball.vy = -ball.vy; }
          if (ball.y >= H - BALL_SIZE) { ball.y = H - BALL_SIZE; ball.vy = -ball.vy; }

          // Left paddle collision (host)
          if (ball.vx < 0 && ball.x <= PADDLE_W + 5 && ball.x >= 0) {
            var paddleCenter = paddleLeft + PADDLE_H / 2;
            var ballCenter = ball.y + BALL_SIZE / 2;
            if (ballCenter >= paddleLeft && ballCenter <= paddleLeft + PADDLE_H) {
              ball.x = PADDLE_W + 5;
              var hitPos = (ballCenter - paddleCenter) / (PADDLE_H / 2);
              ballSpeed += 0.15;
              ball.vx = ballSpeed * Math.cos(hitPos * 0.6);
              ball.vy = ballSpeed * Math.sin(hitPos * 0.6);
              if (ball.vx < 0.5) ball.vx = 0.5;
            }
          }

          // Right paddle collision (guest)
          if (ball.vx > 0 && ball.x + BALL_SIZE >= W - PADDLE_W - 5 && ball.x <= W) {
            var paddleCenter2 = paddleRight + PADDLE_H / 2;
            var ballCenter2 = ball.y + BALL_SIZE / 2;
            if (ballCenter2 >= paddleRight && ballCenter2 <= paddleRight + PADDLE_H) {
              ball.x = W - PADDLE_W - 5 - BALL_SIZE;
              var hitPos2 = (ballCenter2 - paddleCenter2) / (PADDLE_H / 2);
              ballSpeed += 0.15;
              ball.vx = -ballSpeed * Math.cos(hitPos2 * 0.6);
              ball.vy = ballSpeed * Math.sin(hitPos2 * 0.6);
              if (ball.vx > -0.5) ball.vx = -0.5;
            }
          }

          // Score — ball passed left edge
          if (ball.x < -BALL_SIZE) {
            score.right++;
            if (score.right >= WIN_SCORE) {
              endGame();
              return;
            }
            resetBall();
          }

          // Score — ball passed right edge
          if (ball.x > W + BALL_SIZE) {
            score.left++;
            if (score.left >= WIN_SCORE) {
              endGame();
              return;
            }
            resetBall();
          }
        }

        function render() {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, W, H);

          // Center dashed line
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(W / 2, 0);
          ctx.lineTo(W / 2, H);
          ctx.stroke();
          ctx.setLineDash([]);

          // Paddles
          ctx.fillStyle = '#fff';
          ctx.fillRect(5, paddleLeft, PADDLE_W, PADDLE_H);
          ctx.fillRect(W - PADDLE_W - 5, paddleRight, PADDLE_W, PADDLE_H);

          // Ball
          ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);

          // Score
          ctx.font = 'bold 36px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('' + score.left, W / 4, 45);
          ctx.fillText('' + score.right, 3 * W / 4, 45);
        }

        function gameLoop() {
          if (!gameActive) return;

          if (isHost) {
            updatePhysics();
            // Broadcast state ~30fps
            var now = Date.now();
            if (now - lastPaddleBroadcast >= 33) {
              lastPaddleBroadcast = now;
              StickerNest.emitCrossCanvas('game.' + roomId + '.move', {
                type: 'state',
                ball: { x: ball.x, y: ball.y },
                score: { left: score.left, right: score.right },
                paddleHost: paddleLeft
              });
            }
          }

          render();
          animFrameId = requestAnimationFrame(gameLoop);
        }

        function endGame() {
          gameActive = false;
          if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }

          var hostWon = score.left >= WIN_SCORE;
          var iWon = (isHost && hostWon) || (!isHost && !hostWon);
          var winnerLabel = iWon ? 'You Win!' : 'You Lose!';
          var scoreStr = score.left + '-' + score.right;

          resultText.textContent = winnerLabel;
          resultText.style.color = iWon ? 'var(--sn-accent,#7c9a92)' : '#e17055';
          resultSub.textContent = (iWon ? myName : opponentName) + ' wins! (' + scoreStr + ')';

          // Broadcast game over
          if (isHost) {
            StickerNest.emitCrossCanvas('game.' + roomId + '.move', {
              type: 'gameover', score: { left: score.left, right: score.right }
            });
          }

          showScreen('result');
        }

        function handleGameMessage(payload) {
          if (!payload || !payload.type) return;

          if (payload.type === 'state' && !isHost) {
            // Guest receives state from host
            ball.x = payload.ball.x;
            ball.y = payload.ball.y;
            score.left = payload.score.left;
            score.right = payload.score.right;
            paddleLeft = payload.paddleHost;
          }

          if (payload.type === 'paddle' && isHost) {
            // Host receives guest paddle position
            guestPaddleY = clampPaddle(payload.y);
          }

          if (payload.type === 'gameover') {
            score.left = payload.score.left;
            score.right = payload.score.right;
            endGame();
          }

          if (payload.type === 'game.start' && !isHost) {
            startGame(payload.hostName, payload.guestName, false);
          }
        }

        function handleInput(e) {
          if (!gameActive) return;
          var rect = canvas.getBoundingClientRect();
          var clientY = e.touches ? e.touches[0].clientY : e.clientY;
          var scaleY = H / rect.height;
          var y = (clientY - rect.top) * scaleY - PADDLE_H / 2;
          y = clampPaddle(y);

          if (isHost) {
            paddleLeft = y;
          } else {
            paddleRight = y;
            // Throttle paddle broadcasts to ~30fps
            var now = Date.now();
            if (now - lastPaddleBroadcast >= 33) {
              lastPaddleBroadcast = now;
              StickerNest.emitCrossCanvas('game.' + roomId + '.move', {
                type: 'paddle', y: y
              });
            }
          }
        }

        canvas.addEventListener('mousemove', handleInput);
        canvas.addEventListener('touchmove', function(e) { e.preventDefault(); handleInput(e); }, { passive: false });

        function startGame(hostName, guestName, amHost) {
          isHost = amHost;
          opponentName = isHost ? guestName : hostName;
          score = { left: 0, right: 0 };
          paddleLeft = H / 2 - PADDLE_H / 2;
          paddleRight = H / 2 - PADDLE_H / 2;
          guestPaddleY = H / 2 - PADDLE_H / 2;
          ballSpeed = INITIAL_BALL_SPEED;
          gameActive = true;
          lastPaddleBroadcast = 0;
          resetBall();
          showScreen('game');
          animFrameId = requestAnimationFrame(gameLoop);
        }

        function createRoom() {
          roomId = generateRoomId();
          isHost = true;
          createBtn.style.display = 'none';
          waitingEl.style.display = 'block';
          roomCodeEl.textContent = 'Room: ' + roomId;
          StickerNest.subscribeCrossCanvas('game.' + roomId + '.move', handleGameMessage);
          StickerNest.emitCrossCanvas(LOBBY_CH, {
            type: 'room.created', roomId: roomId, hostId: myPlayerId, hostName: myName, gameId: GAME_ID
          });
          var broadcastInterval = setInterval(function() {
            if (gameActive) { clearInterval(broadcastInterval); return; }
            StickerNest.emitCrossCanvas(LOBBY_CH, {
              type: 'room.created', roomId: roomId, hostId: myPlayerId, hostName: myName, gameId: GAME_ID
            });
          }, 2000);
        }

        function joinRoom(rid, r) {
          roomId = rid;
          isHost = false;
          StickerNest.subscribeCrossCanvas('game.' + roomId + '.move', handleGameMessage);
          StickerNest.emitCrossCanvas(LOBBY_CH, {
            type: 'room.joined', roomId: rid, guestId: myPlayerId, guestName: myName
          });
        }

        function handleLobbyMessage(payload) {
          if (!payload || !payload.type) return;
          if (payload.type === 'room.created') {
            if (payload.hostId === myPlayerId) return;
            if (payload.gameId && payload.gameId !== GAME_ID) return;
            rooms[payload.roomId] = { hostName: payload.hostName, hostId: payload.hostId };
            renderRoomsList();
          }
          if (payload.type === 'room.closed') {
            delete rooms[payload.roomId];
            renderRoomsList();
          }
          if (payload.type === 'room.joined') {
            if (payload.roomId === roomId && isHost) {
              opponentName = payload.guestName || 'Guest';
              StickerNest.emitCrossCanvas(LOBBY_CH, { type: 'room.closed', roomId: roomId });
              StickerNest.emitCrossCanvas('game.' + roomId + '.move', {
                type: 'game.start', hostName: myName, guestName: opponentName
              });
              startGame(myName, opponentName, true);
            }
          }
        }

        function resetToLobby() {
          roomId = null;
          isHost = false;
          opponentName = '';
          gameActive = false;
          if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
          score = { left: 0, right: 0 };
          rooms = {};
          createBtn.style.display = 'block';
          waitingEl.style.display = 'none';
          renderRoomsList();
          showScreen('lobby');
          StickerNest.emitCrossCanvas(LOBBY_CH, { type: 'discover' });
        }

        createBtn.addEventListener('click', createRoom);
        playAgainBtn.addEventListener('click', resetToLobby);

        StickerNest.register({
          id: 'pong-v1', name: 'Pong', version: '1.0.0',
          permissions: ['cross-canvas'],
          events: { emits: ['game.lobby', 'game.move'], receives: ['game.lobby', 'game.move'] }
        });
        StickerNest.ready();

        setTimeout(function() {
          myPlayerId = StickerNest.getInstanceId() || ('p-' + Math.random().toString(36).slice(2, 8));
          var cfg = StickerNest.getConfig();
          if (cfg && cfg.playerName) myName = cfg.playerName;
          StickerNest.subscribeCrossCanvas(LOBBY_CH, handleLobbyMessage);
        }, 100);
      })();
    </script>
  `,

  'wgt-battleship': `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--sn-font-family, system-ui); color: var(--sn-text, #1a1a2e); overflow: hidden; }
      #bs-root { display:flex;flex-direction:column;height:100%;background:var(--sn-surface,#fff);overflow:hidden; }
      .bs-btn { padding:12px 0;border:none;border-radius:10px;background:var(--sn-accent,#7c9a92);color:#fff;font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;transition:opacity 0.15s;width:100%; }
      .bs-btn:disabled { opacity:0.4;cursor:default; }
      .bs-btn-sm { padding:6px 14px;border:none;border-radius:6px;background:var(--sn-accent,#7c9a92);color:#fff;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit; }
      .bs-grid { display:grid;grid-template-columns:repeat(10,28px);grid-template-rows:repeat(10,28px);gap:1px; }
      .bs-cell { width:28px;height:28px;border-radius:3px;cursor:pointer;transition:background 0.1s;border:1px solid rgba(0,0,0,0.08); }
      .bs-water { background:#1976d2; }
      .bs-ship { background:#455a64; }
      .bs-hit { background:#f44336; }
      .bs-miss { background:#90a4ae; }
      .bs-sunk { background:#b71c1c; }
      .bs-unknown { background:#1976d2; }
      .bs-label { font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.4;margin-bottom:4px; }
    </style>
    <div id="bs-root" style="padding:12px;">
      <!-- Lobby Screen -->
      <div id="lobby" style="display:flex;flex-direction:column;height:100%;">
        <div style="text-align:center;padding:12px 0 8px;">
          <div style="font-size:22px;font-weight:700;letter-spacing:-0.5px;">Battleship</div>
          <div style="font-size:11px;opacity:0.5;margin-top:4px;">Cross-canvas multiplayer</div>
        </div>
        <button id="create-btn" class="bs-btn" style="margin:12px 0;">Create Room</button>
        <div id="waiting" style="display:none;text-align:center;padding:16px 0;">
          <div style="font-size:13px;font-weight:600;">Waiting for opponent...</div>
          <div id="room-code" style="font-size:11px;opacity:0.5;margin-top:4px;"></div>
        </div>
        <div class="bs-label" style="margin-top:12px;">Available Rooms</div>
        <div id="rooms-list" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
          <div id="no-rooms" style="font-size:12px;opacity:0.4;text-align:center;padding:20px 0;">No rooms available yet</div>
        </div>
      </div>
      <!-- Setup Screen -->
      <div id="setup" style="display:none;flex-direction:column;align-items:center;">
        <div style="font-size:16px;font-weight:700;margin-bottom:8px;">Place Your Ships</div>
        <div id="setup-ship-info" style="font-size:13px;font-weight:500;margin-bottom:6px;"></div>
        <div id="setup-hint" style="font-size:11px;opacity:0.5;margin-bottom:8px;">Click a cell to place. Click same cell to rotate.</div>
        <div id="setup-grid" class="bs-grid"></div>
        <div id="ship-list" style="margin-top:8px;font-size:12px;display:flex;flex-wrap:wrap;gap:4px;justify-content:center;"></div>
        <button id="ready-btn" class="bs-btn" style="margin-top:10px;" disabled>Ready</button>
        <div id="waiting-opponent" style="display:none;font-size:13px;font-weight:600;margin-top:10px;text-align:center;">Waiting for opponent...</div>
      </div>
      <!-- Game Screen -->
      <div id="game" style="display:none;flex-direction:column;align-items:center;">
        <div id="turn-indicator" style="font-size:14px;font-weight:600;margin-bottom:6px;"></div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
          <div>
            <div class="bs-label">Your Fleet</div>
            <div id="my-grid" class="bs-grid"></div>
          </div>
          <div>
            <div class="bs-label">Attack Board</div>
            <div id="attack-grid" class="bs-grid"></div>
          </div>
        </div>
        <div id="sunk-log" style="font-size:11px;opacity:0.6;margin-top:6px;text-align:center;max-height:40px;overflow-y:auto;"></div>
      </div>
      <!-- Result Screen -->
      <div id="result" style="display:none;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;">
        <div id="result-text" style="font-size:28px;font-weight:700;"></div>
        <div id="result-sub" style="font-size:13px;opacity:0.6;"></div>
        <button id="play-again" class="bs-btn" style="margin-top:12px;max-width:200px;">Play Again</button>
      </div>
    </div>
    <script>
      (function() {
        var LOBBY_CH = 'game.lobby';
        var myPlayerId = '';
        var myName = 'Player';
        var roomId = null;
        var isHost = false;
        var opponentName = '';
        var gameChannel = null;
        var rooms = {};

        // Ship definitions
        var SHIP_DEFS = [
          { name: 'Carrier', size: 5, color: '#37474f' },
          { name: 'Battleship', size: 4, color: '#455a64' },
          { name: 'Cruiser', size: 3, color: '#546e7a' },
          { name: 'Submarine', size: 3, color: '#607d8b' },
          { name: 'Destroyer', size: 2, color: '#78909c' }
        ];

        // Setup state
        var placedShips = [];
        var currentShipIdx = 0;
        var lastPlacedCell = null;
        var lastPlacedHorizontal = true;

        // Game state
        var myBoard = [];
        var myHits = [];
        var attackBoard = [];
        var myShipHealth = {};
        var opponentSunkCount = 0;
        var myTurn = false;
        var gameActive = false;
        var iAmReady = false;
        var opponentReady = false;
        var pendingAttack = null;

        // DOM refs
        var lobbyEl = document.getElementById('lobby');
        var setupEl = document.getElementById('setup');
        var gameEl = document.getElementById('game');
        var resultEl = document.getElementById('result');
        var createBtn = document.getElementById('create-btn');
        var waitingEl = document.getElementById('waiting');
        var roomCodeEl = document.getElementById('room-code');
        var roomsListEl = document.getElementById('rooms-list');
        var noRoomsEl = document.getElementById('no-rooms');
        var setupGridEl = document.getElementById('setup-grid');
        var setupShipInfo = document.getElementById('setup-ship-info');
        var shipListEl = document.getElementById('ship-list');
        var readyBtn = document.getElementById('ready-btn');
        var waitingOpponent = document.getElementById('waiting-opponent');
        var turnEl = document.getElementById('turn-indicator');
        var myGridEl = document.getElementById('my-grid');
        var attackGridEl = document.getElementById('attack-grid');
        var sunkLogEl = document.getElementById('sunk-log');
        var resultText = document.getElementById('result-text');
        var resultSub = document.getElementById('result-sub');
        var playAgainBtn = document.getElementById('play-again');

        function generateRoomId() {
          return 'bs-' + Math.random().toString(36).slice(2, 8);
        }

        function showScreen(name) {
          lobbyEl.style.display = name === 'lobby' ? 'flex' : 'none';
          setupEl.style.display = name === 'setup' ? 'flex' : 'none';
          gameEl.style.display = name === 'game' ? 'flex' : 'none';
          resultEl.style.display = name === 'result' ? 'flex' : 'none';
        }

        function initBoards() {
          myBoard = [];
          myHits = [];
          attackBoard = [];
          for (var r = 0; r < 10; r++) {
            myBoard[r] = [];
            myHits[r] = [];
            attackBoard[r] = [];
            for (var c = 0; c < 10; c++) {
              myBoard[r][c] = null;
              myHits[r][c] = false;
              attackBoard[r][c] = null;
            }
          }
          myShipHealth = {};
          opponentSunkCount = 0;
          placedShips = [];
          currentShipIdx = 0;
          lastPlacedCell = null;
          lastPlacedHorizontal = true;
          iAmReady = false;
          opponentReady = false;
          pendingAttack = null;
        }

        // ── Lobby ──
        function renderRoomsList() {
          var keys = Object.keys(rooms);
          var old = roomsListEl.querySelectorAll('.room-card');
          for (var j = 0; j < old.length; j++) roomsListEl.removeChild(old[j]);
          if (keys.length === 0) {
            noRoomsEl.style.display = 'block';
            return;
          }
          noRoomsEl.style.display = 'none';
          for (var k = 0; k < keys.length; k++) {
            (function(rid) {
              var r = rooms[rid];
              var card = document.createElement('div');
              card.className = 'room-card';
              card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--sn-border,#e0e0e0);border-radius:8px;background:var(--sn-bg,#f5f5f5);';
              var info = document.createElement('div');
              info.style.cssText = 'font-size:13px;font-weight:500;';
              info.textContent = r.hostName + "'s room";
              var joinBtn = document.createElement('button');
              joinBtn.className = 'bs-btn-sm';
              joinBtn.textContent = 'Join';
              joinBtn.addEventListener('click', function() { joinRoom(rid, r); });
              card.appendChild(info);
              card.appendChild(joinBtn);
              roomsListEl.appendChild(card);
            })(keys[k]);
          }
        }

        function createRoom() {
          roomId = generateRoomId();
          isHost = true;
          createBtn.style.display = 'none';
          waitingEl.style.display = 'block';
          roomCodeEl.textContent = 'Room: ' + roomId;
          gameChannel = 'game.' + roomId + '.move';
          StickerNest.subscribeCrossCanvas(gameChannel, handleGameMessage);
          StickerNest.emitCrossCanvas(LOBBY_CH, {
            type: 'room.created', roomId: roomId, hostId: myPlayerId, hostName: myName, gameId: 'battleship'
          });
          var broadcastInterval = setInterval(function() {
            if (gameActive || iAmReady) { clearInterval(broadcastInterval); return; }
            StickerNest.emitCrossCanvas(LOBBY_CH, {
              type: 'room.created', roomId: roomId, hostId: myPlayerId, hostName: myName, gameId: 'battleship'
            });
          }, 2000);
        }

        function joinRoom(rid, r) {
          roomId = rid;
          isHost = false;
          gameChannel = 'game.' + roomId + '.move';
          StickerNest.subscribeCrossCanvas(gameChannel, handleGameMessage);
          StickerNest.emitCrossCanvas(LOBBY_CH, {
            type: 'room.joined', roomId: rid, guestId: myPlayerId, guestName: myName, gameId: 'battleship'
          });
          opponentName = r.hostName;
          initBoards();
          showScreen('setup');
          renderSetup();
        }

        function handleLobbyMessage(payload) {
          if (!payload || !payload.type) return;
          if (payload.gameId && payload.gameId !== 'battleship') return;
          if (payload.type === 'room.created') {
            if (payload.hostId === myPlayerId) return;
            rooms[payload.roomId] = { hostName: payload.hostName, hostId: payload.hostId };
            renderRoomsList();
          }
          if (payload.type === 'room.closed') {
            delete rooms[payload.roomId];
            renderRoomsList();
          }
          if (payload.type === 'room.joined') {
            if (payload.roomId === roomId && isHost) {
              opponentName = payload.guestName || 'Guest';
              StickerNest.emitCrossCanvas(LOBBY_CH, { type: 'room.closed', roomId: roomId });
              StickerNest.emitCrossCanvas(gameChannel, { type: 'game.start', hostName: myName, guestName: opponentName });
              initBoards();
              showScreen('setup');
              renderSetup();
            }
          }
        }

        // ── Setup ──
        function getSetupBoard() {
          var board = [];
          for (var r = 0; r < 10; r++) {
            board[r] = [];
            for (var c = 0; c < 10; c++) board[r][c] = null;
          }
          for (var s = 0; s < placedShips.length; s++) {
            var ship = placedShips[s];
            for (var i = 0; i < ship.cells.length; i++) {
              board[ship.cells[i].y][ship.cells[i].x] = ship;
            }
          }
          return board;
        }

        function canPlaceShip(x, y, size, horizontal, excludeIdx) {
          var board = getSetupBoard();
          if (typeof excludeIdx === 'number') {
            var ex = placedShips[excludeIdx];
            for (var ei = 0; ei < ex.cells.length; ei++) {
              board[ex.cells[ei].y][ex.cells[ei].x] = null;
            }
          }
          for (var i = 0; i < size; i++) {
            var cx = horizontal ? x + i : x;
            var cy = horizontal ? y : y + i;
            if (cx < 0 || cx >= 10 || cy < 0 || cy >= 10) return false;
            if (board[cy][cx] !== null) return false;
          }
          return true;
        }

        function shipCells(x, y, size, horizontal) {
          var cells = [];
          for (var i = 0; i < size; i++) {
            cells.push({ x: horizontal ? x + i : x, y: horizontal ? y : y + i });
          }
          return cells;
        }

        function renderSetup() {
          var board = getSetupBoard();
          if (currentShipIdx < SHIP_DEFS.length) {
            var sd = SHIP_DEFS[currentShipIdx];
            setupShipInfo.textContent = 'Place: ' + sd.name + ' (' + sd.size + ' cells)';
          } else {
            setupShipInfo.textContent = 'All ships placed!';
          }
          setupGridEl.innerHTML = '';
          for (var r = 0; r < 10; r++) {
            for (var c = 0; c < 10; c++) {
              (function(x, y) {
                var cell = document.createElement('div');
                cell.className = 'bs-cell';
                if (board[y][x]) {
                  cell.style.background = board[y][x].color;
                } else {
                  cell.className += ' bs-water';
                }
                cell.addEventListener('click', function() { onSetupCellClick(x, y); });
                setupGridEl.appendChild(cell);
              })(c, r);
            }
          }
          // Ship list
          shipListEl.innerHTML = '';
          for (var si = 0; si < SHIP_DEFS.length; si++) {
            var span = document.createElement('span');
            span.style.cssText = 'padding:2px 8px;border-radius:4px;font-size:11px;';
            if (si < placedShips.length) {
              span.style.background = SHIP_DEFS[si].color;
              span.style.color = '#fff';
              span.textContent = SHIP_DEFS[si].name + ' \u2713';
            } else if (si === currentShipIdx) {
              span.style.background = 'var(--sn-accent,#7c9a92)';
              span.style.color = '#fff';
              span.textContent = SHIP_DEFS[si].name + ' \u25C0';
            } else {
              span.style.background = 'var(--sn-border,#e0e0e0)';
              span.textContent = SHIP_DEFS[si].name;
            }
            shipListEl.appendChild(span);
          }
          readyBtn.disabled = placedShips.length < 5;
        }

        function onSetupCellClick(x, y) {
          if (currentShipIdx >= SHIP_DEFS.length) return;
          var sd = SHIP_DEFS[currentShipIdx];
          // Check if clicking same cell as last placed -> rotate
          if (lastPlacedCell && lastPlacedCell.x === x && lastPlacedCell.y === y && placedShips.length > 0) {
            var lastIdx = placedShips.length - 1;
            var lastShip = placedShips[lastIdx];
            var newH = !lastPlacedHorizontal;
            if (canPlaceShip(x, y, lastShip.size, newH, lastIdx)) {
              lastPlacedHorizontal = newH;
              placedShips[lastIdx] = {
                name: lastShip.name, size: lastShip.size, color: lastShip.color,
                cells: shipCells(x, y, lastShip.size, newH)
              };
              renderSetup();
            }
            return;
          }
          // Try placing current ship
          var horizontal = true;
          if (!canPlaceShip(x, y, sd.size, true, undefined)) {
            horizontal = false;
            if (!canPlaceShip(x, y, sd.size, false, undefined)) return;
          }
          placedShips.push({
            name: sd.name, size: sd.size, color: sd.color,
            cells: shipCells(x, y, sd.size, horizontal)
          });
          lastPlacedCell = { x: x, y: y };
          lastPlacedHorizontal = horizontal;
          currentShipIdx++;
          renderSetup();
        }

        function onReady() {
          if (placedShips.length < 5) return;
          iAmReady = true;
          readyBtn.disabled = true;
          readyBtn.textContent = 'Ready!';
          waitingOpponent.style.display = 'block';
          // Write ships to myBoard
          for (var s = 0; s < placedShips.length; s++) {
            var ship = placedShips[s];
            myShipHealth[ship.name] = ship.size;
            for (var i = 0; i < ship.cells.length; i++) {
              myBoard[ship.cells[i].y][ship.cells[i].x] = ship.name;
            }
          }
          StickerNest.emitCrossCanvas(gameChannel, { type: 'ready' });
          if (opponentReady) startGame();
        }

        readyBtn.addEventListener('click', onReady);

        function startGame() {
          gameActive = true;
          myTurn = isHost;
          renderGame();
          showScreen('game');
        }

        // ── Game ──
        function renderGame() {
          if (gameActive) {
            if (myTurn) {
              turnEl.textContent = 'Your Turn \u2014 Choose a target';
              turnEl.style.color = 'var(--sn-accent,#7c9a92)';
            } else {
              turnEl.textContent = "Opponent's Turn...";
              turnEl.style.color = 'var(--sn-text-muted,#6b7280)';
            }
          }
          // My grid
          myGridEl.innerHTML = '';
          for (var r = 0; r < 10; r++) {
            for (var c = 0; c < 10; c++) {
              var cell = document.createElement('div');
              cell.className = 'bs-cell';
              if (myHits[r][c]) {
                cell.className += myBoard[r][c] ? ' bs-hit' : ' bs-miss';
              } else if (myBoard[r][c]) {
                cell.className += ' bs-ship';
              } else {
                cell.className += ' bs-water';
              }
              myGridEl.appendChild(cell);
            }
          }
          // Attack grid
          attackGridEl.innerHTML = '';
          for (var ar = 0; ar < 10; ar++) {
            for (var ac = 0; ac < 10; ac++) {
              (function(x, y) {
                var acell = document.createElement('div');
                acell.className = 'bs-cell';
                var v = attackBoard[y][x];
                if (v === 'hit') {
                  acell.className += ' bs-hit';
                } else if (v === 'miss') {
                  acell.className += ' bs-miss';
                } else {
                  acell.className += ' bs-unknown';
                  if (myTurn && gameActive) {
                    acell.style.cursor = 'pointer';
                    acell.addEventListener('mouseenter', function() { acell.style.opacity = '0.7'; });
                    acell.addEventListener('mouseleave', function() { acell.style.opacity = '1'; });
                  }
                }
                acell.addEventListener('click', function() { onAttack(x, y); });
                attackGridEl.appendChild(acell);
              })(ac, ar);
            }
          }
        }

        function onAttack(x, y) {
          if (!gameActive || !myTurn) return;
          if (attackBoard[y][x] !== null) return;
          myTurn = false;
          pendingAttack = { x: x, y: y };
          StickerNest.emitCrossCanvas(gameChannel, { type: 'attack', x: x, y: y });
          renderGame();
        }

        function handleAttack(x, y) {
          myHits[y][x] = true;
          var shipName = myBoard[y][x];
          var hit = !!shipName;
          var sunk = null;
          if (hit && shipName) {
            myShipHealth[shipName]--;
            if (myShipHealth[shipName] <= 0) sunk = shipName;
          }
          StickerNest.emitCrossCanvas(gameChannel, { type: 'result', x: x, y: y, hit: hit, sunk: sunk });
          renderGame();
          // Check if I lost
          var allSunk = true;
          for (var key in myShipHealth) {
            if (myShipHealth[key] > 0) { allSunk = false; break; }
          }
          if (allSunk) {
            gameActive = false;
            showResultScreen('lose');
          }
        }

        function handleResult(x, y, hit, sunk) {
          attackBoard[y][x] = hit ? 'hit' : 'miss';
          if (sunk) {
            opponentSunkCount++;
            sunkLogEl.textContent = (sunkLogEl.textContent ? sunkLogEl.textContent + ' | ' : '') + 'Sunk: ' + sunk;
          }
          myTurn = true;
          renderGame();
          if (opponentSunkCount >= 5) {
            gameActive = false;
            showResultScreen('win');
          }
        }

        function showResultScreen(outcome) {
          if (outcome === 'win') {
            resultText.textContent = 'Victory!';
            resultText.style.color = 'var(--sn-accent,#7c9a92)';
            resultSub.textContent = 'You sunk all of ' + opponentName + "'s ships!";
          } else {
            resultText.textContent = 'Defeat';
            resultText.style.color = '#f44336';
            resultSub.textContent = opponentName + ' sunk your entire fleet.';
          }
          showScreen('result');
        }

        function handleGameMessage(payload) {
          if (!payload || !payload.type) return;
          if (payload.type === 'game.start') {
            if (!isHost) {
              opponentName = payload.hostName || 'Host';
            }
          }
          if (payload.type === 'ready') {
            opponentReady = true;
            if (iAmReady) startGame();
          }
          if (payload.type === 'attack') {
            handleAttack(payload.x, payload.y);
          }
          if (payload.type === 'result') {
            handleResult(payload.x, payload.y, payload.hit, payload.sunk);
          }
        }

        function resetToLobby() {
          roomId = null;
          isHost = false;
          opponentName = '';
          gameActive = false;
          gameChannel = null;
          rooms = {};
          initBoards();
          sunkLogEl.textContent = '';
          createBtn.style.display = 'block';
          waitingEl.style.display = 'none';
          readyBtn.disabled = true;
          readyBtn.textContent = 'Ready';
          waitingOpponent.style.display = 'none';
          renderRoomsList();
          showScreen('lobby');
          StickerNest.emitCrossCanvas(LOBBY_CH, { type: 'discover', gameId: 'battleship' });
        }

        createBtn.addEventListener('click', createRoom);
        playAgainBtn.addEventListener('click', resetToLobby);

        StickerNest.register({
          id: 'battleship-v1', name: 'Battleship', version: '1.0.0',
          permissions: ['cross-canvas'],
          events: { emits: ['game.lobby', 'game.move'], receives: ['game.lobby', 'game.move'] }
        });
        StickerNest.ready();

        setTimeout(function() {
          myPlayerId = StickerNest.getInstanceId() || ('p-' + Math.random().toString(36).slice(2, 8));
          var cfg = StickerNest.getConfig();
          if (cfg && cfg.playerName) myName = cfg.playerName;
          StickerNest.subscribeCrossCanvas(LOBBY_CH, handleLobbyMessage);
        }, 100);
      })();
    </script>
  `,

  'wgt-data-table': `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--sn-font-family, system-ui); color: var(--sn-text, #1a1a2e); background: var(--sn-surface, #fff); height: 100vh; display: flex; flex-direction: column; }
      .header { padding: 8px 12px; background: var(--sn-accent, #6366f1); color: #fff; display: flex; justify-content: space-between; align-items: center; }
      .header h3 { font-size: 14px; font-weight: 600; }
      .header button { background: rgba(255,255,255,0.2); border: none; color: #fff; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
      .header button:hover { background: rgba(255,255,255,0.3); }
      .content { flex: 1; overflow: auto; padding: 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; padding: 6px 8px; border-bottom: 2px solid var(--sn-border, #e2e8f0); font-weight: 600; font-size: 11px; text-transform: uppercase; color: var(--sn-text-muted, #64748b); }
      td { padding: 6px 8px; border-bottom: 1px solid var(--sn-border, #e2e8f0); }
      .empty { text-align: center; padding: 24px; color: var(--sn-text-muted, #94a3b8); }
      .status { padding: 4px 12px; font-size: 11px; color: var(--sn-text-muted, #94a3b8); border-top: 1px solid var(--sn-border, #e2e8f0); }
      .form { padding: 8px; display: flex; gap: 6px; border-top: 1px solid var(--sn-border, #e2e8f0); }
      .form input { flex: 1; padding: 4px 8px; border: 1px solid var(--sn-border, #e2e8f0); border-radius: 4px; font-size: 12px; }
      .form button { padding: 4px 12px; background: var(--sn-accent, #6366f1); color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
    </style>
    <div class="header">
      <h3>Data Table</h3>
      <button id="createBtn">Create Table</button>
    </div>
    <div class="content" id="content">
      <div class="empty" id="emptyState">Click "Create Table" to start</div>
      <table id="dataTable" style="display:none">
        <thead><tr><th>ID</th><th>Name</th><th>Value</th><th>Created</th></tr></thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
    <div class="form" id="addForm" style="display:none">
      <input id="nameInput" placeholder="Name" />
      <input id="valueInput" placeholder="Value" type="number" />
      <button id="addBtn">Add Row</button>
    </div>
    <div class="status" id="status">Ready</div>
    <script>
      (function() {
        var dsId = null;
        var rowCount = 0;

        StickerNest.register({
          id: 'sn.builtin.data-table',
          name: 'Data Table',
          version: '1.0.0',
          permissions: ['datasource', 'datasource-write'],
          events: { emits: [{ name: 'data-table.row.added', description: 'A row was added' }], subscribes: [] }
        });

        function setStatus(msg) {
          document.getElementById('status').textContent = msg;
        }

        function renderRows(rows) {
          var tbody = document.getElementById('tableBody');
          tbody.innerHTML = '';
          if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8">No rows yet. Add one below.</td></tr>';
            return;
          }
          for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var cells = r.cells || r;
            var tr = document.createElement('tr');
            tr.innerHTML = '<td>' + (r.id || i) + '</td><td>' + (cells.name || '-') + '</td><td>' + (cells.value || 0) + '</td><td>' + (cells.created || '-') + '</td>';
            tbody.appendChild(tr);
          }
          rowCount = rows.length;
        }

        document.getElementById('createBtn').addEventListener('click', function() {
          setStatus('Creating DataSource...');
          StickerNest.datasource.create('table', 'canvas', {
            schema: { columns: [
              { id: 'name', name: 'Name', type: 'text' },
              { id: 'value', name: 'Value', type: 'number' },
              { id: 'created', name: 'Created', type: 'text' }
            ]},
            metadata: { name: 'Widget Test Table' }
          }).then(function(ds) {
            dsId = ds.id;
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('dataTable').style.display = '';
            document.getElementById('addForm').style.display = '';
            document.getElementById('createBtn').textContent = 'Refresh';
            setStatus('Table created: ' + dsId);
            renderRows([]);
            StickerNest.setState('dsId', dsId);
          }).catch(function(err) {
            setStatus('Error: ' + err.message);
          });
        });

        document.getElementById('addBtn').addEventListener('click', function() {
          if (!dsId) { setStatus('Create a table first'); return; }
          var name = document.getElementById('nameInput').value || 'Item ' + (rowCount + 1);
          var value = parseInt(document.getElementById('valueInput').value) || 0;
          setStatus('Adding row...');
          StickerNest.datasource.table.addRow(dsId, {
            name: name,
            value: value,
            created: new Date().toISOString().slice(0, 19)
          }).then(function(row) {
            setStatus('Row added: ' + (row.id || 'ok'));
            document.getElementById('nameInput').value = '';
            document.getElementById('valueInput').value = '';
            StickerNest.emit('data-table.row.added', { dsId: dsId, row: row });
            return StickerNest.datasource.table.getRows(dsId);
          }).then(function(result) {
            renderRows(result.rows || result);
          }).catch(function(err) {
            setStatus('Error: ' + err.message);
          });
        });

        // Restore dsId from previous session
        StickerNest.getState('dsId').then(function(savedId) {
          if (savedId) {
            dsId = savedId;
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('dataTable').style.display = '';
            document.getElementById('addForm').style.display = '';
            document.getElementById('createBtn').textContent = 'Refresh';
            setStatus('Restored table: ' + dsId);
            StickerNest.datasource.table.getRows(dsId).then(function(result) {
              renderRows(result.rows || result);
            }).catch(function() { renderRows([]); });
          }
        });

        StickerNest.ready();
      })();
    </script>
  `,

  'wgt-entity-spawner': `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--sn-font-family, system-ui); color: var(--sn-text, #1a1a2e); background: var(--sn-surface, #fff); height: 100vh; display: flex; flex-direction: column; }
      .header { padding: 8px 12px; background: #10b981; color: #fff; font-size: 14px; font-weight: 600; }
      .content { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
      .field { display: flex; flex-direction: column; gap: 2px; }
      .field label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--sn-text-muted, #64748b); }
      .field input, .field select { padding: 6px 8px; border: 1px solid var(--sn-border, #e2e8f0); border-radius: 4px; font-size: 13px; }
      .actions { display: flex; gap: 6px; }
      .actions button { flex: 1; padding: 8px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
      .spawn-btn { background: #10b981; color: #fff; }
      .spawn-btn:hover { background: #059669; }
      .batch-btn { background: #6366f1; color: #fff; }
      .batch-btn:hover { background: #4f46e5; }
      .log { flex: 1; overflow: auto; font-size: 11px; color: var(--sn-text-muted, #64748b); padding: 8px; background: var(--sn-bg, #f1f5f9); border-radius: 4px; font-family: monospace; }
      .log div { padding: 1px 0; }
      .status { padding: 4px 12px; font-size: 11px; color: var(--sn-text-muted, #94a3b8); border-top: 1px solid var(--sn-border, #e2e8f0); }
    </style>
    <div class="header">Entity Spawner</div>
    <div class="content">
      <div class="field">
        <label>Entity Type</label>
        <select id="entityType">
          <option value="sticker">Sticker</option>
          <option value="text">Text</option>
          <option value="shape">Shape</option>
        </select>
      </div>
      <div class="field">
        <label>X Position</label>
        <input id="posX" type="number" value="200" />
      </div>
      <div class="field">
        <label>Y Position</label>
        <input id="posY" type="number" value="200" />
      </div>
      <div class="actions">
        <button class="spawn-btn" id="spawnBtn">Spawn Entity</button>
        <button class="batch-btn" id="batchBtn">Spawn 5</button>
      </div>
      <div class="log" id="log"></div>
    </div>
    <div class="status" id="status">Ready — entities appear on canvas</div>
    <script>
      (function() {
        var spawnCount = 0;
        var COLORS = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'];

        StickerNest.register({
          id: 'sn.builtin.entity-spawner',
          name: 'Entity Spawner',
          version: '1.0.0',
          permissions: [],
          events: {
            emits: [{ name: 'canvas.entity.created', description: 'Creates a canvas entity' }],
            subscribes: []
          }
        });

        function log(msg) {
          var el = document.getElementById('log');
          var d = document.createElement('div');
          d.textContent = new Date().toLocaleTimeString() + ' ' + msg;
          el.appendChild(d);
          el.scrollTop = el.scrollHeight;
        }

        function spawnEntity() {
          var type = document.getElementById('entityType').value;
          var x = parseInt(document.getElementById('posX').value) || 0;
          var y = parseInt(document.getElementById('posY').value) || 0;
          var offset = spawnCount * 30;
          spawnCount++;

          var entity;
          if (type === 'sticker') {
            entity = {
              type: 'sticker',
              transform: { position: { x: x + offset, y: y + offset }, size: { width: 80, height: 80 }, rotation: 0, scale: 1 },
              zIndex: 100 + spawnCount,
              visible: true,
              locked: false,
              assetUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="12" fill="' + COLORS[spawnCount % COLORS.length] + '"/><text x="40" y="48" text-anchor="middle" fill="#fff" font-size="28" font-family="system-ui">' + spawnCount + '</text></svg>'),
              mediaType: 'image',
              name: 'Spawned Sticker #' + spawnCount
            };
          } else if (type === 'text') {
            entity = {
              type: 'text',
              transform: { position: { x: x + offset, y: y + offset }, size: { width: 200, height: 40 }, rotation: 0, scale: 1 },
              zIndex: 100 + spawnCount,
              visible: true,
              locked: false,
              content: 'Spawned text #' + spawnCount,
              fontFamily: 'system-ui',
              fontSize: 16,
              fontWeight: 'normal',
              color: COLORS[spawnCount % COLORS.length],
              textAlign: 'left',
              name: 'Spawned Text #' + spawnCount
            };
          } else {
            entity = {
              type: 'shape',
              transform: { position: { x: x + offset, y: y + offset }, size: { width: 100, height: 100 }, rotation: 0, scale: 1 },
              zIndex: 100 + spawnCount,
              visible: true,
              locked: false,
              shapeType: 'ellipse',
              fill: COLORS[spawnCount % COLORS.length],
              stroke: null,
              strokeWidth: 0,
              cornerRadius: 0,
              name: 'Spawned Shape #' + spawnCount
            };
          }

          StickerNest.emit('canvas.entity.created', entity);
          log('Spawned ' + type + ' at (' + (x + offset) + ',' + (y + offset) + ')');
          document.getElementById('status').textContent = 'Spawned ' + spawnCount + ' entities';
        }

        document.getElementById('spawnBtn').addEventListener('click', spawnEntity);

        document.getElementById('batchBtn').addEventListener('click', function() {
          for (var i = 0; i < 5; i++) {
            spawnEntity();
          }
        });

        StickerNest.ready();
      })();
    </script>
  `,

  'sn.builtin.notion-viewer': `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--sn-font-family, system-ui, sans-serif); background: var(--sn-bg, #1a1a2e); color: var(--sn-text, #e5e7eb); padding: 16px; }
      h2 { font-size: 1.1em; margin-bottom: 12px; color: var(--sn-text, #e5e7eb); }
      .status { font-size: 0.85em; color: var(--sn-text-muted, #9ca3af); margin-bottom: 12px; }
      .db-list { list-style: none; }
      .db-item { padding: 10px 12px; margin-bottom: 6px; background: var(--sn-surface, #16213e); border: 1px solid var(--sn-border, #334155); border-radius: var(--sn-radius, 6px); cursor: pointer; transition: background 0.15s; }
      .db-item:hover { background: color-mix(in srgb, var(--sn-accent, #6366f1) 15%, var(--sn-surface, #16213e)); }
      .db-title { font-weight: 600; }
      .db-meta { font-size: 0.8em; color: var(--sn-text-muted, #9ca3af); margin-top: 4px; }
      .error { color: #f87171; font-size: 0.85em; }
      .btn { padding: 6px 14px; background: var(--sn-accent, #6366f1); color: #fff; border: none; border-radius: var(--sn-radius, 6px); cursor: pointer; font-size: 0.85em; margin-top: 8px; }
      .btn:hover { opacity: 0.9; }
      .loading { text-align: center; padding: 24px; }
      .spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--sn-border, #334155); border-top-color: var(--sn-accent, #6366f1); border-radius: 50%; animation: spin 0.6s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
    <div id="app">
      <h2>Notion Databases</h2>
      <div id="status" class="status">Connecting...</div>
      <ul id="db-list" class="db-list"></ul>
      <div id="error" class="error" style="display:none;"></div>
      <button id="refresh" class="btn" style="display:none;">Refresh</button>
    </div>
    <script>
      (function() {
        var statusEl = document.getElementById('status');
        var listEl = document.getElementById('db-list');
        var errorEl = document.getElementById('error');
        var refreshBtn = document.getElementById('refresh');

        StickerNest.register({
          id: 'sn.builtin.notion-viewer',
          name: 'Notion Database Viewer',
          version: '1.0.0',
          permissions: ['integrations'],
          events: { emits: ['notion.db.selected'], subscribes: [] },
          config: {}
        });

        function showError(msg) {
          errorEl.textContent = msg;
          errorEl.style.display = 'block';
          statusEl.textContent = 'Error';
          refreshBtn.style.display = 'inline-block';
        }

        function clearError() {
          errorEl.style.display = 'none';
          refreshBtn.style.display = 'none';
        }

        async function loadDatabases() {
          clearError();
          statusEl.textContent = 'Loading...';
          listEl.innerHTML = '<li class="loading"><span class="spinner"></span></li>';

          try {
            var result = await StickerNest.integration('notion').query({
              action: 'list_databases'
            });

            listEl.innerHTML = '';

            if (!result || !result.databases || result.databases.length === 0) {
              statusEl.textContent = 'No databases found.';
              refreshBtn.style.display = 'inline-block';
              return;
            }

            statusEl.textContent = result.databases.length + ' database' + (result.databases.length !== 1 ? 's' : '') + ' found';
            refreshBtn.style.display = 'inline-block';

            result.databases.forEach(function(db) {
              var li = document.createElement('li');
              li.className = 'db-item';
              li.innerHTML = '<div class="db-title">' + (db.title || 'Untitled') + '</div>' +
                '<div class="db-meta">' + (db.property_count || 0) + ' properties</div>';
              li.addEventListener('click', function() {
                StickerNest.emit('notion.db.selected', { databaseId: db.id, title: db.title });
              });
              listEl.appendChild(li);
            });
          } catch (err) {
            listEl.innerHTML = '';
            showError(err.message || 'Failed to load databases');
          }
        }

        refreshBtn.addEventListener('click', loadDatabases);

        loadDatabases();
        StickerNest.ready();
      })();
    </script>
  `,
};
