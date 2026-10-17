'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
type Contact = { id:string;name:string;company:string|null;email:string|null;phone:string|null;status:string;notes:string|null;createdAt:string };
type Deal = { id:string;title:string;amount:string;stage:string;contactId:string };
const money = (v:string)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v));
export default function ClienteDetalhe() {
  const params=useParams(), router=useRouter();const id=String(params.id);
  const [client,setClient]=useState<Contact|null>(null);const [deals,setDeals]=useState<Deal[]>([]);const [error,setError]=useState('');
  useEffect(()=>{Promise.all([fetch('/api/v1/contacts/'+id),fetch('/api/v1/opportunities')]).then(async ([a,b])=>{
    if(a.status===401){router.replace('/login');return;}
    if(!a.ok||!b.ok)throw Error('Não foi possível carregar o cliente');
    setClient(await a.json());setDeals((await b.json()).filter((d:Deal)=>d.contactId===id));
  }).catch(e=>setError(e.message));},[id,router]);
  const [activities,setActivities]=useState<{id:string;type:string;description:string;createdAt:string}[]>([]);
  const [description,setDescription]=useState('');const [type,setType]=useState('NOTE');
  async function refreshActivities(){const r=await fetch('/api/v1/activities?contactId='+encodeURIComponent(id));if(r.ok)setActivities(await r.json());}
  useEffect(()=>{refreshActivities().catch(()=>{});},[id]);
  async function addActivity(e:import('react').FormEvent){e.preventDefault();const r=await fetch('/api/v1/activities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:id,type,description})});if(!r.ok){setError('Erro ao registrar atividade');return;}setDescription('');await refreshActivities();}
  return <main className="px-5 py-9 md:px-9"><Link href="/clientes" className="text-sm font-semibold text-emerald-700">← Voltar aos clientes</Link>
    {error&&<p role="alert" className="mt-5 text-rose-700">{error}</p>}
    {!client&&!error&&<p className="mt-8 text-slate-500">Carregando cliente...</p>}
    {client&&<><div className="mb-8 mt-6 flex items-center gap-4"><div className="grid size-16 place-items-center rounded-2xl bg-mint text-2xl font-bold">{client.name[0]}</div><div><p className="text-sm text-slate-500">{client.company||'Contato'}</p><h1 className="text-3xl font-bold">{client.name}</h1><span className="text-sm text-emerald-700">{client.status}</span></div></div>
      <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]"><section className="elvo-card p-6"><h2 className="text-lg font-bold">Oportunidades relacionadas</h2><p className="mt-2 text-sm text-slate-500">{deals.length} negócios vinculados</p><div className="mt-5 space-y-3">{deals.map(d=><div key={d.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4"><div><strong>{d.title}</strong><p className="text-xs text-slate-500">{d.stage}</p></div><span className="font-semibold">{money(d.amount)}</span></div>)}{!deals.length&&<p className="rounded-xl bg-cloud p-5 text-sm text-slate-500">Nenhuma oportunidade ainda. Crie a primeira no funil comercial.</p>}</div><Link href="/oportunidades" className="mt-5 inline-block text-sm font-semibold text-emerald-700">Ir para oportunidades →</Link><h2 className="mt-10 text-lg font-bold">Histórico de atividades</h2><form onSubmit={addActivity} className="mt-4 space-y-3"><select aria-label="Tipo de atividade" className="rounded-lg border p-2" value={type} onChange={e=>setType(e.target.value)}><option value="NOTE">Nota</option><option value="CALL">Ligação</option><option value="MEETING">Reunião</option><option value="EMAIL">E-mail</option></select><textarea required minLength={2} maxLength={3000} aria-label="Descrição da atividade" className="w-full rounded-lg border p-3" rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Registre uma interação..."/><button className="elvo-button-primary">Registrar atividade</button></form><div className="mt-5 space-y-3">{activities.map(a=><div key={a.id} className="rounded-xl border p-4"><p className="text-xs text-slate-500">{a.type} · {new Date(a.createdAt).toLocaleString('pt-BR')}</p><p className="mt-2 whitespace-pre-wrap text-sm">{a.description}</p></div>)}{!activities.length&&<p className="text-sm text-slate-500">Nenhuma atividade registrada.</p>}</div><h2 className="mt-10 text-lg font-bold">Observações</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{client.notes||'Sem observações cadastradas.'}</p></section>
      <aside className="elvo-card p-6"><h2 className="mb-6 text-lg font-bold">Dados do cliente</h2>{[['Empresa',client.company],['E-mail',client.email],['Telefone',client.phone],['Status',client.status],['Criado em',new Date(client.createdAt).toLocaleDateString('pt-BR')]].map(([label,value])=><div key={label} className="border-b border-slate-100 py-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{value||'—'}</p></div>)}</aside></div>
    </>}
  </main>;
}
