'use client';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
type Task={id:string;title:string;done:boolean;dueAt:string|null;contact:{id:string;name:string}|null};
export default function Tarefas(){
 const [items,setItems]=useState<Task[]>([]),[title,setTitle]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const r=await fetch('/api/v1/tasks',{cache:'no-store'});if(!r.ok)throw Error('Não foi possível carregar tarefas');setItems(await r.json());}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 async function add(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/v1/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title})});if(!r.ok)throw Error('Não foi possível cadastrar');setTitle('');await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function toggle(t:Task){const r=await fetch('/api/v1/tasks/'+t.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({done:!t.done})});if(!r.ok){setError('Erro ao atualizar tarefa');return;}await load();}
 async function remove(t:Task){if(!confirm('Excluir esta tarefa?'))return;const r=await fetch('/api/v1/tasks/'+t.id,{method:'DELETE'});if(!r.ok){setError('Não foi possível excluir');return;}await load();}
 return <main className="px-5 py-9 md:px-9"><p className="text-xs font-bold uppercase tracking-widest text-success">Produtividade</p><h1 className="mt-2 text-3xl font-bold">Tarefas</h1><p className="mt-2 text-sm text-slate-500">Organize seu dia com atividades salvas no CRM.</p>
 <form onSubmit={add} className="elvo-card mt-8 flex flex-wrap gap-3 p-5"><input aria-label="Título da tarefa" required minLength={2} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="O que precisa ser feito?" className="min-w-56 flex-1 rounded-lg border border-slate-200 p-3"/><button disabled={busy} className="elvo-button-primary">+ Adicionar</button></form>
 {error&&<p role="alert" className="my-4 text-red-700">{error}</p>}
 <section className="elvo-card mt-5 divide-y divide-slate-100">{items.map(t=><div key={t.id} className="flex items-center gap-4 p-5"><input aria-label={'Concluir '+t.title} type="checkbox" checked={t.done} onChange={()=>toggle(t)} className="size-5 accent-emerald-500"/><div className="flex-1"><p className={t.done?'text-slate-400 line-through':'font-semibold'}>{t.title}</p>{t.contact&&<Link className="text-xs text-emerald-700" href={'/clientes/'+t.contact.id}>{t.contact.name}</Link>}</div><button onClick={()=>remove(t)} className="text-sm text-rose-700">Excluir</button></div>)}{!items.length&&<p className="p-10 text-center text-sm text-slate-500">Nenhuma tarefa cadastrada.</p>}</section></main>;
}
