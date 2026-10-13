import type { ReactNode } from 'react';
export function PageHeading({eyebrow,title,description,action}: {eyebrow:string;title:string;description:string;action?:ReactNode}) {
 return <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-success">{eyebrow}</p><h1 className="text-3xl font-bold text-midnight md:text-4xl">{title}</h1><p className="mt-2 text-sm text-slate-500">{description}</p></div>{action}</div>;
}
export function PreviewButton({label}: {label:string}) {
 return <button type="button" disabled title="Ação disponível após integração com a API" className="elvo-button-primary opacity-60 disabled:cursor-not-allowed">{label} <span aria-hidden>＋</span></button>;
}
