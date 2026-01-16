/**
 * Supabase server-side client with service role key
 * Use this for server-side operations that need to bypass RLS
 * DO NOT expose this key to the client
 * 
 * DEMO MODE: This uses a lazy getter to avoid crashing at import time
 * when SUPABASE_SERVICE_ROLE_KEY is not set. Only throws when actually used.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Lazy client instance (created only when getSupabaseServer() is called)
let _supabaseServer: SupabaseClient | null = null;

/**
 * Get Supabase server client (lazy initialization)
 * Throws only when called, not at import time
 * 
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not configured
 */
export function getSupabaseServer(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. For demo mode, do not call Next.js API routes that use supabase-server.'
    );
  }

  // Create client only once (singleton pattern)
  if (!_supabaseServer) {
    _supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return _supabaseServer;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getSupabaseServer() instead. This will throw if key is not set.
 */
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseServer()[prop as keyof SupabaseClient];
  },
});

