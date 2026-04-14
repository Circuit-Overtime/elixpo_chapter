export const runtime = 'edge';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/app/components/Sidebar';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-gradient-page">
      <Sidebar user={user} />
      <main className="px-4 sm:px-8 pb-4 sm:pb-8 pt-20 sm:pt-24">{children}</main>
    </div>
  );
}
