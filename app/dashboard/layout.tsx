export const runtime = 'edge';

import { redirect } from 'next/navigation';
import BackgroundAurora from '@/app/components/BackgroundAurora';
import Sidebar from '@/app/components/Sidebar';
import { getCurrentUser } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen relative">
      <BackgroundAurora variant="default" />
      <div className="relative" style={{ zIndex: 1 }}>
        <Sidebar user={user} />
        <main className="px-4 sm:px-8 pb-4 sm:pb-8 pt-20 sm:pt-24">
          {children}
        </main>
      </div>
    </div>
  );
}
