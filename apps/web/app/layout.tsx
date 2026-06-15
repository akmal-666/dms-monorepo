import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'DMS — Dashboard Management System', template: '%s | DMS' },
  description: 'Centralized platform for monitoring Project Initiatives, Requirements, Mandays Utilization, and Delivery Timeline.',
  keywords: ['dashboard', 'project management', 'requirement tracking', 'mandays', 'KPI'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
