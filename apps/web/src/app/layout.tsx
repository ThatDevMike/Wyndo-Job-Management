import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wyndo - Job Management',
  description: 'Professional job management for trades and services',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
