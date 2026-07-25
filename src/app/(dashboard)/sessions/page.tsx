"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/components/layout/providers"
import { Plus, List, CalendarDays, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react"

import { Button, Card, Badge } from "@mantine/core"

interface Team {
  id: string
  name: string
}

interface SessionExercise {
  id: string
  exercise: { id: string; name: string; category: string } | null
  order: number
  durationMin: number | null
  notes: string | null
  isRest: boolean
  label: string | null
}

interface Session {
  id: string
  title: string
  description: string
  type: string
  date: string
  startTime: string | null
  endTime: string | null
  location: string | null
  status: string
  isRecurring: boolean
  recurrenceRule: string | null
  team?: { id: string; name: string } | null
  exercises?: SessionExercise[]
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  TRAINING: { label: "Entraînement", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "🏋️" },
  MATCH: { label: "Match", color: "bg-green-100 text-green-700 border-green-200", icon: "🏆" },
  CLUB_EVENT: { label: "Événement club", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: "🎪" },
  REATHLETISATION: { label: "Réathlétisation", color: "bg-amber-100 text-amber-700 border-amber-200", icon: "🩹" },
}

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

const ITEMS_PER_PAGE = 10

export default function SessionsPage() {
  const router = useRouter()
  const { user } = useSession()
  const [sessions, setSessions] = useState<Session[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // View toggle — default calendar
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar")

  // Team filter
  const [selectedTeamId, setSelectedTeamId] = useState("")

  // Calendar state
  const [calDate, setCalDate] = useState(new Date())

  // Pagination
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch teams (role-filtered)
        const teamsRes = await fetch("/api/teams/my")
        let tData: Team[] = []
        if (teamsRes.ok) {
          const data = await teamsRes.json()
          tData = Array.isArray(data) ? data : data.teams ?? []
        }
        setTeams(tData)

        // Auto-select first team for coaches/athletes, or none for admins
        if (user?.role !== "admin" && tData.length > 0) {
          setSelectedTeamId(tData[0].id)
        }

        // Fetch sessions
        const sessRes = await fetch("/api/sessions")
        if (!sessRes.ok) throw new Error("Erreur lors du chargement")
        const data = await sessRes.json()
        setSessions(Array.isArray(data) ? data : data.sessions ?? [])
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  // Filter sessions by team
  const filteredSessions = useMemo(
    () =>
      sessions
        .filter((s) => !selectedTeamId || s.team?.id === selectedTeamId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [sessions, selectedTeamId]
  )

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / ITEMS_PER_PAGE))
  const paginatedSessions = filteredSessions.slice(0, page * ITEMS_PER_PAGE)

  // Calendar helpers
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }
  function getFirstDayOfMonth(year: number, month: number) {
    return (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
  }

  const calYear = calDate.getFullYear()
  const calMonth = calDate.getMonth()
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)

  const calendarSessions = useMemo(
    () =>
      filteredSessions.filter((s) => {
        const d = new Date(s.date)
        return d.getFullYear() === calYear && d.getMonth() === calMonth
      }),
    [filteredSessions, calYear, calMonth]
  )

  function getSessionsForDay(day: number) {
    return calendarSessions.filter((s) => {
      const d = new Date(s.date)
      return d.getDate() === day
    })
  }

  const typeBadge = (type: string) => {
    const cfg = TYPE_CONFIG[type] || { label: type, color: "bg-gray-100", icon: "📅" }
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
        <span>{cfg.icon}</span>
        {cfg.label}
      </span>
    )
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case "published": return "Publié"
      case "draft": return "Brouillon"
      default: return status
    }
  }

  const catLabel = (cat: string) => {
    switch (cat) {
      case "PHYSIQUE": return "Physique"
      case "TECHNIQUE": return "Technique"
      case "TACTIQUE": return "Tactique"
      default: return cat
    }
  }

  const totalDuration = (exercises: SessionExercise[] | undefined) => {
    if (!exercises || exercises.length === 0) return null
    const total = exercises.reduce((sum, e) => sum + (e.durationMin ?? 0), 0)
    return total > 0 ? total : null
  }

  const canCreate = user?.role === "admin" || user?.role === "coach"

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Planning</h1>
        <div className="flex items-center gap-2">
          {/* Team selector */}
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {user?.role === "admin" && <option value="">Toutes les équipes</option>}
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <Button
              variant={viewMode === "list" ? "filled" : "subtle"}
              size="compact-sm"
              onClick={() => setViewMode("list")}
              className="rounded-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "filled" : "subtle"}
              size="compact-sm"
              onClick={() => setViewMode("calendar")}
              className="rounded-none"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>

          {canCreate && (
            <Button onClick={() => router.push("/sessions/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel événement
            </Button>
          )}
        </div>
      </div>

      {/* Calendar View (default) */}
      {viewMode === "calendar" && (
        <Card withBorder>
          <div className="flex flex-row items-center justify-between pb-2 px-6 pt-6">
            <div className="flex items-center gap-3">
              <Button variant="subtle" size="compact-sm" onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-xl font-semibold">{MONTHS[calMonth]} {calYear}</span>
              <Button variant="subtle" size="compact-sm" onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="compact-sm" onClick={() => setCalDate(new Date())} className="ml-2">
                Aujourd'hui
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {calendarSessions.length} événement{calendarSessions.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="px-6 pb-6 pt-2">
            <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
              {/* Day headers */}
              {DAYS.map((d) => (
                <div key={d} className="bg-background px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-background min-h-[100px] p-1" />
              ))}
              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const today = new Date()
                const isToday =
                  today.getDate() === day &&
                  today.getMonth() === calMonth &&
                  today.getFullYear() === calYear
                const daySessions = getSessionsForDay(day)

                return (
                  <div
                    key={day}
                    className={`bg-background min-h-[100px] p-1 transition-colors hover:bg-muted/30 ${
                      isToday ? "ring-2 ring-primary/30 ring-inset" : ""
                    }`}
                  >
                    <div className={`text-xs font-semibold mb-1 px-1 ${
                      isToday ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {daySessions.slice(0, 3).map((s) => {
                        const cfg = TYPE_CONFIG[s.type] || { label: s.type, color: "bg-gray-100", icon: "📅" }
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => router.push(`/sessions/${s.id}`)}
                            className={`w-full rounded px-1 py-0.5 text-[10px] leading-tight text-left truncate transition-colors ${cfg.color}`}
                            title={`${s.type === "MATCH" ? `vs ${s.title}` : s.title}${s.startTime ? ` — ${new Date(s.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
                          >
                            {cfg.icon} {s.type === "MATCH" ? `vs ${s.title}` : s.title}
                          </button>
                        )
                      })}
                      {daySessions.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{daySessions.length - 3} autres
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card withBorder>
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-xl font-semibold">Liste chronologique</h2>
          </div>
          <div className="px-6 pb-6 space-y-4">
            {paginatedSessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune séance trouvée pour cette équipe
              </p>
            ) : (
              paginatedSessions.map((session) => {
                const timeStr = session.startTime
                  ? new Date(session.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                  : ""
                const endStr = session.endTime
                  ? new Date(session.endTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                  : ""
                const total = totalDuration(session.exercises)
                const sortedExos = [...(session.exercises ?? [])].sort((a, b) => a.order - b.order)

                return (
                  <div
                    key={session.id}
                    className="rounded-lg border p-4 transition-colors hover:bg-muted/30 cursor-pointer"
                    onClick={() => router.push(`/sessions/${session.id}`)}
                  >
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {typeBadge(session.type)}
                        <span className="font-semibold">
                          {session.type === "MATCH" ? `vs ${session.title}` : session.title}
                        </span>
                        {session.status === "draft" && (
                          <Badge color="gray" size="xs">Brouillon</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(session.date).toLocaleDateString("fr-FR", {
                          weekday: "short", day: "numeric", month: "short",
                        })}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                      {timeStr && (
                        <span>🕐 {timeStr}{endStr ? ` — ${endStr}` : ""}</span>
                      )}
                      {session.type === "MATCH"
                        ? session.location === "Domicile"
                          ? "🏠 Domicile"
                          : session.location === "Extérieur"
                          ? "🛫 Extérieur"
                          : session.location ?? "—"
                        : <span>📍 {session.location ?? "—"}</span>}
                      {session.team && <span>👥 {session.team.name}</span>}
                      {total !== null && <span>⏱️ {total} min</span>}
                    </div>

                    {/* Exercises */}
                    {sortedExos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {sortedExos.slice(0, 5).map((se) => (
                          se.isRest ? (
                            <span
                              key={se.id}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/30 px-2 py-0.5 text-xs text-amber-700"
                            >
                              ⏱️ {se.label || "Récup"}
                              {se.durationMin && <span className="text-amber-500">({se.durationMin}min)</span>}
                            </span>
                          ) : (
                            <span
                              key={se.id}
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
                            >
                              <Dumbbell className="h-3 w-3" />
                              {se.exercise?.name}
                              {se.durationMin && <span className="text-muted-foreground">({se.durationMin}min)</span>}
                            </span>
                          )
                        ))}
                        {sortedExos.length > 5 && (
                          <span className="text-xs text-muted-foreground">+{sortedExos.length - 5} autres</span>
                        )}
                      </div>
                    )}

                    {/* Description preview */}
                    {session.description && (
                      <div
                        className="mt-2 text-sm text-muted-foreground line-clamp-2"
                        dangerouslySetInnerHTML={{
                          __html: session.description.replace(/<[^>]*>/g, "").slice(0, 150),
                        }}
                      />
                    )}
                  </div>
                )
              })
            )}

            {/* Pagination */}
            {filteredSessions.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="compact-sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="compact-sm"
                  onClick={() => {
                    setPage(page + 1)
                    if (page * ITEMS_PER_PAGE >= filteredSessions.length) {
                      // Load more
                    }
                  }}
                  disabled={page >= totalPages}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}