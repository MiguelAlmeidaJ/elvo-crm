'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FiArrowLeft, FiCheck, FiEdit2, FiEye, FiPlus, FiSearch, FiSlash, FiRefreshCcw } from 'react-icons/fi';

type Company = { id: string; name: string; slug: string; active: boolean; legalName?: string | null; document?: string | null; email?: string | null; phone?: string | null; website?: string | null; postalCode?: string | null; address?: string | null; addressNumber?: string | null; complement?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null; country?: string | null; industry?: string | null; notes?: string | null; _count?: { memberships: number; contacts: number } };
type Context = { role: string; tenants: Company[] };
type Field = keyof Omit<Company, 'id' | 'active' | '_count'>;
const fields: { title: string; fields: { key: Field; label: string; type?: string; required?: boolean }[] }[] = [
  { title: 'Identificação empresarial', fields: [{ key: 'name', label: 'Nome da empresa', required: true }, { key: 'legalName', label: 'Razão social' }, { key: 'slug', label: 'Identificador', required: true }, { key: 'document', label: 'CNPJ / Documento' }, { key: 'industry', label: 'Segmento' }] },
  { title: 'Contatos e presença digital', fields: [{ key: 'email', label: 'E-mail', type: 'email' }, { key: 'phone', label: 'Telefone' }, { key: 'website', label: 'Website', type: 'url' }] },
  { title: 'Endereço', fields: [{ key: 'postalCode', label: 'CEP' }, { key: 'address', label: 'Logradouro' }, { key: 'addressNumber', label: 'Número' }, { key: 'complement', label: 'Complemento' }, { key: 'neighborhood', label: 'Bairro' }, { key: 'city', label: 'Cidade' }, { key: 'state', label: 'UF' }, { key: 'country', label: 'País' }] },
  { title: 'Informações adicionais', fields: [{ key: 'notes', label: 'Observações' }] },
];
const blank = Object.fromEntries(fields.flatMap(group => group.fields.map(f => [f.key, f.key === 'country' ? 'Brasil' : '']))) as Record<Field, string>;
async function message(response: Response) { const json = await response.json().catch(() => ({})); return Array.isArray(json.message) ? json.message.join(', ') : json.message || 'Operação não concluída'; }
export default function AdminCompanies() {
  const path = usePathname();
  const router = useRouter();
  const segments = path.split('/').filter(Boolean).slice(2);
  const mode = segments.length === 0 ? 'list' : segments[0] === 'nova' ? 'create' : segments[1] === 'editar' ? 'edit' : 'view';
  const id = mode === 'edit' || mode === 'view' ? segments[0] : null;
  const [items, setItems] = useState<Company[]>([]);
  const [current, setCurrent] = useState<Company | null>(null);
  const [form, setForm] = useState<Record<Field,string>>(blank);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirm, setConfirm] = useState<Company | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    if (mode === 'list') {
      const response = await fetch('/api/v1/administration/context', { cache: 'no-store' });
      if (!response.ok) throw new Error(await message(response));
      const data = await response.json() as Context;
      if (data.role !== 'SYSTEM_ADMIN') throw new Error('Acesso restrito ao administrador do sistema');
      setItems(data.tenants);
    } else if (id) {
      const response = await fetch('/api/v1/administration/tenants/' + encodeURIComponent(id), { cache: 'no-store' });
      if (!response.ok) throw new Error(await message(response));
      const company = await response.json() as Company;
      setCurrent(company);
      setForm(Object.fromEntries(Object.keys(blank).map(key => [key, String(company[key as Field] ?? '')])) as Record<Field,string>);
    }
  }, [mode, id]);
  useEffect(() => { load().catch(e => setError(e instanceof Error ? e.message : 'Falha ao carregar')); }, [load]);
  useEffect(() => { setError(''); setNotice(''); }, [path]);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = Object.fromEntries(Object.entries(form).map(([key,value]) => [key, value.trim() || (key === 'name' || key === 'slug' ? '' : null)]));
      const response = await fetch('/api/v1/administration/tenants' + (mode === 'edit' ? '/' + id : ''), {
        method: mode === 'edit' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(await message(response));
      router.push('/admin/empresas');
      router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : 'Falha ao salvar'); } finally { setBusy(false); }
  }
  async function changeStatus() {
    if (!confirm || typed !== confirm.name) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/v1/administration/tenants/' + confirm.id + '/status', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !confirm.active, confirmationName: typed })
      });
      if (!response.ok) throw new Error(await message(response));
      setNotice(confirm.active ? 'Empresa inativada com sucesso.' : 'Empresa reativada com sucesso.');
      setConfirm(null); setTyped(''); await load();
    } catch(e) { setError(e instanceof Error ? e.message : 'Falha na alteração de status'); } finally { setBusy(false); }
  }
  const filtered = items.filter(company => (filter === 'all' || (filter === 'active' ? company.active : !company.active)) && [company.name,company.legalName,company.slug,company.document,company.city].some(x => (x || '').toLowerCase().includes(search.toLowerCase())));
  const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100';
  return <main className="mx-auto max-w-7xl px-5 py-9 md:px-9">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><span className="eyebrow">Administração da plataforma</span><h1 className="mt-3 text-3xl font-semibold">{mode === 'list' ? 'Empresas' : mode === 'create' ? 'Cadastrar empresa' : mode === 'edit' ? 'Editar empresa' : 'Detalhes da empresa'}</h1><p className="mt-2 text-sm text-slate-500">{mode === 'list' ? 'Gerencie cadastros, acessos e situação das empresas.' : 'Informações cadastrais da organização no ELVO CRM.'}</p></div>{mode === 'list' ? <Link className="elvo-button-primary" href="/admin/empresas/nova"><FiPlus/>Nova empresa</Link> : <Link href="/admin/empresas" className={button}><FiArrowLeft/>Voltar à lista</Link>}</div>
    {error && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><FiCheck className="mr-2 inline"/>{notice}</p>}
    {mode === 'list' ? <section className="elvo-card overflow-hidden"><div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-5"><strong className="mr-auto">{filtered.length} de {items.length} empresas</strong><label className="relative"><FiSearch className="absolute left-3 top-3.5 text-slate-400"/><input aria-label="Pesquisar empresas" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome, CNPJ, cidade..." className="rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm"/></label><select aria-label="Filtrar por status" value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-xl border border-slate-200 p-2.5 text-sm"><option value="all">Todas</option><option value="active">Ativas</option><option value="inactive">Inativas</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Empresa','Identificador','Localização','Usuários','Clientes','Status','Ações'].map(c=><th key={c} className="px-5 py-4">{c}</th>)}</tr></thead><tbody>{filtered.map(c=><tr key={c.id} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{c.name}<span className="block text-xs font-normal text-slate-500">{c.document || c.legalName || '—'}</span></td><td className="px-5 py-4 text-slate-500">{c.slug}</td><td className="px-5 py-4">{[c.city,c.state].filter(Boolean).join(' / ') || '—'}</td><td className="px-5 py-4">{c._count?.memberships ?? 0}</td><td className="px-5 py-4">{c._count?.contacts ?? 0}</td><td className="px-5 py-4"><span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{c.active ? 'Ativa' : 'Inativa'}</span></td><td className="px-5 py-4"><div className="flex gap-2"><Link title="Visualizar" aria-label={'Visualizar '+c.name} href={'/admin/empresas/'+c.id} className={button}><FiEye/></Link><Link title="Editar" aria-label={'Editar '+c.name} href={'/admin/empresas/'+c.id+'/editar'} className={button}><FiEdit2/></Link><button type="button" title={c.active ? 'Inativar':'Reativar'} aria-label={(c.active ? 'Inativar ':'Reativar ')+c.name} onClick={()=>{setConfirm(c);setTyped('');}} className={button}>{c.active?<FiSlash/>:<FiRefreshCcw/>}</button></div></td></tr>)}</tbody></table>{!filtered.length && <p className="p-10 text-center text-sm text-slate-500">Nenhuma empresa encontrada.</p>}</div></section> : null}
    {(mode === 'create' || mode === 'edit' || mode === 'view') && (mode === 'create' || current) ? <form onSubmit={save} className="space-y-5">{mode !== 'create' && current && <div className="elvo-card flex flex-wrap items-center justify-between gap-4 p-5"><span className={current.active ? 'text-emerald-700':'text-rose-600'}>{current.active ? '● Empresa ativa':'● Empresa inativa'}</span>{mode === 'view' && <Link href={'/admin/empresas/'+current.id+'/editar'} className="elvo-button-primary"><FiEdit2/>Editar cadastro</Link>}</div>}{fields.map(group=><section key={group.title} className="elvo-card p-6"><h2 className="mb-5 text-lg font-semibold">{group.title}</h2><div className="grid gap-4 md:grid-cols-2">{group.fields.map(field=><label key={field.key} className={'block text-sm font-semibold '+(field.key === 'notes' ? 'md:col-span-2':'')}>{field.label}{field.required ? ' *':''}{field.key === 'notes' ? <textarea disabled={mode==='view'} rows={4} value={form[field.key]} onChange={e=>setForm(s=>({...s,[field.key]:e.target.value}))} className="mt-2 w-full rounded-xl border border-slate-200 p-3 disabled:bg-slate-50"/> : <input required={field.required} disabled={mode==='view'} type={field.type || 'text'} pattern={field.key === 'slug' ? '[a-z0-9]+(?:-[a-z0-9]+)*' : undefined} value={form[field.key]} onChange={e=>setForm(s=>({...s,[field.key]:field.key==='slug'?e.target.value.toLowerCase():e.target.value}))} className="mt-2 w-full rounded-xl border border-slate-200 p-3 disabled:bg-slate-50"/>}</label>)}</div></section>)}{mode !== 'view' && <div className="flex justify-end gap-3"><Link href="/admin/empresas" className="rounded-xl border border-slate-200 px-5 py-3">Cancelar</Link><button disabled={busy} className="elvo-button-primary">{busy ? 'Salvando...' : 'Salvar empresa'}</button></div>}</form> : null}
    {confirm && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4"><section role="dialog" aria-modal="true" aria-labelledby="confirm-company-title" className="elvo-card w-full max-w-lg p-7"><h2 id="confirm-company-title" className="text-xl font-semibold">{confirm.active ? 'Inativar empresa':'Reativar empresa'}</h2><p className="mt-3 text-sm leading-6 text-slate-600">Essa ação {confirm.active ? 'impedirá o acesso à empresa, preservando seus dados e vínculos.' : 'permitirá novamente o acesso à empresa.'} Para confirmar, digite exatamente <strong>{confirm.name}</strong>.</p><label className="mt-5 block text-sm font-semibold">Nome da empresa<input autoFocus value={typed} onChange={e=>setTyped(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setConfirm(null)} className="rounded-xl border border-slate-200 px-4 py-3">Cancelar</button><button type="button" disabled={busy || typed !== confirm.name} onClick={changeStatus} className="rounded-xl bg-rose-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Aguarde...' : confirm.active ? 'Confirmar inativação' : 'Confirmar reativação'}</button></div></section></div>}
  </main>;
}
