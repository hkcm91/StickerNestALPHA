/**
 * Standalone Supabase client for MCP dev server.
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the project root
 * .env.local file via dotenv. The VITE_ prefix is a Vite convention; Node.js
 * doesn't care — dotenv loads them into process.env as-is.
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../.env.local') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local. ' +
    'The MCP marketplace tools need these to connect to cloud Supabase.'
  );
}

export const supabase = createClient(url, key);
