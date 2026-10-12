import { FiArrowUpRight, FiBarChart2, FiBriefcase, FiCheckSquare, FiChevronDown, FiFileText, FiGrid, FiHelpCircle, FiMenu, FiPlus, FiSearch, FiSettings, FiUsers } from 'react-icons/fi';
import { BrandLogo } from '@/components/brand-logo';

const navigation = [
  { label: 'Dashboard', Icon: FiGrid, active: true },
  { label: 'Clientes', Icon: FiUsers },
  { label: 'Oportunidades', Icon: FiBriefcase },
  { label: 'Tarefas', Icon: FiCheckSquare },
  { label: 'Propostas', Icon: FiFileText },
  { label: 'Relatórios', Icon: FiBarChart2 },
  { label: 'Configurações', Icon: FiSettings },
];
const metrics = [
  { label: 'Clientes ativos', value: '128', change: '+12,4%', positive: true },
  { label: 'Oportunidades', value: '36', change: '+8,2%', positive: true },
  { label: 'Receita em negociação', value: 'R$ 284.500', change: '+18,6%', positive: true },
  { label: 'Tarefas pendentes', value: '12', change: '−14,3%', positive: false },
];
export default function HomePage() {
  return (
    <div className="min-h-screen bg-cloud md:flex">
      <aside className="elvo-sidebar hidden w-60 shrink-0 flex-col px-4 py-7 md:flex">
        <div className="px-2 pb-11"><BrandLogo variant="dark" width={174} height={58} priority /></div>
        <nav aria-label="Menu principal" className="space-y-1">
          {navigation.map(({ label, Icon, active }) => (
            <div key={label} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${active ? 'bg-mint font-semibold text-midnight' : 'text-slate-300'}`}>
              <Icon aria-hidden size={17} />{label}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-white/10 px-3 pt-6 text-sm text-slate-300"><FiHelpCircle /> Central de ajuda</div>
      </aside>
      <main className="min-w-0 flex-1 px-5 pb-14 pt-5 md:px-9">
        <div className="mb-10 flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3 md:hidden"><FiMenu aria-hidden /><BrandLogo variant="light" width={125} height={42} priority /></div>
          <div className="hidden max-w-sm flex-1 items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm text-slate-400 md:flex"><FiSearch /> Buscar...</div>
          <div className="ml-auto flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:block">ANOAR <FiChevronDown className="inline" /></span><div className="grid size-9 place-items-center rounded-full bg-midnight text-sm font-semibold text-white">A</div></div>
        </div>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-1 text-sm text-slate-500">Visão geral</p><h1 className="text-3xl font-bold">Dashboard</h1><p className="mt-2 text-sm text-slate-500">Seu negócio em movimento, com mais clareza.</p></div>
          <button className="elvo-button-primary" type="button" disabled title="Disponível após implementação das oportunidades"><FiPlus /> Novo <FiArrowUpRight /></button>
        </div>
        <section aria-label="Indicadores de exemplo" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(metric=>(<article key={metric.label} className="elvo-card p-5"><p className="text-sm text-slate-500">{metric.label}</p><p className="mt-3 font-sora text-2xl font-bold">{metric.value}</p><p className={`mt-3 text-sm font-semibold ${metric.positive?'text-success':'text-rose-600'}`}>{metric.change} <span className="font-normal text-slate-400">· exemplo</span></p></article>))}
        </section>
        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <article className="elvo-card p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">Desempenho comercial</h2><span className="text-xs text-slate-500">Dados demonstrativos</span></div><div className="mt-8 grid h-64 place-items-center rounded-xl border border-dashed border-slate-200 bg-cloud/50 text-center text-sm text-slate-500">O gráfico será conectado aos dados reais do CRM.</div></article>
          <article className="elvo-card p-6"><h2 className="text-base font-semibold">Oportunidades por etapa</h2><div className="mt-8 grid h-64 place-items-center rounded-xl border border-dashed border-slate-200 bg-cloud/50 text-center text-sm text-slate-500">O funil comercial aparecerá aqui.</div></article>
        </section>
        <p className="mt-6 text-xs text-slate-400">Prévia visual do design system ELVO CRM. Indicadores fictícios; funcionalidades ainda não conectadas à API.</p>
      </main>
    </div>
  );
}
