export const runtime = 'edge';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/app/components/Sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gradient-page">
      <Sidebar user={user} />
      <main className="ml-60 p-8">{children}</main>
    </div>
  );
}
