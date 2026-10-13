const styles: Record<string,string> = {
 'Ativo':'bg-emerald-50 text-emerald-700','Qualificação':'bg-blue-50 text-blue-700',
 'Negociação':'bg-amber-50 text-amber-700','Proposta':'bg-violet-50 text-violet-700',
 'Concluída':'bg-emerald-50 text-emerald-700','Pendente':'bg-amber-50 text-amber-700',
 'Em andamento':'bg-blue-50 text-blue-700','Enviada':'bg-blue-50 text-blue-700',
 'Rascunho':'bg-slate-100 text-slate-600','Aceita':'bg-emerald-50 text-emerald-700',
};
export function StatusPill({status}:{status:string}){return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]||'bg-slate-100 text-slate-600'}`}>{status}</span>;}
