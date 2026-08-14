import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Sidebar } from '@/components/navigation/Sidebar'
import { BottomNav } from '@/components/navigation/BottomNav'
import { Header } from '@/components/navigation/Header'

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
          <div className="flex min-h-screen">
            {/* Desktop Navigation */}
            <Sidebar />

            {/* Main App Content Area */}
            <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
              {/* Mobile Header */}
              <Header />

              {/* Page Content */}
              <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 md:py-6 pb-24 md:pb-8">
                {children}
              </main>
            </div>
          </div>

          {/* Mobile Navigation Bar */}
          <BottomNav />
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
