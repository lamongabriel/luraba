import type { Metadata } from "next";

import "./globals.css"

import { Providers } from "@/components/providers"

const DEFAULT_DESCRIPTION = "Manage accounts, budgets, transactions, and categories in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  applicationName: "Luraba",
  title: {
    default: "Luraba",
    template: "%s | Luraba",
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    title: "Luraba",
    description: DEFAULT_DESCRIPTION,
    siteName: "Luraba",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Luraba",
    description: DEFAULT_DESCRIPTION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="antialiased font-sans"
      style={
        {
          "--font-sans":
            '"Avenir Next", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
          "--font-heading":
            '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
          "--font-mono":
            '"SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        } as React.CSSProperties
      }
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
