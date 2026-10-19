'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FiBriefcase, FiCheck, FiLayers, FiPlus, FiSettings, FiUsers } from 'react-icons/fi';

type Role = 'SYSTEM_ADMIN' | 'TENANT_ADMIN' | 'USER';
type ModuleKey = 'LEADS' | 'WHATSAPP' | 'EMAIL';
type Tenant = { id: string; name: string; slug: string; _count: { memberships: number; contacts: number }; modules: { enabled: boolean; module: { key: ModuleKey } }[] };
type SystemModule = { id: string; key: ModuleKey; name: string; description: string; active: boolean; organizations: { organizationId: string; enabled: boolean }[] };
type GlobalUser = { id: string; name: string; email: string; memberships: { role: Role; organization: { id: string; name: string } }[] };
type Context = {
  role: Role; tenants: Tenant[]; modules: SystemModule[]; globalUsers: GlobalUser[];
  settings?: { leadProvider: string; whatsappProvider: string; whatsappConfigured: boolean; nominatimUrl: string; overpassUrl: string };
};

const roleLabel: Record<Role, string> = { SYSTEM_ADMIN: 'Administrador do Sistema', TENANT_ADMIN: 'Administrador da Empresa', USER: 'Usuário' };
const sectionMeta = {
  empresas: { title: 'Empresas', description: 'Tenants cadastrados e seus indicadores.', Icon: FiBriefcase },
  modulos: { title: 'Módulos', description: 'Controle quais produtos cada empresa pode utilizar.', Icon: FiLayers },
  usuarios: { title: 'Usuários', description: 'Uma identidade por e-mail, vinculável a várias empresas.', Icon: FiUsers },
  configuracoes: { title: 'Configurações do sistema', description: 'Provedores e integrações compartilhadas da plataforma.', Icon: FiSettings },
} as const;

async function readError(response: Response) {
  const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
  return Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message ?? 'Não foi possível concluir a operação';
}

export default function SystemAdminPage() {
  const pathname = usePathname();
  const rawSection = pathname.split('/').filter(Boolean)[1] ?? 'empresas';
  const section = (rawSection in sectionMeta ? rawSection : 'empresas') as keyof typeof sectionMeta;
  const meta = sectionMeta[section];
  const [data, setData] = useState<Context | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [tenantForm, setTenantForm] = useState({ name: '', slug: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'USER' as Role, organizationId: '' });

  const load = useCallback(async () => {
    const response = await fetch('/api/v1/administration/context', { cache: 'no-store' });
    if (!response.ok) throw new Error(await readError(response));
    const payload = await response.json() as Context;
    if (payload.role !== 'SYSTEM_ADMIN') throw new Error('Área exclusiva do Administrador do Sistema');
    setData(payload);
    setUserForm((current) => current.organizationId || !payload.tenants[0] ? current : { ...current, organizationId: payload.tenants[0].id });
  }, []);

  useEffect(() => { load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Falha ao carregar')); }, [load]);

  async function createTenant(event: FormEvent) {
    event.preventDefault(); setBusy('tenant'); setError(''); setNotice('');
    try {
      const response = await fetch('/api/v1/administration/tenants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tenantForm) });
      if (!response.ok) throw new Error(await readError(response));
      setTenantForm({ name: '', slug: '' }); setNotice('Empresa criada com sucesso. Agora habilite os módulos contratados.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao criar empresa'); } finally { setBusy(''); }
  }

  async function createUser(event: FormEvent) {
    event.preventDefault(); setBusy('user'); setError(''); setNotice('');
    try {
      const response = await fetch('/api/v1/administration/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...userForm, password: userForm.password || undefined }) });
      if (!response.ok) throw new Error(await readError(response));
      setUserForm((current) => ({ name: '', email: '', password: '', role: 'USER', organizationId: current.organizationId }));
      setNotice('Usuário vinculado à empresa com sucesso.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar usuário'); } finally { setBusy(''); }
  }

  async function toggleModule(tenantId: string, moduleKey: ModuleKey, enabled: boolean) {
    const action = `${tenantId}-${moduleKey}`; setBusy(action); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/v1/administration/tenants/${tenantId}/modules/${moduleKey}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
      if (!response.ok) throw new Error(await readError(response));
      await load(); setNotice(`Módulo ${moduleKey} ${enabled ? 'habilitado' : 'desabilitado'}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao atualizar módulo'); } finally { setBusy(''); }
  }

  return <main className="px-5 py-9 md:px-9"><div className="mx-auto max-w-7xl">
    <span className="eyebrow">Administração da plataforma</span>
    <div className="mt-3 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-mint/20 text-success"><meta.Icon size={20}/></span><div><h1 className="text-3xl font-semibold">{meta.title}</h1><p className="mt-1 text-sm text-slate-500">{meta.description}</p></div></div>
    {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}
    {notice ? <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><FiCheck className="mr-2 inline"/>{notice}</p> : null}
    {!data ? <p className="mt-8 text-sm text-slate-500">Carregando...</p> : null}

    {data && section === 'empresas' ? <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
      <section className="elvo-card overflow-hidden"><div className="border-b border-slate-100 p-6"><h2 className="font-semibold">{data.tenants.length} empresas cadastradas</h2></div><div className="divide-y divide-slate-100">{data.tenants.map((tenant) => <div key={tenant.id} className="flex flex-wrap items-center gap-4 p-5"><div className="grid size-10 place-items-center rounded-xl bg-slate-100 font-bold text-slate-500">{tenant.name.slice(0, 1)}</div><div className="min-w-48 flex-1"><p className="text-sm font-semibold">{tenant.name}</p><p className="text-xs text-slate-500">{tenant.slug}</p></div><div className="flex gap-5 text-center text-xs text-slate-500"><span><strong className="block text-base text-midnight">{tenant._count.memberships}</strong>usuários</span><span><strong className="block text-base text-midnight">{tenant._count.contacts}</strong>clientes</span></div></div>)}</div></section>
      <form onSubmit={createTenant} className="elvo-card h-fit space-y-4 p-6"><h2 className="text-lg font-semibold">Nova empresa</h2><label className="block text-xs font-semibold">Nome<input required minLength={2} value={tenantForm.name} onChange={(event) => setTenantForm({ ...tenantForm, name: event.target.value })} className="mt-2 w-full rounded-xl border p-3"/></label><label className="block text-xs font-semibold">Identificador<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={tenantForm.slug} onChange={(event) => setTenantForm({ ...tenantForm, slug: event.target.value.toLowerCase() })} placeholder="empresa-exemplo" className="mt-2 w-full rounded-xl border p-3"/></label><button disabled={Boolean(busy)} className="elvo-button-primary w-full"><FiPlus/>Criar empresa</button></form>
    </div> : null}

    {data && section === 'modulos' ? <section className="elvo-card mt-8 overflow-x-auto p-6"><table className="w-full min-w-[700px] border-collapse text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wider text-slate-400"><th className="pb-4">Empresa</th>{data.modules.map((module) => <th key={module.key} className="pb-4 text-center">{module.name}</th>)}</tr></thead><tbody>{data.tenants.map((tenant) => <tr key={tenant.id} className="border-b border-slate-100 last:border-0"><td className="py-5"><strong>{tenant.name}</strong><span className="block text-xs text-slate-400">{tenant.slug}</span></td>{data.modules.map((module) => { const enabled = module.organizations.some((item) => item.organizationId === tenant.id && item.enabled); const action = `${tenant.id}-${module.key}`; return <td key={module.key} className="py-5 text-center"><button type="button" role="switch" aria-checked={enabled} aria-label={`${module.name} para ${tenant.name}`} disabled={busy === action} onClick={() => toggleModule(tenant.id, module.key, !enabled)} className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? 'bg-success' : 'bg-slate-200'}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${enabled ? 'left-6' : 'left-1'}`}/></button></td>; })}</tr>)}</tbody></table><div className="mt-6 grid gap-3 md:grid-cols-3">{data.modules.map((module) => <div key={module.key} className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">{module.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{module.description}</p></div>)}</div></section> : null}

    {data && section === 'usuarios' ? <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
      <section className="elvo-card overflow-hidden"><div className="border-b border-slate-100 p-6"><h2 className="font-semibold">{data.globalUsers.length} identidades únicas</h2></div><div className="divide-y divide-slate-100">{data.globalUsers.map((user) => <div key={user.id} className="p-5"><div className="flex flex-wrap justify-between gap-2"><div><p className="text-sm font-semibold">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div><span className="text-xs text-slate-400">{user.memberships.length} empresa(s)</span></div><div className="mt-3 flex flex-wrap gap-2">{user.memberships.map((membership) => <span key={membership.organization.id} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{membership.organization.name} · {roleLabel[membership.role]}</span>)}</div></div>)}</div></section>
      <form onSubmit={createUser} className="elvo-card h-fit space-y-4 p-6"><h2 className="text-lg font-semibold">Criar ou vincular usuário</h2><p className="text-xs leading-5 text-slate-500">Se o e-mail já existir, ele será apenas vinculado à empresa selecionada e a senha será ignorada.</p><input required minLength={2} placeholder="Nome completo" value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} className="w-full rounded-xl border p-3"/><input required type="email" placeholder="E-mail único" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} className="w-full rounded-xl border p-3"/><input minLength={12} type="password" placeholder="Senha inicial (somente novo e-mail)" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} className="w-full rounded-xl border p-3"/><select required value={userForm.organizationId} onChange={(event) => setUserForm({ ...userForm, organizationId: event.target.value })} className="w-full rounded-xl border p-3"><option value="">Selecione a empresa</option>{data.tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select><select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value as Role })} className="w-full rounded-xl border p-3"><option value="USER">Usuário</option><option value="TENANT_ADMIN">Administrador da Empresa</option><option value="SYSTEM_ADMIN">Administrador do Sistema</option></select><button disabled={Boolean(busy)} className="elvo-button-primary w-full"><FiPlus/>Salvar vínculo</button></form>
    </div> : null}

    {data && section === 'configuracoes' ? <div className="mt-8 grid gap-5 md:grid-cols-2"><section className="elvo-card p-6"><p className="text-xs font-bold uppercase tracking-wider text-success">Prospecção</p><h2 className="mt-2 text-lg font-semibold">{data.settings?.leadProvider}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Busca gratuita em dados abertos. Configure um identificador de contato válido no servidor e use cache para respeitar os serviços públicos.</p><dl className="mt-4 space-y-2 text-xs text-slate-500"><div><dt className="font-semibold text-midnight">Nominatim</dt><dd className="break-all">{data.settings?.nominatimUrl}</dd></div><div><dt className="font-semibold text-midnight">Overpass</dt><dd className="break-all">{data.settings?.overpassUrl}</dd></div></dl></section><section className="elvo-card p-6"><p className="text-xs font-bold uppercase tracking-wider text-success">Mensageria</p><h2 className="mt-2 text-lg font-semibold">{data.settings?.whatsappProvider}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Servidor gratuito e auto-hospedado. Cada empresa mantém sua própria sessão do WhatsApp, isolada por tenant.</p><span className={`mt-5 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${data.settings?.whatsappConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{data.settings?.whatsappConfigured ? 'Integração disponível' : 'Configuração pendente'}</span></section></div> : null}
  </div></main>;
}
