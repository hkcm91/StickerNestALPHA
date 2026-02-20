/// <reference types="vite/client" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @supabase/supabase-js before any imports that use it
const mockCreateClient = vi.fn(() => ({
  from: vi.fn(),
  auth: { onAuthStateChange: vi.fn() },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

describe('Supabase Client', () => {
  const ORIGINAL_ENV = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
    mockCreateClient.mockClear();
  });

  afterEach(() => {
    // Restore original env
    Object.assign(import.meta.env, ORIGINAL_ENV);
  });

  it('should call createClient with the correct URL and anon key', async () => {
    import.meta.env.VITE_SUPABASE_URL = 'https://test-project.supabase.co';
    import.meta.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key-1234';

    const { supabase } = await import('./client');

    expect(mockCreateClient).toHaveBeenCalledOnce();
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test-project.supabase.co',
      'test-anon-key-1234'
    );
    expect(supabase).toBeDefined();
  });

  it('should export a singleton client instance', async () => {
    import.meta.env.VITE_SUPABASE_URL = 'https://test-project.supabase.co';
    import.meta.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key-1234';

    const mod1 = await import('./client');
    // Within the same module reset cycle, the export is the same reference
    expect(mod1.supabase).toBe(mod1.supabase);
    // createClient is called exactly once per module load
    expect(mockCreateClient).toHaveBeenCalledOnce();
  });

  it('should throw when VITE_SUPABASE_URL is missing', async () => {
    import.meta.env.VITE_SUPABASE_URL = '';
    import.meta.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key-1234';

    await expect(() => import('./client')).rejects.toThrow(
      'Missing Supabase configuration'
    );
  });

  it('should throw when VITE_SUPABASE_ANON_KEY is missing', async () => {
    import.meta.env.VITE_SUPABASE_URL = 'https://test-project.supabase.co';
    import.meta.env.VITE_SUPABASE_ANON_KEY = '';

    await expect(() => import('./client')).rejects.toThrow(
      'Missing Supabase configuration'
    );
  });

  it('should throw when both env vars are missing', async () => {
    import.meta.env.VITE_SUPABASE_URL = '';
    import.meta.env.VITE_SUPABASE_ANON_KEY = '';

    await expect(() => import('./client')).rejects.toThrow(
      'Missing Supabase configuration'
    );
  });
});
