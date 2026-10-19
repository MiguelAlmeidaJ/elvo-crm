'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminCompanies from '../../../components/AdminCompanies';
import AdminUsers from '../../../components/AdminUsers';
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
  modulos: { title: 'Módulos', description: 'Catálogo de módulos disponíveis no sistema. Gerencie o acesso no cadastro da empresa.', Icon: FiLayers },
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

  if (section === 'empresas') return <AdminCompanies/>;
  if (section === 'usuarios') return <AdminUsers/>;

  return <main className="px-5 py-9 md:px-9"><div className="mx-auto max-w-7xl">
    <span className="eyebrow">Administração da plataforma</span>
    <div className="mt-3 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-mint/20 text-success"><meta.Icon size={20}/></span><div><h1 className="text-3xl font-semibold">{meta.title}</h1><p className="mt-1 text-sm text-slate-500">{meta.description}</p></div></div>
    {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}
    {notice ? <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><FiCheck className="mr-2 inline"/>{notice}</p> : null}
    {!data ? <p className="mt-8 text-sm text-slate-500">Carregando...</p> : null}

    {data && section === 'modulos' ? <section className="mt-8 grid gap-4 md:grid-cols-3">{data.modules.map(module=><article key={module.key} className="elvo-card p-6"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{module.name}</h2><span className={module.active?'text-xs text-emerald-700':'text-xs text-slate-500'}>{module.active?'Disponível':'Indisponível'}</span></div><p className="text-sm leading-6 text-slate-500">{module.description}</p></article>)}</section> : null}

    {data && section === 'configuracoes' ? <div className="mt-8 grid gap-5 md:grid-cols-2"><section className="elvo-card p-6"><p className="text-xs font-bold uppercase tracking-wider text-success">Prospecção</p><h2 className="mt-2 text-lg font-semibold">{data.settings?.leadProvider}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Busca gratuita em dados abertos. Configure um identificador de contato válido no servidor e use cache para respeitar os serviços públicos.</p><dl className="mt-4 space-y-2 text-xs text-slate-500"><div><dt className="font-semibold text-midnight">Nominatim</dt><dd className="break-all">{data.settings?.nominatimUrl}</dd></div><div><dt className="font-semibold text-midnight">Overpass</dt><dd className="break-all">{data.settings?.overpassUrl}</dd></div></dl></section><section className="elvo-card p-6"><p className="text-xs font-bold uppercase tracking-wider text-success">Mensageria</p><h2 className="mt-2 text-lg font-semibold">{data.settings?.whatsappProvider}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Servidor gratuito e auto-hospedado. Cada empresa mantém sua própria sessão do WhatsApp, isolada por tenant.</p><span className={`mt-5 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${data.settings?.whatsappConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{data.settings?.whatsappConfigured ? 'Integração disponível' : 'Configuração pendente'}</span></section></div> : null}
  </div></main>;
}
