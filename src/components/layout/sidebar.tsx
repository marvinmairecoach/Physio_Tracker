"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSession } from "@/components/layout/providers"
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
  Timer,
  Mail,
  LineChart,
  Stethoscope,
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
    label: "INDIVIDUEL",
    items: [
      { href: "/", label: "Tableau de bord", icon: LayoutDashboard, roles: ["admin", "coach", "athlete"] },
      { href: "/alerts", label: "Alertes", icon: Bell, roles: ["admin", "coach"] },
      { href: "/athletes", label: "Athlètes", icon: Users, roles: ["admin", "coach"] },
      { href: "/infirmerie", label: "Infirmerie", icon: Activity, roles: ["admin", "coach"] },
    ],
  },
  {
    label: "TESTS & SUIVI",
    items: [
      { href: "/tests", label: "Tests & Évaluations", icon: ClipboardCheck, roles: ["admin", "coach"] },
      { href: "/tests/field", label: "Jour de test", icon: ClipboardCheck, roles: ["admin", "coach"] },
      { href: "/tests/types", label: "Types de données", icon: BarChart3, roles: ["admin", "coach"] },
      { href: "/planning", label: "Planning", icon: Calendar, roles: ["admin", "coach", "athlete"] },
    ],
  },
  {
    label: "COLLECTIF",
    items: [
      { href: "/teams", label: "Équipes", icon: Trophy, roles: ["admin", "coach", "athlete"] },
      { href: "/sessions", label: "Sessions", icon: Dumbbell, roles: ["admin", "coach", "athlete"] },
      { href: "/exercises", label: "Exercices", icon: Stethoscope, roles: ["admin", "coach"] },
    ],
  },
  {
    label: "CLUB",
    items: [
      { href: "/dirigeants", label: "Dirigeants", icon: Users, roles: ["admin", "coach"] },
      { href: "/dirigeants/email", label: "E-mail dirigeants", icon: Mail, roles: ["admin", "coach"] },
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
      <button
        className="fixed top-3 left-3 z-50 md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

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
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white transition-transform duration-200 md:relative md:translate-x-0 shadow-sm",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center border-b border-gray-100 px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Timer className="h-4 w-4" />
            </div>
            <span>Physio Tracker</span>
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
                {idx > 0 && <hr className="my-3 border-gray-100" />}
                {section.label && (
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    {section.label}
                  </p>
                )}
                <div className="space-y-0.5">
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
                            ? "bg-blue-50 text-blue-700 font-semibold"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", active ? "text-blue-600" : "text-gray-400")} />
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
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
              onClick={() => setIsOpen(false)}
            >
              <Shield className="h-4 w-4" />
              Administration
            </Link>
          </div>
        )}

        {/* Role badge */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 capitalize">
              {user?.role === "admin" ? "Administrateur" : user?.role === "coach" ? "Coach" : "Athlète"}
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}