"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/layout/providers"
import { Bell, User, Key, Shield, LogOut, Settings } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function Navbar() {
  const { user } = useSession()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`
    : "PP"

  const isAdmin = user?.role === "admin"

  return (
    <header className="flex h-14 items-center justify-end gap-4 border-b bg-card px-6">
      <Link href="/alerts" className="relative">
        <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
      </Link>

      {/* User dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
        >
          <span className="text-sm font-medium hidden sm:block">
            {user?.firstName} {user?.lastName}
          </span>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border bg-card shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-1">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-semibold text-primary">
                {user?.role === "admin" ? "Admin" : user?.role === "coach" ? "Coach" : "Athlète"}
              </span>
            </div>

            <Link
              href="/profile"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Mon profil
            </Link>

            <Link
              href="/profile/password"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Key className="h-4 w-4 text-muted-foreground" />
              Mot de passe
            </Link>

            {isAdmin && (
              <Link
                href="/admin/users"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Shield className="h-4 w-4 text-muted-foreground" />
                Gestion utilisateurs
              </Link>
            )}

            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  router.push("/api/auth/logout")
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}