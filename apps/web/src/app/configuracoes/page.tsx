'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { FiBriefcase, FiPlus, FiShield, FiUsers } from 'react-icons/fi';

type Role = 'SYSTEM_ADMIN' | 'TENANT_ADMIN' | 'USER';
type Context = {
  role: Role;
  organization: { id: string; name: string; slug: string } | null;
  users: { id: string; role: Role; user: { id: string; name: string; email: string } }[];
  tenants: { id: string; name: string; slug: string; _count: { memberships: number; contacts: number } }[];
};
const roleLabel: Record<Role, string> = { SYSTEM_ADMIN: 'Administrador do Sistema', TENANT_ADMIN: 'Administrador da Empresa', USER: 'Usuário' };

export default function ConfiguracoesPage() {
  const [data, setData] = useState<Context | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'USER' as Role, organizationId: '' });
  const [tenantForm, setTenantForm] = useState({ name: '', slug: '' });

  const load = useCallback(async () => {
    const response = await fetch('/api/v1/administration/context', { cache: 'no-store' });
    if (!response.ok) throw new Error('Não foi possível carregar as configurações');
    setData(await response.json());
  }, []);
  useEffect(() => { load().catch((cause) => setError(cause.message)); }, [load]);

  async function submit(path: string, body: object) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/v1/administration/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
      if (!response.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message ?? 'Não foi possível salvar');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar'); throw cause; }
    finally { setBusy(false); }
  }

  async function createUser(event: FormEvent) {
    event.preventDefault();
    try { await submit('users', { ...userForm, password: userForm.password || undefined, organizationId: userForm.organizationId || undefined }); setUserForm({ name: '', email: '', password: '', role: 'USER', organizationId: '' }); } catch { return; }
  }
  async function createTenant(event: FormEvent) {
    event.preventDefault();
    try { await submit('tenants', tenantForm); setTenantForm({ name: '', slug: '' }); } catch { return; }
  }
  async function switchTenant(organizationId: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/v1/administration/switch-tenant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId }) });
      if (!response.ok) throw new Error('Não foi possível acessar esta empresa');
      window.location.assign('/');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível acessar esta empresa'); setBusy(false); }
  }

  return <main className="px-5 py-9 md:px-9"><div className="mx-auto max-w-6xl">
    <span className="eyebrow">Administração</span><h1 className="mt-3 text-3xl font-semibold">Configurações do workspace</h1><p className="mt-2 text-sm text-slate-500">Gerencie a empresa, os acessos e os papéis dos usuários.</p>
    {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}
    {!data ? <p className="mt-8 text-sm text-slate-500">Carregando configurações...</p> : <>
      <section className="elvo-card mt-8 flex flex-wrap items-center gap-5 p-6"><span className="grid size-12 place-items-center rounded-xl bg-mint/20 text-success"><FiBriefcase size={21}/></span><div><p className="text-xs text-slate-500">Empresa atual</p><h2 className="font-semibold">{data.organization?.name ?? 'Sem empresa'}</h2><p className="text-xs text-slate-400">{data.organization?.slug}</p></div><div className="ml-auto rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"><FiShield className="mr-1 inline"/>{roleLabel[data.role]}</div></section>
      {data.role !== 'USER' ? <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className="elvo-card p-6"><div className="mb-5 flex items-center gap-3"><FiUsers/><h2 className="text-lg font-semibold">Usuários da empresa</h2></div><div className="space-y-3">{data.users.map((membership) => <div key={membership.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"><div><p className="text-sm font-semibold">{membership.user.name}</p><p className="text-xs text-slate-500">{membership.user.email}</p></div><span className="text-xs font-semibold text-success">{roleLabel[membership.role]}</span></div>)}</div></section>
        <form onSubmit={createUser} className="elvo-card space-y-4 p-6"><h2 className="text-lg font-semibold">Criar ou vincular usuário</h2><p className="text-xs leading-5 text-slate-500">Para um e-mail já cadastrado, deixe a senha vazia: o acesso existente será vinculado a esta empresa.</p><input required minLength={2} placeholder="Nome completo" value={userForm.name} onChange={(event)=>setUserForm({...userForm,name:event.target.value})} className="w-full rounded-xl border p-3"/><input required type="email" placeholder="E-mail" value={userForm.email} onChange={(event)=>setUserForm({...userForm,email:event.target.value})} className="w-full rounded-xl border p-3"/><input minLength={12} type="password" placeholder="Senha inicial (somente novo e-mail)" value={userForm.password} onChange={(event)=>setUserForm({...userForm,password:event.target.value})} className="w-full rounded-xl border p-3"/><select value={userForm.role} onChange={(event)=>setUserForm({...userForm,role:event.target.value as Role})} className="w-full rounded-xl border p-3"><option value="USER">Usuário</option><option value="TENANT_ADMIN">Administrador da Empresa</option>{data.role === 'SYSTEM_ADMIN' ? <option value="SYSTEM_ADMIN">Administrador do Sistema</option> : null}</select>{data.role === 'SYSTEM_ADMIN' ? <select required value={userForm.organizationId} onChange={(event)=>setUserForm({...userForm,organizationId:event.target.value})} className="w-full rounded-xl border p-3"><option value="">Selecione a empresa</option>{data.tenants.map((tenant)=><option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select> : null}<button disabled={busy} className="elvo-button-primary w-full"><FiPlus/>{busy?'Salvando...':'Salvar usuário'}</button></form>
      </div> : <section className="elvo-card mt-6 p-6 text-sm text-slate-500">Seu perfil possui acesso operacional ao CRM. A gestão de usuários é exclusiva dos administradores.</section>}
      {data.role === 'SYSTEM_ADMIN' ? <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><section className="elvo-card p-6"><h2 className="text-lg font-semibold">Empresas cadastradas</h2><div className="mt-5 space-y-3">{data.tenants.map((tenant)=><div key={tenant.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4"><div><p className="text-sm font-semibold">{tenant.name}</p><p className="text-xs text-slate-500">{tenant.slug} · {tenant._count.memberships} usuários · {tenant._count.contacts} clientes</p></div>{tenant.id===data.organization?.id?<span className="text-xs font-semibold text-success">Atual</span>:<button disabled={busy} onClick={()=>switchTenant(tenant.id)} className="text-xs font-semibold text-emerald-700">Acessar</button>}</div>)}</div></section><form onSubmit={createTenant} className="elvo-card space-y-4 p-6"><h2 className="text-lg font-semibold">Nova empresa</h2><input required placeholder="Nome da empresa" value={tenantForm.name} onChange={(event)=>setTenantForm({...tenantForm,name:event.target.value})} className="w-full rounded-xl border p-3"/><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="identificador-da-empresa" value={tenantForm.slug} onChange={(event)=>setTenantForm({...tenantForm,slug:event.target.value.toLowerCase().replace(/\s+/g,'-')})} className="w-full rounded-xl border p-3"/><button disabled={busy} className="elvo-button-primary w-full"><FiPlus/>Criar empresa</button></form></div> : null}
    </>}
  </div></main>;
}
