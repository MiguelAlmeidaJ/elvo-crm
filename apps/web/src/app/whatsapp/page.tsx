'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { FiCheckCircle, FiRefreshCw, FiSend, FiSmartphone } from 'react-icons/fi';

type Status = { configured: boolean; instanceName?: string; state?: string; payload?: unknown };

async function readError(response: Response) {
  const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
  return Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message ?? 'Não foi possível concluir a operação';
}

function connectionState(value: unknown): string {
  if (!value || typeof value !== 'object') return 'desconhecido';
  const object = value as Record<string, unknown>;
  if (typeof object.state === 'string') return object.state;
  if (object.instance && typeof object.instance === 'object') return connectionState(object.instance);
  return 'desconhecido';
}

function qrImage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const object = value as Record<string, unknown>;
  for (const key of ['base64', 'qrcode', 'qr']) {
    const candidate = object[key];
    if (typeof candidate === 'string' && candidate.length > 100) return candidate.startsWith('data:') ? candidate : `data:image/png;base64,${candidate}`;
    const nested = qrImage(candidate);
    if (nested) return nested;
  }
  return null;
}

export default function WhatsappPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [instanceName, setInstanceName] = useState('');
  const [number, setNumber] = useState('');
  const [message, setMessage] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadStatus = useCallback(async () => {
    const response = await fetch('/api/v1/whatsapp/status', { cache: 'no-store' });
    if (!response.ok) throw new Error(await readError(response));
    setStatus(await response.json() as Status);
  }, []);
  useEffect(() => { loadStatus().catch((cause) => setError(cause instanceof Error ? cause.message : 'Falha ao consultar WhatsApp')); }, [loadStatus]);

  async function createInstance(event: FormEvent) {
    event.preventDefault(); setBusy('instance'); setError(''); setNotice('');
    try {
      const response = await fetch('/api/v1/whatsapp/instance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instanceName }) });
      if (!response.ok) throw new Error(await readError(response));
      setNotice('Instância criada. Leia o QR Code para conectar o aparelho.'); await loadStatus(); await loadQr();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao criar instância'); } finally { setBusy(''); }
  }

  async function loadQr() {
    setBusy('qr'); setError('');
    try {
      const response = await fetch('/api/v1/whatsapp/qrcode', { cache: 'no-store' });
      if (!response.ok) throw new Error(await readError(response));
      const payload = await response.json() as unknown;
      const image = qrImage(payload);
      if (!image) throw new Error('O WPPConnect não retornou um QR Code. Verifique se a sessão já está conectada.');
      setQrCode(image);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao carregar QR Code'); } finally { setBusy(''); }
  }

  async function sendText(event: FormEvent) {
    event.preventDefault(); setBusy('send'); setError(''); setNotice('');
    try {
      const response = await fetch('/api/v1/whatsapp/send-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: number.replace(/\D/g, ''), text: message }) });
      if (!response.ok) throw new Error(await readError(response));
      setMessage(''); setNotice('Mensagem enviada para o WPPConnect.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao enviar mensagem'); } finally { setBusy(''); }
  }

  const state = status?.payload ? connectionState(status.payload) : status?.state ?? 'carregando';
  return <main className="px-5 py-9 md:px-9"><div className="mx-auto max-w-6xl">
    <span className="eyebrow">Comunicação</span><h1 className="mt-3 text-3xl font-semibold md:text-4xl">WhatsApp integrado ao CRM.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Integração gratuita e auto-hospedada com WPPConnect. Cada empresa possui sua própria sessão isolada.</p>
    {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}
    {notice ? <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><FiCheckCircle className="mr-2 inline"/>{notice}</p> : null}
    <div className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <section className="elvo-card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-success">Conexão</p><h2 className="mt-2 text-lg font-semibold">{status?.instanceName ?? 'Nenhuma instância'}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{state}</span></div>
        {!status?.configured ? <form onSubmit={createInstance} className="mt-6 space-y-4"><label className="block text-xs font-semibold">Nome da instância<input required minLength={3} pattern="[a-z0-9-]+" value={instanceName} onChange={(event) => setInstanceName(event.target.value.toLowerCase())} placeholder="empresa-whatsapp" className="mt-2 w-full rounded-xl border p-3"/></label><button disabled={Boolean(busy)} className="elvo-button-primary w-full"><FiSmartphone/>Criar instância</button></form> : <div className="mt-6"><button type="button" onClick={loadQr} disabled={Boolean(busy)} className="elvo-button-primary w-full"><FiRefreshCw/>Gerar ou atualizar QR Code</button>{qrCode ? <div className="mt-5 rounded-2xl border bg-white p-4 text-center"><Image unoptimized src={qrCode} width={256} height={256} alt="QR Code para conectar o WhatsApp" className="mx-auto size-64 max-w-full"/><p className="mt-3 text-xs text-slate-500">Abra WhatsApp → Aparelhos conectados → Conectar aparelho.</p></div> : null}</div>}
      </section>
      <form onSubmit={sendText} className="elvo-card h-fit space-y-5 p-6"><div><p className="text-xs font-bold uppercase tracking-wider text-success">Teste de envio</p><h2 className="mt-2 text-lg font-semibold">Enviar mensagem</h2></div><label className="block text-xs font-semibold">Número com DDI e DDD<input required inputMode="numeric" pattern="[0-9 ()+\-]{10,20}" value={number} onChange={(event) => setNumber(event.target.value)} placeholder="55 32 99999-9999" className="mt-2 w-full rounded-xl border p-3"/></label><label className="block text-xs font-semibold">Mensagem<textarea required maxLength={4096} rows={7} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Olá! Tudo bem?" className="mt-2 w-full resize-y rounded-xl border p-3"/></label><button disabled={!status?.configured || Boolean(busy)} className="elvo-button-primary w-full"><FiSend/>{busy === 'send' ? 'Enviando...' : 'Enviar mensagem'}</button></form>
    </div>
  </div></main>;
}
