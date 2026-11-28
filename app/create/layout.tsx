import type { Metadata } from 'next';
import AppShell from '@/app/components/AppShell';

export const metadata: Metadata = { title: 'Yeni təklif' };

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
