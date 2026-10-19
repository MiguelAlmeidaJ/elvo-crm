'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { FiExternalLink, FiGlobe, FiMail, FiMapPin, FiPhone, FiSearch, FiUserPlus } from 'react-icons/fi';

type Lead = {
  externalId: string; name: string; address?: string; city?: string; state?: string; postalCode?: string;
  phone?: string; email?: string; website?: string; mapsUrl?: string; category?: string; types: string[];
  latitude?: number; longitude?: number; openingHours: string[];
};
type SearchResponse = { items: Lead[]; nextPageToken: string | null; provider: string; attributionUrl?: string };

async function errorMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
  if (Array.isArray(payload?.message)) return payload.message.join(', ');
  return payload?.message ?? fallback;
}

export default function LeadsPage() {
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [data, setData] = useState<SearchResponse>({ items: [], nextPageToken: null, provider: '' });
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Record<string, string>>({});

  async function search(event?: FormEvent<HTMLFormElement>, pageToken?: string) {
    event?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ niche, location, limit: '40' });
      if (pageToken) params.set('pageToken', pageToken);
      const response = await fetch(`/api/v1/leads/search?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await errorMessage(response, 'Não foi possível buscar leads'));
      const result = await response.json() as SearchResponse;
      setData((current) => pageToken ? { ...result, items: [...current.items, ...result.items] } : result);
      setSearched(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível buscar leads');
    } finally {
      setLoading(false);
    }
  }

  async function importLead(lead: Lead) {
    setImporting(lead.externalId);
    setError('');
    try {
      const { externalId, name, address, city, state, postalCode, phone, email, website, mapsUrl, category, types, latitude, longitude } = lead;
      const response = await fetch('/api/v1/leads/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ externalId, name, address, city, state, postalCode, phone, email, website, mapsUrl, category, types, latitude, longitude }) });
      const payload = await response.json().catch(() => null) as { id?: string; contact?: { id?: string }; message?: string } | null;
      if (!response.ok) {
        if (response.status === 409 && payload?.contact?.id) {
          setImported((current) => ({ ...current, [lead.externalId]: payload.contact!.id! }));
          return;
        }
        throw new Error(payload?.message ?? 'Não foi possível importar este lead');
      }
      if (payload?.id) setImported((current) => ({ ...current, [lead.externalId]: payload.id! }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível importar este lead');
    } finally {
      setImporting(null);
    }
  }

  return (
    <main className="px-5 py-9 md:px-9"><div className="mx-auto max-w-7xl">
      <div className="mb-8 max-w-3xl"><span className="eyebrow">Prospecção inteligente</span><h1 className="mt-3 text-3xl font-semibold md:text-4xl">Encontre empresas com o perfil certo.</h1><p className="mt-3 text-sm leading-6 text-slate-500">Pesquise gratuitamente em dados abertos do OpenStreetMap por segmento e região e importe os melhores prospects.</p></div>
      <form onSubmit={(event) => search(event)} className="elvo-card grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto] md:p-6">
        <label className="elvo-field">Nicho ou segmento<span className="elvo-input-wrap"><FiSearch /><input required minLength={2} maxLength={100} value={niche} onChange={(event) => setNiche(event.target.value)} placeholder="Ex.: clínicas odontológicas" /></span></label>
        <label className="elvo-field">Localização<span className="elvo-input-wrap"><FiMapPin /><input required minLength={2} maxLength={150} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Ex.: Campinas, SP" /></span></label>
        <button className="elvo-button-primary mt-auto min-w-36" disabled={loading}>{loading ? 'Buscando...' : 'Buscar leads'}</button>
      </form>
      {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}
      {searched ? <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Resultados</h2><p className="mt-1 text-sm text-slate-500">{data.items.length} empresas encontradas</p></div>{data.provider ? <p className="text-xs text-slate-400">Dados: {data.attributionUrl ? <a className="font-semibold underline" href={data.attributionUrl} target="_blank" rel="noreferrer">{data.provider}</a> : data.provider}</p> : null}</div>
        <div className="grid gap-4 lg:grid-cols-2">{data.items.map((lead) => {
          const contactId = imported[lead.externalId];
          return <article key={lead.externalId} className="elvo-card flex flex-col p-5 md:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-success">{lead.category ?? 'Empresa'}</p><h3 className="mt-2 text-lg font-semibold">{lead.name}</h3></div></div>
            <div className="mt-5 space-y-2.5 text-sm text-slate-600">
              {lead.address ? <p className="flex items-start gap-2"><FiMapPin className="mt-0.5 shrink-0 text-slate-400" />{lead.address}</p> : null}
              {lead.phone ? <a href={`tel:${lead.phone}`} className="flex items-center gap-2 hover:text-success"><FiPhone className="text-slate-400" />{lead.phone}</a> : null}
              {lead.email ? <a href={`mailto:${lead.email}`} className="flex items-center gap-2 hover:text-success"><FiMail className="text-slate-400" />{lead.email}</a> : null}
              {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate hover:text-success"><FiGlobe className="shrink-0 text-slate-400" />{lead.website}</a> : null}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">{contactId ? <Link href={`/clientes/${contactId}`} className="elvo-button-primary">Ver prospect <FiExternalLink /></Link> : <button onClick={() => importLead(lead)} disabled={importing === lead.externalId} className="elvo-button-primary"><FiUserPlus />{importing === lead.externalId ? 'Importando...' : 'Importar prospect'}</button>}{lead.mapsUrl ? <a href={lead.mapsUrl} target="_blank" rel="noreferrer" className="px-2 py-2 text-sm font-semibold text-slate-500 hover:text-midnight">Ver no mapa <FiExternalLink className="inline" /></a> : null}</div>
          </article>;
        })}</div>
        {!data.items.length ? <div className="elvo-card p-10 text-center text-sm text-slate-500">Nenhuma empresa encontrada. Tente ampliar a localização ou usar um nicho mais geral.</div> : null}
        {data.nextPageToken ? <div className="mt-6 text-center"><button className="elvo-button-primary" disabled={loading} onClick={() => search(undefined, data.nextPageToken!)}>{loading ? 'Carregando...' : 'Carregar mais resultados'}</button></div> : null}
      </section> : null}
    </div></main>
  );
}
