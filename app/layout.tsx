import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SINTA Crypto Detector',
  description:
    'Screening Indodax coins for swing trading (Strong Buy, Buy, Preparing to Buy, Likely to Pump)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
