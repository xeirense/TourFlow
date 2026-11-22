import { redirect } from 'next/navigation';

// Root URL → redirect to dashboard (middleware will redirect to login if unauthenticated)
export default function Home() {
  redirect('/dashboard');
}
