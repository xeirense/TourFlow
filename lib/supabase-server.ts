import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * SSR Supabase client for Server Components and Route Handlers.
 * Reads/writes the session JWT from Next.js cookies.
 * Uses the ANON key — service key operations use lib/supabase.ts directly.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from Server Component — mutation silently ignored
          }
        },
      },
    },
  );
}
