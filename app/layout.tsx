import type {Metadata} from 'next';
import './globals.css';
import { FirebaseProvider } from '@/components/FirebaseProvider';

export const metadata: Metadata = {
  title: 'DívidaZero - Gestor de Parcelas',
  description: 'Gerencie suas dívidas e parcelas de forma eficiente.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="bg-[#f5f5f5] text-[#1a1a1a] min-h-screen">
        <FirebaseProvider>
          {children}
        </FirebaseProvider>
      </body>
    </html>
  );
}
