import type { Metadata } from 'next';
import AppShell from '@/app/components/AppShell';

export const metadata: Metadata = { title: { default: 'Təkliflər', template: '%s — TourFlow' } };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
