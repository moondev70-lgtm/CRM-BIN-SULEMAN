import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bin Suleman CRM',
  description: 'Internal CRM for Bin Suleman Real Estate & Builders — leads, agents and follow-ups.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
