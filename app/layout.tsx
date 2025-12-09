import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SINTA Crypto Detector',
  description:
    'Screening koin Indodax untuk swing trading (Strong Buy, Buy, Siap-siap Buy, Mau Pump)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
