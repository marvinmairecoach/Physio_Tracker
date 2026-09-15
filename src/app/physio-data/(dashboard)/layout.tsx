"use client"

import type { ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileText,
  Calendar,
  User,
  Dumbbell,
  Menu,
  X,
  BarChart3,
  MessageSquare,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AuthGuard } from "@/components/layout/auth-guard"

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const navItems: NavItem[] = [
  { href: "/physio-data", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/physio-data/athletes", label: "Athlètes", icon: Users },
  { href: "/physio-data/tests", label: "Tests", icon: ClipboardCheck },
  { href: "/physio-data/bilans", label: "Bilans", icon: FileText },
  { href: "/physio-data/planning", label: "Agenda", icon: Calendar },
  { href: "/physio-data/messages", label: "Messages", icon: MessageSquare },
  { href: "/physio-data/profile", label: "Profil", icon: User },
]

export default function PhysioDataDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/physio-data") return pathname === "/physio-data"
    return pathname.startsWith(href)
  }
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch("/physio-data/api/auth/logout", { method: "POST" })
    } finally {
      router.push("/")
    }
  }

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-blue-50/30">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col border-r border-blue-100 bg-white">
          {/* Logo */}
          <div className="flex h-14 items-center border-b border-blue-100 px-6">
            <Link
              href="/physio-data"
              className="flex items-center gap-2 font-semibold text-gray-900"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <Dumbbell className="h-4 w-4" />
              </div>
              <span>PhysioData</span>
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
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-500 hover:bg-blue-50/50 hover:text-gray-900"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-blue-600" : "text-gray-400"
                    )}
                  />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-blue-100 p-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-blue-600 transition-colors"
            >
              ← Retour à l&apos;accueil
            </Link>
          </div>
        </aside>

        {/* Mobile sidebar toggle */}
        <MobileSidebar navItems={navItems} isActive={isActive} />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar with logout */}
          <div className="flex h-12 items-center justify-end border-b border-blue-100 bg-white px-4 md:px-6">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
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
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch("/physio-data/api/auth/logout", { method: "POST" })
    } finally {
      router.push("/")
    }
  }

  return (
    <>
      <label
        htmlFor="mobile-sidebar-drawer"
        className="fixed top-3 left-3 z-50 md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </label>
      <input
        id="mobile-sidebar-drawer"
        type="checkbox"
        className="peer hidden"
      />
      {/* Overlay */}
      <label
        htmlFor="mobile-sidebar-drawer"
        className="fixed inset-0 z-30 bg-black/50 md:hidden hidden peer-checked:block cursor-pointer"
      />
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-blue-100 transition-transform duration-200 -translate-x-full peer-checked:translate-x-0 md:hidden flex flex-col">
        <div className="flex h-14 items-center justify-between border-b border-blue-100 px-6">
          <Link
            href="/physio-data"
            className="flex items-center gap-2 font-semibold text-gray-900"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Dumbbell className="h-4 w-4" />
            </div>
            <span>PhysioData</span>
          </Link>
          <label
            htmlFor="mobile-sidebar-drawer"
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
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-500 hover:bg-blue-50/50 hover:text-gray-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-blue-600" : "text-gray-400"
                  )}
                />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-blue-100 p-4 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-blue-600 transition-colors"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </>
  )
}