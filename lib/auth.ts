import { cache } from 'react';
import { createSupabaseServerClient } from './supabase-server';

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * Current user for Server Components, deduplicated per request.
 *
 * The layout (AppShell) and the page both need the user; React `cache()` makes
 * them share one Supabase client and one auth check instead of two.
 * `getClaims()` verifies the JWT signature (locally when the project uses
 * asymmetric signing keys, otherwise via the Auth server), so it is safe to
 * trust for authorization, unlike `getSession()`.
 */
export const getAuth = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const user: AuthUser | null = claims?.sub
    ? { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null }
    : null;
  return { supabase, user };
});
