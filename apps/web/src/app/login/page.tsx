'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiMail, FiShield } from 'react-icons/fi';
import { BrandLogo } from '@/components/brand-logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error('E-mail ou senha inválidos. Verifique os dados e tente novamente.');
      const user = await response.json() as { role: 'SYSTEM_ADMIN' | 'TENANT_ADMIN' | 'USER' };
      router.replace(user.role === 'SYSTEM_ADMIN' ? '/admin/empresas' : '/');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase" aria-label="Apresentação do ELVO CRM">
        <div className="login-orb login-orb-one" />
        <div className="login-orb login-orb-two" />
        <div className="relative z-10 flex h-full flex-col">
          <BrandLogo variant="dark" width={190} height={48} />
          <div className="my-auto max-w-xl py-16">
            <span className="eyebrow-light">Relacionamentos que evoluem</span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.12] text-white sm:text-5xl xl:text-6xl">
              Transforme conexões em <span className="text-mint">resultados.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              Clientes, oportunidades e tarefas em um só lugar para sua equipe vender com clareza e consistência.
            </p>
            <div className="mt-10 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-sm">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint/15 text-mint"><FiShield size={21} /></span>
              <div>
                <strong className="text-sm font-semibold text-white">Acesso protegido</strong>
                <p className="mt-1 text-xs leading-5 text-slate-400">Sua sessão e os dados da organização permanecem seguros.</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">ELVO CRM · Conexões que impulsionam negócios.</p>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="w-full max-w-[430px]">
          <div className="mb-10 lg:hidden"><BrandLogo variant="light" width={170} height={43} /></div>
          <div className="mb-9">
            <span className="eyebrow">Bem-vindo de volta</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-midnight sm:text-[2.15rem]">Acesse seu workspace</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Entre com os dados fornecidos pelo administrador da sua organização.</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <label className="elvo-field">
              <span>E-mail</span>
              <span className="elvo-input-wrap">
                <FiMail aria-hidden="true" />
                <input required type="email" autoComplete="username" inputMode="email" placeholder="voce@empresa.com.br" value={email} onChange={(event) => setEmail(event.target.value)} />
              </span>
            </label>
            <label className="elvo-field">
              <span>Senha</span>
              <span className="elvo-input-wrap">
                <FiLock aria-hidden="true" />
                <input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}>
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </span>
            </label>
            {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700">{error}</p> : null}
            <button disabled={loading} className="elvo-button-primary elvo-button-large w-full" type="submit">
              <span>{loading ? 'Entrando...' : 'Entrar no ELVO'}</span>
              {loading ? null : <FiArrowRight aria-hidden="true" />}
            </button>
          </form>
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">Precisa de acesso? Fale com o administrador do seu workspace.</p>
        </div>
      </section>
    </main>
  );
}
