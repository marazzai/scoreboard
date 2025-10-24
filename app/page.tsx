import { redirect } from 'next/navigation';

export default function Page() {
  // No auth: redirect root to public dashboard
  redirect('/dashboard');
}
