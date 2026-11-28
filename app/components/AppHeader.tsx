'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import Icon, { type IconName } from './Icon';

export interface AppHeaderProps {
  agencyName: string;
  planLabel:  string;         // e.g. "Growth"
  planNote:   string | null;  // e.g. "Sınaq · 13 gün" — null when nothing to say
  planUrgent: boolean;        // trial ending soon / limit nearly used
  isAdmin:    boolean;
  teamCount:  number;
  isOwner:    boolean;        // agency owner (not an invited manager)
  hasOwnerPanel: boolean;     // plan includes the owner panel (Pro and above)
}

const NAV: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: '/dashboard',           label: 'Təkliflər',   icon: 'file', exact: true },
  { href: '/dashboard/clients',   label: 'Müştərilər',  icon: 'user' },
  { href: '/dashboard/analytics', label: 'Analitika',   icon: 'chart' },
  { href: '/dashboard/team',      label: 'Komanda',     icon: 'users' },
  { href: '/dashboard/settings',  label: 'Parametrlər', icon: 'settings' },
];

export default function AppHeader(props: AppHeaderProps) {
  const pathname = usePathname();
  const router   = useRouter();

  // Owner panel: only for agency owners on a plan that includes it (no locked item for others)
  const withPanel = props.isOwner && props.hasOwnerPanel
    ? [...NAV.slice(0, 3), { href: '/dashboard/rehber', label: 'Rəhbər paneli', icon: 'briefcase' as IconName }, ...NAV.slice(3)]
    : NAV;
  const base = props.isOwner ? withPanel : withPanel.filter(n => n.href !== '/dashboard/team');
  const nav = props.isAdmin
    ? [...base, { href: '/admin/hotels', label: 'Admin', icon: 'tool' as IconName }]
    : base;

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  }

  async function logout() {
    await createSupabaseBrowserClient().auth.signOut();
    router.push('/login');
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Top row */}
        <div className="h-14 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
            <span className="w-8 h-8 rounded-lg bg-ink text-white flex items-center justify-center text-[11px] font-bold tracking-wide flex-shrink-0">
              TF
            </span>
            <span className="hidden sm:block lg:hidden 2xl:block font-semibold text-ink text-sm">TourFlow</span>
            <span className="hidden sm:block lg:hidden 2xl:block w-px h-5 bg-slate-200" />
            <span className="text-sm font-medium text-slate-700 truncate max-w-[140px] sm:max-w-[200px]">
              {props.agencyName}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center ml-2 h-14">
            {nav.map(item => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative h-14 flex items-center gap-1.5 px-2.5 text-sm whitespace-nowrap transition-colors ${
                    active ? 'text-ink font-medium' : 'text-slate-500 hover:text-ink'
                  }`}
                >
                  <Icon name={item.icon} className="w-4 h-4 hidden 2xl:block" />
                  {item.label}
                  {item.href === '/dashboard/team' && props.teamCount > 0 && (
                    <span className="ml-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 rounded-full px-1.5 py-px">
                      {props.teamCount}
                    </span>
                  )}
                  {active && <span className="absolute left-2.5 right-2.5 bottom-0 h-0.5 bg-brand-600 rounded-full" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Plan pill */}
          <Link
            href="/dashboard/plan"
            title="Plan və istifadə"
            className={`hidden sm:inline-flex items-center gap-1.5 text-xs rounded-full border px-2.5 py-1 whitespace-nowrap transition-colors ${
              props.planUrgent
                ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="font-semibold">{props.planLabel}</span>
            {props.planNote && (
              <span className="hidden xl:inline-flex items-center gap-1.5">
                <span className="text-slate-300">·</span>
                <span>{props.planNote}</span>
              </span>
            )}
          </Link>

          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            <Icon name="plus" className="w-4 h-4" strokeWidth={2} />
            <span className="hidden sm:inline">Yeni təklif</span>
            <span className="sm:hidden">Yeni</span>
          </Link>

          <button
            onClick={logout}
            title="Çıxış"
            aria-label="Çıxış"
            className="p-2 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors"
          >
            <Icon name="logout" className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Mobile / tablet nav */}
        <nav className="lg:hidden -mx-4 px-4 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {nav.map(item => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex-shrink-0 flex items-center gap-1.5 px-3 h-10 text-[13px] whitespace-nowrap transition-colors ${
                  active ? 'text-ink font-medium' : 'text-slate-500'
                }`}
              >
                <Icon name={item.icon} className="w-4 h-4" />
                {item.label}
                {active && <span className="absolute left-3 right-3 bottom-0 h-0.5 bg-brand-600 rounded-full" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

// ─── Page title row used at the top of every app page ────────────────────────
export function PageTitle({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-ink mb-2 transition-colors"
        >
          <Icon name="back" className="w-3.5 h-3.5" />
          {back.label}
        </Link>
      )}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
