import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "PhysioData",
}

export default function PhysioDataLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  )
}