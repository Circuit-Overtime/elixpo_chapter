export const runtime = 'edge';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/app/components/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-gradient-page">
      <Sidebar user={user} />
      <main className="ml-60 p-8">{children}</main>
    </div>
  );
}
