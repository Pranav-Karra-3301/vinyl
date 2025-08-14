import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vinyl',
  description: 'A beautiful vinyl record player for Spotify',
  icons: {
    icon: '/record.svg',
  },
  openGraph: {
    title: 'Vinyl - Spotify Record Player',
    description: 'A beautiful vinyl record player for Spotify',
    url: 'https://music.pranavkarra.me',
    siteName: 'Vinyl',
    images: [
      {
        url: '/placeholder_album.png',
        width: 800,
        height: 800,
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
    images: ['/placeholder_album.png'],
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
