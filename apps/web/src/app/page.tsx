import { FiArrowUpRight, FiLayers, FiShield, FiUsers } from 'react-icons/fi';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-midnight px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-20 flex items-center justify-between border-b border-white/10 pb-6">
          <span className="text-2xl font-extrabold tracking-tight">ELVO<span className="text-mint"> CRM</span></span>
          <span className="rounded-full border border-mint/30 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-mint">Foundation v0.1</span>
        </header>
        <section className="max-w-3xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.3em] text-mint">ANOAR · Tecnologia para relações que evoluem</p>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight md:text-7xl">O próximo nível do seu relacionamento com clientes.</h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-slate-300">A estrutura do ELVO CRM está pronta para crescer. Uma plataforma moderna, escalável e pensada para as pessoas.</p>
        </section>
        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[{ icon: FiUsers, title: 'Relacionamentos', detail: 'Contatos e empresas no centro de tudo.' },
            { icon: FiLayers, title: 'Oportunidades', detail: 'Funis comerciais preparados para evoluir.' },
            { icon: FiShield, title: 'Organizações', detail: 'Arquitetura preparada para multi-tenancy.' }].map(({ icon: Icon, title, detail }) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-white/5 p-7">
                <Icon className="mb-8 text-mint" size={28} aria-hidden />
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">{detail}</p>
              </article>
            ))}
        </div>
        <footer className="mt-16 flex items-center gap-2 text-sm text-slate-400">Feito pela ANOAR <FiArrowUpRight aria-hidden /></footer>
      </div>
    </main>
  );
}
