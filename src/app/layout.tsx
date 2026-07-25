import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "@mantine/core/styles.css"
import "@mantine/dates/styles.css"
import "@mantine/notifications/styles.css"
import "@mantine/charts/styles.css"
import { Providers } from "@/components/layout/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Physio Tracker",
  description: "Application de gestion de préparation physique multisport",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}