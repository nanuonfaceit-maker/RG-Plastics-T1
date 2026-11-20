import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, Input } from './ui';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signIn(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) { setError(authError.message); setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4"><section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">RG</div><div><h1 className="text-lg font-semibold text-gray-900">RG Plastics</h1><p className="text-sm text-gray-500">Transaction Manager</p></div></div><form onSubmit={signIn} className="mt-6 space-y-4"><Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />{error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<Button type="submit" className="w-full" disabled={loading}><LogIn size={16} />{loading ? 'Signing in…' : 'Sign in'}</Button></form></section></main>;
}
