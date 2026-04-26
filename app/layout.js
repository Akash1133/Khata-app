import './globals.css';
import BottomNav from './components/BottomNav';

export const metadata = {
  title: 'Khata - Smart Business Ledger',
  description: 'Manage your business khata, inventory, and profits with ease. Track sales, purchases, and party ledgers.',
  manifest: '/manifest.json',
  themeColor: '#0D0D1A',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <main>{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
