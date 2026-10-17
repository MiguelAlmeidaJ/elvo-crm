'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!response.ok) throw new Error('E-mail ou senha inválidos');
      router.replace('/clientes'); router.refresh();
    } catch(e) { setError((e as Error).message); } finally { setLoading(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-cloud px-5"><section className="elvo-card w-full max-w-md p-9">
    <div className="mb-7 rounded-xl bg-midnight p-4"><BrandLogo variant="dark" width={170} height={56} priority /></div>
    <h1 className="text-2xl font-bold">Entrar no ELVO CRM</h1><p className="mt-2 text-sm text-slate-500">Acesse o ambiente da sua organização.</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm font-semibold">E-mail<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 p-3" /></label>
      <label className="block text-sm font-semibold">Senha<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 p-3" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={loading} className="elvo-button-primary w-full">{loading?'Entrando...':'Entrar'}</button>
    </form>
  </section></main>;
}
