import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client for Client Components.
 * Uses anon key only — never the service key.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
