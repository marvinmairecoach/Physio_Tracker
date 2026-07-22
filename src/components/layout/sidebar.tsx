"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSession } from "@/components/layout/providers"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  Trophy,
  ClipboardCheck,
  Calendar,
  Bell,
  BarChart3,
  Menu,
  X,
  Shield,
  Activity,
  Dumbbell,
  GripHorizontal,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  roles: ("admin" | "coach" | "athlete")[]
}

interface NavSection {
  label?: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    items: [
      { href: "/", label: "Tableau de bord", icon: LayoutDashboard, roles: ["admin", "coach", "athlete"] },
      { href: "/alerts", label: "Alertes", icon: Bell, roles: ["admin", "coach"] },
    ],
  },
  {
    items: [
      { href: "/athletes", label: "Athlètes", icon: Users, roles: ["admin", "coach"] },
      { href: "/teams", label: "Équipes", icon: Trophy, roles: ["admin", "coach", "athlete"] },
      { href: "/infirmerie", label: "Infirmerie", icon: Activity, roles: ["admin", "coach"] },
    ],
  },
  {
    items: [
      { href: "/tests", label: "Tests & Évaluations", icon: ClipboardCheck, roles: ["admin", "coach"] },
      { href: "/tests/types", label: "Types de données", icon: BarChart3, roles: ["admin", "coach"] },
      { href: "/tests/field", label: "Jour de test", icon: ClipboardCheck, roles: ["admin", "coach"] },
    ],
  },
  {
    items: [
      { href: "/sessions", label: "Planning", icon: Calendar, roles: ["admin", "coach", "athlete"] },
      { href: "/exercises", label: "Exercices", icon: Dumbbell, roles: ["admin", "coach"] },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-sidebar transition-transform duration-200 md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center border-b border-sidebar-accent px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Trophy className="h-4 w-4" />
            </div>
            <span>PP Tracker</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {sections.map((section, idx) => {
            const visibleItems = section.items.filter((item) =>
              item.roles.includes(user?.role ?? "coach")
            )
            if (visibleItems.length === 0) return null

            return (
              <div key={idx}>
                {idx > 0 && <hr className="my-3 border-sidebar-accent/60" />}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                          active
                            ? "bg-primary/15 text-primary font-semibold shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Admin badge */}
        {user?.role === "admin" && (
          <div className="px-4 pb-2">
            <Link
              href="/admin/users"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/60 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
              onClick={() => setIsOpen(false)}
            >
              <Shield className="h-4 w-4" />
              Administration
            </Link>
          </div>
        )}

        {/* Role badge */}
        <div className="border-t border-sidebar-accent p-4">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50">
            <span className="capitalize">
              {user?.role === "admin" ? "Administrateur" : user?.role === "coach" ? "Coach" : "Athlète"}
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
