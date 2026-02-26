/**
 * Auth Integration Handler — proxies auth calls from widget iframes to Supabase Auth.
 * Widgets call StickerNest.integration('auth').query/mutate() and the host
 * routes those calls here. The widget never sees JWTs or session tokens.
 *
 * @module runtime/integrations
 * @layer L3
 */

import { supabase } from '../../kernel/supabase';

import type { IntegrationHandler } from './integration-proxy';

interface AuthQueryParams {
  action: 'session';
}

interface AuthMutateParams {
  action: 'signup' | 'signin' | 'signout';
  email?: string;
  password?: string;
}

async function handleAuthQuery(params: AuthQueryParams): Promise<unknown> {
  switch (params.action) {
    case 'session': {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isAuthenticated: false, user: null, canvasRole: null };
      }
      return {
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email,
        },
        canvasRole: null, // Canvas-specific role would be resolved by the host
      };
    }
    default:
      throw new Error(`Unknown auth query action: ${(params as { action: string }).action}`);
  }
}

async function handleAuthMutate(params: AuthMutateParams): Promise<unknown> {
  switch (params.action) {
    case 'signup': {
      if (!params.email || !params.password) {
        return { error: 'Email and password required' };
      }
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
      });
      if (error) {
        return { error: error.message };
      }
      return {
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
      };
    }
    case 'signin': {
      if (!params.email || !params.password) {
        return { error: 'Email and password required' };
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });
      if (error) {
        return { error: error.message };
      }
      return {
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
      };
    }
    case 'signout': {
      await supabase.auth.signOut();
      return { success: true };
    }
    default:
      throw new Error(`Unknown auth mutate action: ${(params as { action: string }).action}`);
  }
}

/**
 * Creates an auth integration handler for the widget bridge.
 */
export function createAuthHandler(): IntegrationHandler {
  return {
    query: (params: unknown) => handleAuthQuery(params as AuthQueryParams),
    mutate: (params: unknown) => handleAuthMutate(params as AuthMutateParams),
  };
}
