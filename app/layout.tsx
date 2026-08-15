import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ClientLayoutShell } from '@/components/navigation/ClientLayoutShell'
import { AuthProvider } from '@/components/providers/AuthProvider'

export const metadata: Metadata = {
  title: 'RUQENA — Sosyal Fitness & Workout Challenge',
  description: 'Arkadaşlarınla antrenman kaydet, meydan okumalar yap ve serini koru!',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RUQENA',
  },
}

export const viewport: Viewport = {
  themeColor: '#090d16',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-[#090d16] text-slate-100 min-h-screen antialiased selection:bg-emerald-500 selection:text-slate-950">
        <AuthProvider>
          <ClientLayoutShell>{children}</ClientLayoutShell>
        </AuthProvider>

        {/* Register PWA Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('RUQENA SW registered with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('RUQENA SW registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
