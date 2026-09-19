"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Dumbbell,
  ArrowRight,
  Activity,
  ClipboardCheck,
  Calendar,
  FileText,
  MessageSquare,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from "@/components/layout/providers"

interface PlanningEntry {
  id: string
  athleteId: string | null
  teamId: string | null
  date: string
  dateEnd: string | null
  title: string
  type: string
  isObjective: boolean
  notes: string | null
  sessionData: string | null
  origin?: string
  teamName?: string | null
}

interface Conversation {
  id: string
  createdAt: string
  updatedAt: string
  participants: { id: string; firstName: string; lastName: string; role: string }[]
  lastMessage: {
    content: string
    createdAt: string
    senderId: string
    senderName: string
  } | null
  lastReadAt: string
}

const typeColors: Record<string, string> = {
  ENTRAINEMENT: "border-l-green-500 bg-green-50",
  COMPÉTITION: "border-l-red-500 bg-red-50",
  REPOS: "border-l-gray-400 bg-gray-50",
  RdV: "border-l-blue-500 bg-blue-50",
  BILAN: "border-l-purple-500 bg-purple-50",
}

const typeLabels: Record<string, string> = {
  ENTRAINEMENT: "Entraînement",
  COMPÉTITION: "Compétition",
  REPOS: "Repos",
  RdV: "Rendez-vous",
  BILAN: "Bilan",
}

export default function PhysioDataDashboardPage() {
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const [nextSession, setNextSession] = useState<PlanningEntry | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingConversations, setLoadingConversations] = useState(true)

  const { user } = useSession()

  // Fetch unread count
  useEffect(() => {
    fetch("/physio-data/api/messaging/unread")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.unreadCount !== undefined) setUnreadCount(data.unreadCount)
      })
      .catch(() => {})
  }, [])

  // Fetch conversations (recent messages)
  useEffect(() => {
    fetch("/physio-data/api/messaging/conversations")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.conversations) setConversations(data.conversations)
      })
      .catch(() => {})
      .finally(() => setLoadingConversations(false))
  }, [])

  // Fetch next upcoming session
  useEffect(() => {
    if (!user?.id) { setLoadingSession(false); return }
    const fetchNextSession = async () => {
      try {
        const now = new Date()
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

        // Fetch planning entries created by this user for the current month
        const planRes = await fetch(
          `/physio-data/api/planning?createdById=${user.id}&month=${monthKey}`
        )
        if (!planRes.ok) { setLoadingSession(false); return }
        const entries: PlanningEntry[] = await planRes.json()

        // 3. Find next upcoming session (date >= today, sorted ascending)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const upcoming = entries
          .filter((e) => new Date(e.date.slice(0, 10) + "T12:00:00") >= today)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        if (upcoming.length > 0) {
          setNextSession(upcoming[0])
        }
      } catch {
        // ignore
      } finally {
        setLoadingSession(false)
      }
    }
    fetchNextSession()
  }, [user])

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

      {/* Cartes d'aperçu */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Prochaine séance */}
      <Card className="border-blue-100">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-blue-600" />
            Prochaine séance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSession ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          ) : nextSession ? (
            <Link
              href="/physio-data/planning"
              className="block rounded-lg border-l-4 p-3 transition-colors hover:bg-gray-50"
              style={{
                borderLeftColor:
                  nextSession.type === "ENTRAINEMENT"
                    ? "#22c55e"
                    : nextSession.type === "COMPÉTITION"
                      ? "#ef4444"
                      : nextSession.type === "REPOS"
                        ? "#9ca3af"
                        : nextSession.type === "BILAN"
                          ? "#a855f7"
                          : "#3b82f6",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{nextSession.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(nextSession.date.slice(0, 10) + "T12:00:00").toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                    {" · "}
                    {typeLabels[nextSession.type] || nextSession.type}
                  </p>
                  {nextSession.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {nextSession.notes}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Aucune séance prévue pour le moment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Messages récents */}
      <Card className="border-blue-100">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            Messages récents
            {unreadCount !== null && unreadCount > 0 && (
              <span className="ml-auto inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {loadingConversations ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Aucune conversation récente.
            </p>
          ) : (
            conversations.slice(0, 4).map((conv) => {
              const otherParticipant = conv.participants.find(
                (p) => p.id !== conv.lastMessage?.senderId
              ) ?? conv.participants[0]
              const isUnread =
                conv.lastMessage &&
                new Date(conv.lastMessage.createdAt) > new Date(conv.lastReadAt)
              return (
                <Link
                  key={conv.id}
                  href={`/physio-data/messages?conversation=${conv.id}`}
                  className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 shrink-0">
                    {otherParticipant?.firstName?.[0] ?? "?"}
                    {otherParticipant?.lastName?.[0] ?? ""}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {otherParticipant
                          ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
                          : "Inconnu"}
                      </p>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage.content}
                      </p>
                    )}
                    {conv.lastMessage && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(conv.lastMessage.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })
          )}
          {conversations.length > 0 && (
            <Link
              href="/physio-data/messages"
              className="flex items-center gap-1 text-xs text-blue-600 font-medium pt-1 hover:underline"
            >
              Voir tous les messages <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </CardContent>
      </Card>
      </div>
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

        <Link href="/physio-data/bilans/modules">
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