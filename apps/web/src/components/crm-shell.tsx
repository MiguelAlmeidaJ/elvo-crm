'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FiBarChart2, FiBriefcase, FiCheckSquare, FiFileText, FiGrid, FiLogOut, FiMenu, FiSettings, FiUsers, FiX } from 'react-icons/fi';
import { BrandLogo } from './brand-logo';
const links = [{ href:'/',label:'Visão geral',Icon:FiGrid },{href:'/clientes',label:'Clientes',Icon:FiUsers},{href:'/oportunidades',label:'Oportunidades',Icon:FiBriefcase},{href:'/tarefas',label:'Tarefas',Icon:FiCheckSquare},{href:'/propostas',label:'Propostas',Icon:FiFileText},{href:'/relatorios',label:'Relatórios',Icon:FiBarChart2},{href:'/configuracoes',label:'Configurações',Icon:FiSettings}];
export function CrmShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(), router = useRouter();
  const [menu,setMenu] = useState(false);
  const [user,setUser] = useState<{ name:string; organization:string } | null>(null);
  useEffect(() => { if(path==='/login') return; let live=true;
    fetch('/api/v1/auth/me',{cache:'no-store'}).then(r=>{ if(r.status===401){router.replace('/login');return null;}if(!r.ok)throw Error('Falha ao validar sessão');return r.json(); }).then(d=>{if(live&&d)setUser(d);}).catch(()=>{if(live)router.replace('/login');});
    return ()=>{live=false;};
  },[path,router]);
  if(path==='/login') return <>{children}</>;
  const navigation = <><div className="mb-9 px-3"><BrandLogo variant="dark" width={155} height={52} priority /></div><p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[.24em] text-slate-400">Workspace</p><nav aria-label="Menu principal" className="space-y-1">{links.map(({href,label,Icon})=><Link key={href} href={href} onClick={()=>setMenu(false)} aria-current={href===path?'page':undefined} className={'flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors '+(href===path || (href!=='/'&&path.startsWith(href+'/'))?'bg-mint font-semibold text-midnight':'text-slate-300 hover:bg-white/10 hover:text-white')}><Icon size={18}/>{label}</Link>)}</nav></>;
  async function logout(){await fetch('/api/v1/auth/logout',{method:'POST'});router.replace('/login');router.refresh();}
  return <div className="min-h-screen bg-cloud md:flex">
    {menu&&<button className="fixed inset-0 z-30 bg-midnight/70 md:hidden" aria-label="Fechar menu" onClick={()=>setMenu(false)}/>}
    <aside className={'elvo-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col px-4 py-7 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 '+(menu?'translate-x-0':'-translate-x-full')}>
      <button aria-label="Fechar menu" onClick={()=>setMenu(false)} className="absolute right-4 top-5 text-white md:hidden"><FiX size={22}/></button>{navigation}<div className="mt-auto border-t border-white/10 pt-5"><p className="px-3 text-xs font-semibold text-white">{user?.organization??'ELVO CRM'}</p><p className="px-3 py-1 text-xs text-slate-400">{user?.name??'Carregando...'}</p><button onClick={logout} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/10"><FiLogOut/> Sair</button></div>
    </aside>
    <div className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-[74px] items-center gap-4 border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-9"><button className="md:hidden" onClick={()=>setMenu(true)} aria-label="Abrir menu"><FiMenu size={23}/></button><span className="text-sm font-semibold text-midnight">ELVO <span className="font-normal text-slate-400">/ {links.find(l=>l.href===path)?.label??'CRM'}</span></span><div className="ml-auto rounded-full bg-midnight px-3 py-2 text-xs font-bold text-mint">{user?.name?.slice(0,1).toUpperCase()??'E'}</div></header>
      <div className="mx-auto w-full max-w-[1500px]">{children}</div>
    </div>
  </div>;
}
