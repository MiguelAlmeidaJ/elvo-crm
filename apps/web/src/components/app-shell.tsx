'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiBarChart2, FiBell, FiBriefcase, FiCheckSquare, FiChevronDown, FiFileText, FiGrid, FiHelpCircle, FiMenu, FiSearch, FiSettings, FiUsers, FiX } from 'react-icons/fi';
import { BrandLogo } from './brand-logo';

const links = [
  { label: 'Dashboard', href: '/', icon: FiGrid },
  { label: 'Clientes', href: '/clientes', icon: FiUsers },
  { label: 'Oportunidades', href: '/oportunidades', icon: FiBriefcase },
  { label: 'Tarefas', href: '/tarefas', icon: FiCheckSquare },
  { label: 'Propostas', href: '/propostas', icon: FiFileText },
  { label: 'Relatórios', href: '/relatorios', icon: FiBarChart2 },
  { label: 'Configurações', href: '/configuracoes', icon: FiSettings },
];
export function AppShell({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const [open,setOpen] = useState(false);
  const nav = <><div className="mb-10 px-3"><BrandLogo variant="dark" width={166} height={56} priority/></div>
    <p className="px-4 pb-3 text-[10px] font-bold uppercase tracking-[.23em] text-slate-500">Workspace</p>
    <nav aria-label="Navegação principal" className="space-y-1">{links.map(({href,label,icon:Icon})=>{
      const active = href==='/' ? pathname==='/' : pathname===href || pathname.startsWith(href+'/');
      return <Link key={href} href={href} onClick={()=>setOpen(false)} aria-current={active?'page':undefined} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${active?'bg-mint font-bold text-midnight':'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon size={17} aria-hidden/>{label}</Link>;
    })}</nav><div className="mt-auto border-t border-white/10 px-3 pt-5 text-xs text-slate-400"><span className="flex items-center gap-2"><FiHelpCircle/> ELVO CRM · Prévia UI</span></div></>;
  return <div className="min-h-screen bg-cloud md:flex">
    {open && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-midnight/70 md:hidden" onClick={()=>setOpen(false)}/>}
    <aside className={`elvo-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col px-4 py-7 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${open?'translate-x-0':'-translate-x-full'}`}>
      <button className="absolute right-4 top-5 text-white md:hidden" aria-label="Fechar menu" onClick={()=>setOpen(false)}><FiX size={23}/></button>{nav}
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-[76px] items-center gap-4 border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-9">
        <button aria-label="Abrir menu" className="text-midnight md:hidden" onClick={()=>setOpen(true)}><FiMenu size={23}/></button>
        <div className="hidden max-w-md flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-cloud px-4 py-2.5 text-sm text-slate-400 sm:flex"><FiSearch/><span>Pesquise clientes, negócios e tarefas...</span><kbd className="ml-auto rounded border border-slate-200 px-1.5 text-[10px]">Em breve</kbd></div>
        <div className="ml-auto flex items-center gap-4"><FiBell className="text-slate-500" aria-label="Notificações indisponíveis"/><span className="hidden text-sm font-semibold text-midnight sm:flex sm:items-center sm:gap-2">ANOAR <FiChevronDown size={14}/></span><span className="grid size-9 place-items-center rounded-full bg-midnight text-sm font-bold text-mint">A</span></div>
      </header>
      <main className="mx-auto w-full max-w-[1500px] px-5 py-9 md:px-9">{children}<p className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-400">Ambiente demonstrativo · Dados de exemplo · Sem conexão com a API</p></main>
    </div>
  </div>;
}
