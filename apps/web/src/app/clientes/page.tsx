'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
type Contact = { id: string; name: string; email: string | null; phone: string | null; company: string | null; status: string; notes: string | null };
type ResponseList = { items: Contact[]; total: number; page: number; pages: number };
const empty = { name: '', email: '', phone: '', company: '', status: 'Ativo', notes: '' };
export default function Clientes() {
  const router = useRouter();
  const [data, setData] = useState<ResponseList>({ items: [], total: 0, page: 1, pages: 0 });
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1);
  const [form, setForm] = useState(empty); const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/v1/contacts?q='+encodeURIComponent(query)+'&page='+page, { cache: 'no-store' });
    if (response.status === 401) { router.replace('/login'); return; }
    if (!response.ok) throw new Error('Falha ao carregar clientes');
    setData(await response.json());
  }, [query, page, router]);
  useEffect(() => { load().catch(e=>setError(e.message)); }, [load]);
  function edit(item: Contact) {
    setEditing(item.id); setForm({ name:item.name, email:item.email??'',phone:item.phone??'',company:item.company??'',status:item.status,notes:item.notes??'' });setShowForm(true);setError('');
  }
  async function save(e: FormEvent) {
    e.preventDefault();setBusy(true);setError('');
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k,v])=>[k,v.trim() || (k==='name'||k==='status'?'':null)]));
      const response = await fetch('/api/v1/contacts'+(editing?'/'+editing:''),{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if (!response.ok) { const payload=await response.json().catch(()=>({})); throw new Error(Array.isArray(payload.message)?payload.message.join(', '):payload.message??'Não foi possível salvar'); }
      setShowForm(false);setEditing(null);setForm(empty);await load();
    } catch(e) {setError((e as Error).message);}finally{setBusy(false);}
  }
  async function remove(item: Contact) {
    if (!window.confirm('Excluir '+item.name+'? Esta ação não pode ser desfeita.')) return;
    setError('');
    const response=await fetch('/api/v1/contacts/'+item.id,{method:'DELETE'});
    if (!response.ok){setError('Não foi possível excluir o cliente');return;}
    await load();
  }
  return <main className="mx-auto max-w-6xl px-5 py-10 md:px-9">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-success">Relacionamentos</p><h1 className="mt-2 text-3xl font-bold">Clientes</h1><p className="mt-2 text-sm text-slate-500">Cadastre e gerencie sua carteira de clientes.</p></div><button className="elvo-button-primary" onClick={()=>{setEditing(null);setForm(empty);setShowForm(true);setError('');}}>+ Novo cliente</button></div>
    <section className="elvo-card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><strong>{data.total} clientes</strong><input aria-label="Buscar clientes" placeholder="Buscar nome, empresa ou e-mail" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} className="w-full max-w-sm rounded-lg border border-slate-200 px-4 py-3 text-sm"/></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-cloud text-xs uppercase text-slate-500"><tr>{['Nome','Empresa','Contato','Status','Ações'].map(x=><th key={x} className="px-5 py-4">{x}</th>)}</tr></thead><tbody>{data.items.map(item=><tr key={item.id} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{item.name}</td><td className="px-5 py-4">{item.company||'—'}</td><td className="px-5 py-4"><div>{item.email||'—'}</div><div className="text-slate-500">{item.phone}</div></td><td className="px-5 py-4">{item.status}</td><td className="whitespace-nowrap px-5 py-4"><button onClick={()=>edit(item)} className="mr-4 font-semibold text-emerald-700">Editar</button><button onClick={()=>remove(item)} className="text-rose-700">Excluir</button></td></tr>)}</tbody></table>{!data.items.length&&<p className="p-10 text-center text-sm text-slate-500">Nenhum cliente encontrado.</p>}</div>
    <div className="flex items-center justify-end gap-4 border-t border-slate-100 p-4 text-sm"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>{page} / {Math.max(1,data.pages)}</span><button disabled={page>=data.pages} onClick={()=>setPage(p=>p+1)}>Próximo</button></div></section>
    {error&&!showForm&&<p role="alert" className="mt-5 text-sm text-rose-700">{error}</p>}
    {showForm&&<div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-midnight/70 p-4"><section role="dialog" aria-modal="true" aria-label={editing?'Editar cliente':'Novo cliente'} className="elvo-card w-full max-w-xl p-7"><div className="mb-6 flex justify-between"><h2 className="text-xl font-bold">{editing?'Editar cliente':'Novo cliente'}</h2><button aria-label="Fechar" onClick={()=>setShowForm(false)}>✕</button></div><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      {(['name','company','email','phone'] as const).map(key=><label key={key} className="text-sm font-semibold">{({name:'Nome *',company:'Empresa',email:'E-mail',phone:'Telefone'})[key]}<input required={key==='name'} type={key==='email'?'email':'text'} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} className="mt-2 w-full rounded-lg border border-slate-200 p-3"/></label>)}
      <label className="text-sm font-semibold">Status<select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="mt-2 w-full rounded-lg border border-slate-200 p-3"><option>Ativo</option><option>Prospect</option><option>Inativo</option></select></label>
      <label className="sm:col-span-2 text-sm font-semibold">Observações<textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="mt-2 w-full rounded-lg border border-slate-200 p-3" rows={3}/></label>
      {error&&<p role="alert" className="sm:col-span-2 text-sm text-rose-700">{error}</p>}<div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={()=>setShowForm(false)} className="px-4 py-3">Cancelar</button><button disabled={busy} className="elvo-button-primary">{busy?'Salvando...':'Salvar cliente'}</button></div>
    </form></section></div>}
  </main>;
}
