import { redirect } from 'next/navigation';

// Root URL → redirect to manager panel
export default function Home() {
  redirect('/create');
}
