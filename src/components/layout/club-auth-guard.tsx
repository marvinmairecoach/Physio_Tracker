"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AuthUser {
  id: string
  email: string
  role: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  logoUrl: string | null
}

export function ClubAuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | "loading">("loading")
  const router = useRouter()

  useEffect(() => {
    fetch("/club/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error("Non authentifié")
      })
      .then((data) => setUser(data.user))
      .catch(() => {
        router.push("/club/login")
      })
  }, [router])

  if (user === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}