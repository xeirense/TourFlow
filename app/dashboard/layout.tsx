import type { Metadata } from 'next';
import AppShell from '@/app/components/AppShell';

export const metadata: Metadata = { title: 'Təkliflər' };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
