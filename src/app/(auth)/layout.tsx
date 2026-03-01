import Image from 'next/image';
import { Footer } from '@/components/Footer';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and brand */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Image
                src="/logo.png"
                alt="Sprint"
                width={48}
                height={48}
                className="w-12 h-12 dark:invert dark:brightness-200"
              />
              <h1 className="text-4xl font-black italic text-foreground">Sprint</h1>
            </div>
            <p className="text-muted-foreground">
              Track your time in 30-minute increments
            </p>
          </div>
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}
