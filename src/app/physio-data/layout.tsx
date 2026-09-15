import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "PhysioData",
}

export default function PhysioDataLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}