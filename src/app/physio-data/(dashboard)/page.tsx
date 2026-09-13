import Link from "next/link"
import { useEffect, useState } from "react"
import { Dumbbell, ArrowRight, Activity, ClipboardCheck, Calendar, FileText, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const API_PREFIX = "/physio-data/api"

export default function PhysioDataDashboardPage() {
  const [unreadCount, setUnreadCount] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${API_PREFIX}/messaging/unread`)
      .then((r) => r.json())
      .then((data) => {
        const count = data.unread ?? data.count ?? data.unreadCount ?? null
        setUnreadCount(count !== null ? Number(count) : null)
      })
      .catch(() => setUnreadCount(null))
  }, [])

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">PhysioData</h1>
            <p className="text-blue-100 text-sm">
              Suivi physique d&apos;athlètes individuels
            </p>
          </div>
        </div>
        <p className="text-blue-50 max-w-xl">
          Bienvenue sur votre espace de suivi. Gérez les bilans, les tests physiques,
          la programmation et l&apos;évolution de vos athlètes.
        </p>
      </div>

      {/* Messages alert */}
      <Link href="/physio-data/messages">
        <Card
          className={`border transition-all cursor-pointer h-full ${
            unreadCount && unreadCount > 0
              ? "border-amber-200 bg-amber-50 hover:border-amber-300 hover:shadow-md"
              : "border-blue-100 hover:border-blue-300 hover:shadow-md"
          }`}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare
                className={`h-4 w-4 ${unreadCount && unreadCount > 0 ? "text-amber-600" : "text-blue-600"}`}
              />
              Messages
            </CardTitle>
            {unreadCount !== null && unreadCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-[11px] font-bold min-w-[22px] h-5 px-1.5">
                {unreadCount}
              </span>
            )}
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {unreadCount !== null && unreadCount > 0
              ? `Vous avez ${unreadCount} message${unreadCount > 1 ? "s" : ""} non lu${unreadCount > 1 ? "s" : ""}.`
              : "Consultez et échangez avec vos contacts."}
            <span className="flex items-center gap-1 mt-2 font-medium text-xs text-blue-600">
              Accéder aux messages <ArrowRight className="h-3 w-3" />
            </span>
          </CardContent>
        </Card>
      </Link>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/physio-data/athletes">
          <Card className="border-blue-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-blue-600" />
                Athlètes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Consultez et gérez vos athlètes, leurs profils et leur historique.
              <span className="flex items-center gap-1 mt-2 text-blue-600 font-medium text-xs">
                Accéder <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/physio-data/tests">
          <Card className="border-blue-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4 text-blue-600" />
                Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Réalisez et suivez les tests physiques, visualisez les résultats.
              <span className="flex items-center gap-1 mt-2 text-blue-600 font-medium text-xs">
                Accéder <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/physio-data/bilans">
          <Card className="border-blue-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-blue-600" />
                Bilans
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Générez et consultez les bilans PDF de vos athlètes.
              <span className="flex items-center gap-1 mt-2 text-blue-600 font-medium text-xs">
                Accéder <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/physio-data/planning">
          <Card className="border-blue-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-blue-600" />
                Planning
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Planifiez les séances et rendez-vous avec vos athlètes.
              <span className="flex items-center gap-1 mt-2 text-blue-600 font-medium text-xs">
                Accéder <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}