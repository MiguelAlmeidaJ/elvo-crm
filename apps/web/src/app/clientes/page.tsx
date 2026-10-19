'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMapPin, FiPlus, FiSearch, FiX } from 'react-icons/fi';

type Contact = {
  id: string; name: string; entityType: string; document: string | null; email: string | null; phone: string | null;
  secondaryPhone: string | null; company: string | null; jobTitle: string | null; website: string | null;
  address: string | null; city: string | null; state: string | null; postalCode: string | null; country: string | null;
  category: string | null; source: string; tags: string[]; status: string; notes: string | null;
};
type ResponseList = { items: Contact[]; total: number; page: number; pages: number };
type FormState = { [Key in keyof Omit<Contact, 'id' | 'tags'>]: string } & { tags: string };

const empty: FormState = {
  name: '', entityType: 'COMPANY', document: '', email: '', phone: '', secondaryPhone: '', company: '', jobTitle: '',
  website: '', address: '', city: '', state: '', postalCode: '', country: 'Brasil', category: '', source: 'MANUAL',
  tags: '', status: 'Ativo', notes: '',
};

const fields: { key: keyof FormState; label: string; type?: string; required?: boolean; span?: boolean; placeholder?: string }[] = [
  { key: 'name', label: 'Nome / Razão social', required: true }, { key: 'document', label: 'CPF / CNPJ' },
  { key: 'company', label: 'Empresa / Nome fantasia' }, { key: 'category', label: 'Segmento' },
  { key: 'email', label: 'E-mail', type: 'email' }, { key: 'phone', label: 'Telefone principal' },
  { key: 'secondaryPhone', label: 'Telefone secundário' }, { key: 'jobTitle', label: 'Cargo' },
  { key: 'website', label: 'Website', type: 'url', placeholder: 'https://...' }, { key: 'postalCode', label: 'CEP' },
  { key: 'address', label: 'Endereço', span: true }, { key: 'city', label: 'Cidade' }, { key: 'state', label: 'Estado' },
  { key: 'tags', label: 'Tags', span: true, placeholder: 'vip, indústria, indicação' },
];

export default function Clientes() {
  const router = useRouter();
  const [data, setData] = useState<ResponseList>({ items: [], total: 0, page: 1, pages: 0 });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/contacts?q=${encodeURIComponent(query)}&page=${page}`, { cache: 'no-store' });
    if (response.status === 401) { router.replace('/login'); return; }
    if (!response.ok) throw new Error('Falha ao carregar clientes');
    setData(await response.json());
  }, [query, page, router]);
  useEffect(() => { load().catch((cause) => setError(cause.message)); }, [load]);

  function openNew() { setEditing(null); setForm(empty); setShowForm(true); setError(''); }
  function edit(item: Contact) {
    const values = Object.fromEntries(Object.keys(empty).map((key) => {
      if (key === 'tags') return [key, item.tags.join(', ')];
      return [key, item[key as keyof Omit<Contact, 'id' | 'tags'>] ?? ''];
    })) as FormState;
    setEditing(item.id); setForm(values); setShowForm(true); setError('');
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, key === 'tags' ? value.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 20) : value.trim() || null]));
      const response = await fetch(`/api/v1/contacts${editing ? `/${editing}` : ''}`, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
      if (!response.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message ?? 'Não foi possível salvar');
      setShowForm(false); setEditing(null); setForm(empty); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar'); }
    finally { setBusy(false); }
  }

  async function remove(item: Contact) {
    if (!window.confirm(`Excluir ${item.name}? Esta ação não pode ser desfeita.`)) return;
    const response = await fetch(`/api/v1/contacts/${item.id}`, { method: 'DELETE' });
    if (!response.ok) { setError('Não foi possível excluir o cliente'); return; }
    await load();
  }

  return <main className="mx-auto max-w-7xl px-5 py-10 md:px-9">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><span className="eyebrow">Relacionamentos</span><h1 className="mt-3 text-3xl font-semibold">Clientes</h1><p className="mt-2 text-sm text-slate-500">Uma visão completa de contatos, empresas e prospects.</p></div><button className="elvo-button-primary" onClick={openNew}><FiPlus/>Novo cliente</button></div>
    <section className="elvo-card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><strong>{data.total} clientes</strong><label className="relative w-full max-w-md"><FiSearch className="absolute left-4 top-3.5 text-slate-400"/><input aria-label="Buscar clientes" placeholder="Nome, empresa, documento, telefone ou cidade" value={query} onChange={(event)=>{setQuery(event.target.value);setPage(1);}} className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm"/></label></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-cloud text-xs uppercase text-slate-500"><tr>{['Cliente','Localização','Contato','Origem','Status','Ações'].map((label)=><th key={label} className="px-5 py-4">{label}</th>)}</tr></thead><tbody>{data.items.map((item)=><tr key={item.id} className="border-t border-slate-100"><td className="px-5 py-4"><Link href={`/clientes/${item.id}`} className="font-semibold text-emerald-700 hover:underline">{item.name}</Link><p className="mt-1 text-xs text-slate-500">{item.company || item.category || (item.entityType === 'COMPANY' ? 'Empresa' : 'Pessoa')}</p></td><td className="px-5 py-4 text-slate-600">{item.city ? <span className="flex items-center gap-1"><FiMapPin/>{item.city}{item.state ? `, ${item.state}` : ''}</span> : '—'}</td><td className="px-5 py-4"><div>{item.email || '—'}</div><div className="text-slate-500">{item.phone}</div></td><td className="px-5 py-4 text-xs font-semibold text-slate-500">{item.source === 'LEAD_SEARCH' ? 'Buscador' : 'Manual'}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{item.status}</span></td><td className="whitespace-nowrap px-5 py-4"><button onClick={()=>edit(item)} className="mr-4 font-semibold text-emerald-700">Editar</button><button onClick={()=>remove(item)} className="text-rose-700">Excluir</button></td></tr>)}</tbody></table>{!data.items.length ? <p className="p-10 text-center text-sm text-slate-500">Nenhum cliente encontrado.</p> : null}</div>
      <div className="flex items-center justify-end gap-4 border-t border-slate-100 p-4 text-sm"><button disabled={page<=1} onClick={()=>setPage((current)=>current-1)}>Anterior</button><span>{page} / {Math.max(1,data.pages)}</span><button disabled={page>=data.pages} onClick={()=>setPage((current)=>current+1)}>Próximo</button></div>
    </section>
    {error && !showForm ? <p role="alert" className="mt-5 text-sm text-rose-700">{error}</p> : null}
    {showForm ? <div className="fixed inset-0 z-50 overflow-y-auto bg-midnight/75 p-4"><section role="dialog" aria-modal="true" aria-label={editing?'Editar cliente':'Novo cliente'} className="elvo-card mx-auto my-4 w-full max-w-3xl p-6 md:my-10 md:p-8"><div className="mb-6 flex justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-success">Cadastro completo</p><h2 className="mt-2 text-xl font-semibold">{editing?'Editar cliente':'Novo cliente'}</h2></div><button aria-label="Fechar" onClick={()=>setShowForm(false)} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100"><FiX/></button></div><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Tipo<select value={form.entityType} onChange={(event)=>setForm((current)=>({...current,entityType:event.target.value}))} className="mt-2 w-full rounded-xl border border-slate-200 p-3"><option value="COMPANY">Empresa</option><option value="PERSON">Pessoa</option></select></label>
      <label className="text-sm font-semibold">Status<select value={form.status} onChange={(event)=>setForm((current)=>({...current,status:event.target.value}))} className="mt-2 w-full rounded-xl border border-slate-200 p-3"><option>Ativo</option><option>Prospect</option><option>Inativo</option></select></label>
      {fields.map((field)=><label key={field.key} className={`text-sm font-semibold ${field.span?'sm:col-span-2':''}`}>{field.label}{field.required?' *':''}<input required={field.required} type={field.type??'text'} placeholder={field.placeholder} value={form[field.key]} onChange={(event)=>setForm((current)=>({...current,[field.key]:event.target.value}))} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/></label>)}
      <label className="text-sm font-semibold sm:col-span-2">Observações<textarea value={form.notes} onChange={(event)=>setForm((current)=>({...current,notes:event.target.value}))} className="mt-2 w-full rounded-xl border border-slate-200 p-3" rows={4}/></label>
      {error ? <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{error}</p> : null}<div className="flex justify-end gap-3 border-t border-slate-100 pt-5 sm:col-span-2"><button type="button" onClick={()=>setShowForm(false)} className="px-4 py-3">Cancelar</button><button disabled={busy} className="elvo-button-primary">{busy?'Salvando...':'Salvar cliente'}</button></div>
    </form></section></div> : null}
  </main>;
}
