# Auth API Reference

> **Layer:** L0-kernel
> **Path:** `src/kernel/auth/`
> **Store:** `authStore` at `src/kernel/stores/auth/`

## Overview

Authentication in StickerNest V5 is handled entirely within Layer 0 (Kernel). It supports email/password login, email signup, and OAuth providers (Google, GitHub, Discord). Auth state is owned exclusively by `authStore` — no other store or layer re-implements auth logic.

The auth module wraps the Supabase Auth SDK and bridges its events onto the StickerNest event bus so other stores can react to auth changes without directly importing auth internals.

---

## Auth Store

### AuthUser

The authenticated user profile, populated after successful login.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Supabase auth user UUID |
| `email` | `string` | User's email address |
| `displayName` | `string \| null` | Display name shown in presence and profiles |
| `avatarUrl` | `string \| null` | URL to the user's avatar image |
| `tier` | `'free' \| 'creator' \| 'pro' \| 'enterprise'` | Subscription tier — gates feature access |

### AuthSession

Active session tokens managed by Supabase Auth.

| Field | Type | Description |
|-------|------|-------------|
| `accessToken` | `string` | JWT for API requests |
| `refreshToken` | `string` | Token for refreshing expired sessions |
| `expiresAt` | `number` | Unix timestamp (ms) when the access token expires |

### AuthState

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `user` | `AuthUser \| null` | `null` | Current authenticated user |
| `session` | `AuthSession \| null` | `null` | Active session tokens |
| `isLoading` | `boolean` | `false` | True during auth operations |
| `error` | `string \| null` | `null` | Last error message from auth |
| `isInitialized` | `boolean` | `false` | True after the first session check completes |

### AuthActions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setUser` | `(user: AuthUser \| null) => void` | Sets the current user profile |
| `setSession` | `(session: AuthSession \| null) => void` | Sets the active session |
| `setLoading` | `(loading: boolean) => void` | Toggles loading state |
| `setError` | `(error: string \| null) => void` | Sets an error message |
| `setInitialized` | `() => void` | Marks auth as initialized |
| `clearError` | `() => void` | Clears the error field |
| `reset` | `() => void` | Resets to initial state (sign-out) |

### Selectors

| Selector | Returns | Description |
|----------|---------|-------------|
| `selectAuthReady` | `boolean` | `true` when `isInitialized && !isLoading` — safe for route guards |
| `selectIsAuthenticated` | `boolean` | `true` when both `user` and `session` are non-null |

---

## Auth Functions

All functions are exported from `src/kernel/auth/`.

### `signInWithEmail(email, password)`

Signs in with email and password via Supabase Auth.

| Parameter | Type | Description |
|-----------|------|-------------|
| `email` | `string` | User's email |
| `password` | `string` | User's password |

**Returns:** `Promise<{ error: AuthError | null }>`

On success: updates `authStore` with user + session, fetches user tier from the `users` table, emits `AUTH_STATE_CHANGED`.

### `signUp(email, password, displayName?)`

Creates a new account.

| Parameter | Type | Description |
|-----------|------|-------------|
| `email` | `string` | Email for the new account |
| `password` | `string` | Password |
| `displayName` | `string` (optional) | Initial display name |

**Returns:** `Promise<{ error: AuthError | null }>`

On success: auto-signs in the user (Supabase default behavior), creates a `users` table row with `tier: 'free'`, emits `AUTH_STATE_CHANGED`.

### `signOut()`

Signs out the current user. Resets `authStore` and emits `AUTH_STATE_CHANGED` with null user/session.

**Returns:** `Promise<{ error: AuthError | null }>`

### `signInWithOAuth(provider)`

Initiates an OAuth sign-in flow. Redirects the browser to the provider's consent screen.

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `'google' \| 'github' \| 'discord'` | OAuth provider |

**Returns:** `Promise<{ data: OAuthResponse['data'] | null; error: AuthError | null }>`

After the OAuth redirect completes, the `onAuthStateChange` listener picks up the session and updates the store.

### `refreshSession()`

Refreshes the current session using the stored refresh token.

**Returns:** `Promise<{ error: AuthError | null }>`

On success: updates the store with new tokens. On failure: emits `AUTH_SESSION_EXPIRED` so other stores can react (e.g., show "Session expired" error).

### `initAuthListener()`

Initializes the auth state listener. **Call once at app startup** (typically in Shell layer bootstrap).

**Returns:** `{ unsubscribe: () => void }`

This function does two things: bootstraps the initial auth state by calling `getSession()` immediately (so route guards don't wait), and sets up a Supabase `onAuthStateChange` listener that bridges all auth events to the StickerNest event bus.

---

## User Tiers

The `tier` field on `AuthUser` controls access to platform features:

| Tier | Widget Lab | Canvas Creation | Marketplace Publishing | Priority Support |
|------|-----------|----------------|----------------------|-----------------|
| `free` | No (Script mode only) | Yes | No | No |
| `creator` | Yes | Yes | Yes | No |
| `pro` | Yes | Yes | Yes | Yes |
| `enterprise` | Yes | Yes | Yes | Yes |

Tier is stored in the `users` Supabase table (source of truth), not in the Supabase Auth user metadata. The `fetchUserTier()` internal function reads this on every auth state change. If a `users` row doesn't exist (e.g., new OAuth signup), one is created with `tier: 'free'`.

Route-level tier gating: The Shell layer checks `authStore.user.tier` in route guards. For example, `/lab` requires `creator` or higher — non-creators see an upgrade prompt.

---

## Bus Events

Auth emits two event types that other stores subscribe to:

### `KernelEvents.AUTH_STATE_CHANGED`

Emitted on every auth state change — sign-in, sign-up, sign-out, session refresh, and OAuth return.

**Payload:**
```ts
{
  user: AuthUser | null,
  session: { accessToken: string, expiresAt: number } | null
}
```

**Subscribers:**
- `canvasStore` — resets canvas state when user signs out
- `workspaceStore` — resets workspace state when user signs out
- `galleryStore` — reloads gallery assets when user changes

### `KernelEvents.AUTH_SESSION_EXPIRED`

Emitted when `refreshSession()` fails.

**Payload:** `{ reason: string }`

**Subscribers:**
- `authStore` — clears the session and shows "Session expired. Please sign in again."

---

## Security Notes

- Auth state is owned exclusively by `authStore` — other stores react via bus events, never by importing auth internals directly.
- Session refresh and token expiry are handled in `src/kernel/auth/`, not in higher layers.
- The auth module does not reach into any other store directly — it always goes through `authStore` actions and bus events.
- OAuth redirect URLs are derived from `window.location.origin` — no hardcoded URLs.

---

## Usage Example

```ts
import { signInWithEmail, signOut, initAuthListener } from '@/kernel/auth';
import { useAuthStore } from '@/kernel/stores/auth';

// At app startup (Shell layer)
const { unsubscribe } = initAuthListener();

// Sign in
const { error } = await signInWithEmail('user@example.com', 'password');
if (error) console.error('Login failed:', error.message);

// Check auth state in a component
const isAuthenticated = useAuthStore(selectIsAuthenticated);
const user = useAuthStore((s) => s.user);
const tier = user?.tier; // 'free' | 'creator' | 'pro' | 'enterprise'

// Sign out
await signOut();
```
