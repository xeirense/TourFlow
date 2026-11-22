'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-blue-200 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
    >
      Çıxış
    </button>
  );
}
