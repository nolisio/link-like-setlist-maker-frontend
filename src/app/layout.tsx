import type { Metadata } from 'next'
import 'tailwindcss/index.css'

export const metadata: Metadata = {
  title: 'ラブライブ！セットリスト予想メーカー',
  description: '未来イベントのセットリストを手動で予想して共有するツールです。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className="m-0 bg-white text-base leading-normal tracking-normal text-zinc-700 antialiased [color-scheme:light] [font-synthesis:none] [text-rendering:optimizeLegibility]">
        <div className="mx-auto box-border flex min-h-svh w-full max-w-full flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
