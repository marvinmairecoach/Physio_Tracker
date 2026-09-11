"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Trophy,
  Users,
  CalendarDays,
  ClipboardCheck,
  Activity,
  Calendar,
  Bell,
  Shield,
  Users as UsersIcon,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AuthGuard } from "@/components/layout/auth-guard"

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const navItems: NavItem[] = [
  { href: "/club", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/club/equipes", label: "Équipes", icon: Trophy },
  { href: "/club/athletes", label: "Athlètes", icon: Users },
  { href: "/club/seances", label: "Séances", icon: CalendarDays },
  { href: "/club/tests", label: "Tests", icon: ClipboardCheck },
  { href: "/club/infirmerie", label: "Infirmerie", icon: Activity },
  { href: "/club/planning", label: "Planning", icon: Calendar },
  { href: "/club/alertes", label: "Alertes", icon: Bell },
  { href: "/club/administration", label: "Administration", icon: Shield },
]

export default function ClubDataDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/club") return pathname === "/club"
    return pathname.startsWith(href)
  }

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-amber-50/30">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col border-r border-amber-100 bg-white">
          {/* Logo */}
          <div className="flex h-14 items-center border-b border-amber-100 px-6">
            <Link
              href="/club"
              className="flex items-center gap-2 font-semibold text-gray-900"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white shadow-sm">
                <UsersIcon className="h-4 w-4" />
              </div>
              <span>ClubData</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-amber-50 text-amber-700 font-semibold"
                      : "text-gray-500 hover:bg-amber-50/50 hover:text-gray-900"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-amber-600" : "text-gray-400"
                    )}
                  />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-amber-100 p-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-amber-600 transition-colors"
            >
              ← Retour à l&apos;accueil
            </Link>
          </div>
        </aside>

        {/* Mobile sidebar */}
        <MobileSidebar navItems={navItems} isActive={isActive} />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}

function MobileSidebar({
  navItems,
  isActive,
}: {
  navItems: NavItem[]
  isActive: (href: string) => boolean
}) {
  return (
    <>
      <label
        htmlFor="club-mobile-sidebar-drawer"
        className="fixed top-3 left-3 z-50 md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </label>
      <input
        id="club-mobile-sidebar-drawer"
        type="checkbox"
        className="peer hidden"
      />
      {/* Overlay */}
      <label
        htmlFor="club-mobile-sidebar-drawer"
        className="fixed inset-0 z-30 bg-black/50 md:hidden hidden peer-checked:block cursor-pointer"
      />
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-amber-100 transition-transform duration-200 -translate-x-full peer-checked:translate-x-0 md:hidden flex flex-col">
        <div className="flex h-14 items-center justify-between border-b border-amber-100 px-6">
          <Link
            href="/club"
            className="flex items-center gap-2 font-semibold text-gray-900"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white shadow-sm">
              <UsersIcon className="h-4 w-4" />
            </div>
            <span>ClubData</span>
          </Link>
          <label
            htmlFor="club-mobile-sidebar-drawer"
            className="cursor-pointer text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </label>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-amber-50 text-amber-700 font-semibold"
                    : "text-gray-500 hover:bg-amber-50/50 hover:text-gray-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-amber-600" : "text-gray-400"
                  )}
                />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}