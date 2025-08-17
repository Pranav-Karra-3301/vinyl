import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://vinyl.pranavkarra.me'),
  title: 'Vinyl',
  description: 'A beautiful vinyl record player for Spotify',
  icons: {
    icon: '/record.svg',
  },
  openGraph: {
    title: 'Vinyl - Spotify Record Player',
    description: 'A beautiful vinyl record player for Spotify',
    url: 'https://vinyl.pranavkarra.me',
    siteName: 'Vinyl',
    images: [
      {
        url: '/Vinyl Record Design Aug 14 2025.png',
        width: 1200,
        height: 630,
        alt: 'Vinyl Record Player',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vinyl - Spotify Record Player',
    description: 'A beautiful vinyl record player for Spotify',
    images: ['/Vinyl Record Design Aug 14 2025.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="theme-white">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
body {
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: pan-x pan-y;
  overflow: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
body::-webkit-scrollbar {
  display: none;
}
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
*::-webkit-scrollbar {
  display: none;
}
        `}</style>
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
