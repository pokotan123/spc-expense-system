import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SPC経費精算システム',
  description: 'SPC通商 経費精算管理システム',
}

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  return (
    <html lang="ja" className={notoSansJP.variable}>
      <body className="min-h-screen font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
          メインコンテンツへスキップ
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
