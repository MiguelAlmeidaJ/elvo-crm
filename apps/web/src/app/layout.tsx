import type { Metadata } from 'next';
import '../styles/globals.scss';

export const metadata: Metadata = { title: 'ELVO CRM', description: 'Seu relacionamento, em evolução.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
