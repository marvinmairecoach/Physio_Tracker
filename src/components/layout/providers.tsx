"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { MantineProvider } from "@mantine/core"
import { Notifications } from "@mantine/notifications"

interface AuthUser {
  id: string
  email: string
  phone: string | null
  role: "admin" | "coach" | "athlete"
  firstName: string
  lastName: string
  avatarUrl: string | null
  logoUrl: string | null
  roleAssignments?: Array<{
    role: { id: string; name: string }
  }>
}

interface SessionContextType {
  user: AuthUser | null
  loading: boolean
  refresh: () => Promise<void>
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
})

export function useSession() {
  return useContext(SessionContext)
}

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const fetchUser = useCallback(async () => {
    try {
      // Determine the auth endpoint based on the current pathname
      let endpoint = "/api/auth/me"
      if (pathname.startsWith("/physio-data")) {
        endpoint = "/physio-data/api/auth/me"
      } else if (pathname.startsWith("/club")) {
        endpoint = "/club/api/auth/me"
      }
      const res = await fetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [pathname])

  useEffect(() => {
    setLoading(true)
    fetchUser()
  }, [fetchUser, pathname])

  return (
    <MantineProvider>
      <Notifications />
      <SessionContext.Provider value={{ user, loading, refresh: fetchUser }}>
        {children}
      </SessionContext.Provider>
    </MantineProvider>
  )
}