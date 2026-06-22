import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '900'],
  variable: '--font-outfit',
});

export const metadata = {
  title: 'Amar Hishab - Daily Ledger',
  description: 'Ultra-reliable ledger designed for visual tracking and peace of mind.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#18181b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 min-h-screen flex flex-col antialiased">
        <main className="flex-1 w-full max-w-md mx-auto bg-white dark:bg-zinc-900 min-h-screen shadow-xl relative pb-24 border-x border-zinc-100 dark:border-zinc-800">
          {children}
        </main>
      </body>
    </html>
  );
}
