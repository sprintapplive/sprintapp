'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <div className={cn(
      'neo-card p-6'
    )}>
      <h2 className="text-2xl font-black italic text-center mb-6 text-gold-400">
        Welcome Back
      </h2>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={cn(
              'bg-card border-border/50 h-12',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]',
              'focus:border-laurel-500 focus:ring-laurel-500/20'
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={cn(
              'bg-card border-border/50 h-12',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]',
              'focus:border-laurel-500 focus:ring-laurel-500/20'
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full h-12 font-bold italic text-lg',
            'bg-gradient-to-r from-laurel-700 to-laurel-600',
            'hover:from-laurel-600 hover:to-laurel-500',
            'shadow-[0_4px_15px_rgba(45,74,40,0.4)]',
            'disabled:opacity-50'
          )}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-gold-400 hover:text-gold-300 font-bold">
          Sign up
        </Link>
      </p>
    </div>
  );
}
