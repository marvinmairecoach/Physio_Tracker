"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Dumbbell, ArrowRight, Activity, ClipboardCheck, Calendar, FileText, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PhysioDataDashboardPage() {
  const [unreadCount, setUnreadCount] = useState<number | null>(null)

  useEffect(() => {
    fetch("/physio-data/api/messaging/unread")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.unreadCount !== undefined) setUnreadCount(data.unreadCount)
      })
      .catch(() => {})
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
      {unreadCount !== null && unreadCount > 0 && (
        <Link
          href="/physio-data/messages"
          className="block rounded-xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">
                {unreadCount} nouveau(x) message{unreadCount > 1 ? "s" : ""}
              </p>
              <p className="text-sm text-amber-600">
                Consultez votre messagerie
              </p>
            </div>
          </div>
        </Link>
      )}

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
              Gérez les types de tests physiques et les catégories.
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
              Créez et gérez les modèles de bilans personnalisés.
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
              Votre planning personnel — entraînements, indisponibilités.
              <span className="flex items-center gap-1 mt-2 text-blue-600 font-medium text-xs">
                Accéder <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/physio-data/messages">
          <Card className="border-blue-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                Messages
                {unreadCount !== null && unreadCount > 0 && (
                  <span className="ml-auto inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {unreadCount}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Messagerie interne avec vos athlètes.
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