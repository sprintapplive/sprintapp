import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/DashboardNav';
import { Footer } from '@/components/Footer';

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
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {children}
      </main>
      <Footer />
    </div>
  );
}
