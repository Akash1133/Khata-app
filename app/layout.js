import './globals.css';
import BottomNav from './components/BottomNav';
import Script from 'next/script';

export const metadata = {
  title: 'Profitly - Smart Business Ledger',
  description: 'Manage your business ledger, inventory, and profits with ease. Track sales, purchases, and party ledgers.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#F5F7FB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('khata_pref_theme') || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              })();
            `,
          }}
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <main>{children}</main>
        <BottomNav />
        <div id="google_translate_element" style={{ display: 'none' }} />
        <Script id="google-translate-init" strategy="afterInteractive">
          {`
            window.googleTranslateElementInit = function () {
              try {
                new google.translate.TranslateElement(
                  {
                    pageLanguage: 'en',
                    autoDisplay: false
                  },
                  'google_translate_element'
                );
              } catch (e) {}
            };
          `}
        </Script>
        <Script
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
