import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/DashboardNav';
import { Footer } from '@/components/Footer';
import { SwipeNavigator } from '@/components/SwipeNavigator';
import Loading from './loading';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardNav user={user} />
      <SwipeNavigator>
        <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
          <Suspense fallback={<Loading />}>
            {children}
          </Suspense>
        </main>
      </SwipeNavigator>
      <Footer />
    </div>
  );
}
