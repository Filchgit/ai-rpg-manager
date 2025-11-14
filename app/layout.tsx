import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI RPG Manager',
  description: 'Your AI-powered Dungeon Master for epic tabletop adventures',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
