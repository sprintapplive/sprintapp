'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="neo-card p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-laurel-700/50 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-gold-400" />
        </div>
        <h2 className="text-2xl font-black italic mb-2 text-gold-400">
          Check Your Email
        </h2>
        <p className="text-muted-foreground mb-6">
          We&apos;ve sent a confirmation link to <strong className="text-foreground">{email}</strong>.
          Please check your email and click the link to activate your account.
        </p>
        <Button
          onClick={() => router.push('/login')}
          variant="outline"
          className="border-laurel-700 text-laurel-400 hover:bg-laurel-900/50"
        >
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="neo-card p-6">
      <h2 className="text-2xl font-black italic text-center mb-6 text-gold-400">
        Create Account
      </h2>

      <form onSubmit={handleSignup} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Display Name (optional)
          </Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={cn(
              'bg-card border-border/50 h-12',
              'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]',
              'focus:border-laurel-500 focus:ring-laurel-500/20'
            )}
          />
        </div>

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
            placeholder="At least 6 characters"
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-gold-400 hover:text-gold-300 font-bold">
          Sign in
        </Link>
      </p>
    </div>
  );
}
