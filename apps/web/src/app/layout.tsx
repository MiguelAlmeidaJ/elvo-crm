import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import { CrmShell } from '@/components/crm-shell';
import '../styles/globals.scss';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' });
export const metadata: Metadata = { title: 'ELVO CRM — Conexões que impulsionam negócios', description: 'Conexões que impulsionam negócios.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={inter.variable+' '+sora.variable}><CrmShell>{children}</CrmShell></body></html>;
}
