import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { Providers } from '@/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MessageSender - Facebook Page Messaging Platform',
  description: 'Professional Facebook Page messaging platform with bulk messaging, contact management, and campaign automation.',
  keywords: ['Facebook', 'Messenger', 'Marketing', 'Automation', 'CRM'],
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
