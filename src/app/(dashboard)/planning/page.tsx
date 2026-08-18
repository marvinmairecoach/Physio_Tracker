"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Calendar, Pencil, Trash2 } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { Button, Card, NativeSelect, TextInput } from "@mantine/core"
import { useSession } from "@/components/layout/providers"

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Team {
  id: string
  name: string
}

interface Athlete {
  id: string
  firstName: string
  lastName: string
  isArchived?: boolean
}

interface AthleteTeamMember {
  id: string
  athlete: Athlete
}

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
  origin: "individuel" | "equipe"
  team: { id: string; name: string } | null
  teamName?: string | null
}

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

/* ------------------------------------------------------------------ */
/* Helpers dates (timezone locale, Lundi = premier jour)               */
/* ------------------------------------------------------------------ */

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function monthKeyOf(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

/** Convertit "YYYY-MM-DD..." (renvoyé par l'API) en Date locale à minuit. */
function toLocalDate(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(dateStr)
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7 // Mon = 0
}

function startOfWeek(d: Date) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (copy.getDay() + 6) % 7 // Mon = 0
  copy.setDate(copy.getDate() - dow)
  return copy
}

/** Retourne toutes les dates (clés) sur lesquelles une entrée doit être affichée. */
function entryDateKeys(entry: PlanningEntry): string[] {
  const start = toLocalDate(entry.date)
  if (!entry.dateEnd) return [dateKey(start)]
  const end = toLocalDate(entry.dateEnd)
  const keys: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    keys.push(dateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

/* ------------------------------------------------------------------ */
/* Panneau latéral                                                     */
/* ------------------------------------------------------------------ */

interface SidePanelProps {
  selectedDate: Date | null
  entriesByDate: Map<string, PlanningEntry[]>
  canCreate: boolean
  selectedAthleteId: string
  selectedTeamId: string
  onRefetch: () => void
}

function SidePanel({
  selectedDate,
  entriesByDate,
  canCreate,
  selectedAthleteId,
  selectedTeamId,
  onRefetch,
}: SidePanelProps) {
  const [content, setContent] = useState("")
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const [copyTarget, setCopyTarget] = useState<PlanningEntry | null>(null)
  const [copyDate, setCopyDate] = useState("")

  const selectedDateStr = selectedDate ? dateKey(selectedDate) : ""

  // Reset on day change
  useEffect(() => {
    setContent("")
    setCurrentEntryId(null)
    setCopyTarget(null)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [selectedDate])

  // Auto-resize textarea
  function autoResize(el: HTMLTextAreaElement | null) {
    if (!el) return
    el.style.height = "auto"
    el.style.height = el.scrollHeight + "px"
  }

  // Save current content (create or update)
  async function saveContent() {
    const text = content.trim()
    if (!text || !selectedDate) return
    setSaving(true)
    try {
      const athleteScope = !!selectedAthleteId
      if (currentEntryId) {
        // Update existing entry
        await fetch(`/api/planning/${currentEntryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: text }),
        })
      } else {
        // Create new entry
        const res = await fetch("/api/planning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: text,
            date: selectedDateStr,
            type: "ENTRAINEMENT",
            ...(athleteScope ? { athleteId: selectedAthleteId } : { teamId: selectedTeamId }),
          }),
        })
        if (res.ok) {
          const created = await res.json()
          setCurrentEntryId(created.id)
        }
      }
      onRefetch()
    } catch {
      // silencieux
    } finally {
      setSaving(false)
    }
  }

  // Auto-save on content change with debounce
  function handleContentChange(value: string) {
    setContent(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveContent()
    }, 800)
  }

  // "Ajouter un élément" : save current, start new
  async function handleNewElement() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (content.trim()) {
      await saveContent()
    }
    setContent("")
    setCurrentEntryId(null)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  async function handleDelete(entry: PlanningEntry) {
    if (!confirm(`Supprimer cet élément ?`)) return
    try {
      await fetch(`/api/planning/${entry.id}`, { method: "DELETE" })
      if (currentEntryId === entry.id) {
        setCurrentEntryId(null)
      }
      onRefetch()
    } catch {
      // silencieux
    }
  }

  async function handleCopy() {
    if (!copyTarget || !copyDate) return
    try {
      await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: copyTarget.title,
          date: copyDate,
          type: "ENTRAINEMENT",
          athleteId: copyTarget.athleteId,
          teamId: copyTarget.teamId,
        }),
      })
      setCopyTarget(null)
      setCopyDate("")
      onRefetch()
    } catch {
      // silencieux
    }
  }

  if (!selectedDate) {
    return (
      <div className="sticky top-6 self-start">
        <Card withBorder className="py-12">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Calendar className="h-10 w-10 opacity-30" />
            <p className="text-sm">Sélectionnez un jour</p>
          </div>
        </Card>
      </div>
    )
  }

  const key = selectedDateStr
  const dayEntries = entriesByDate.get(key) ?? []
  const dateLabel = selectedDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="sticky top-6 self-start">
      <Card withBorder>
        <h3 className="mb-4 text-base font-semibold capitalize">{dateLabel}</h3>

        {/* Contenu field — auto-save */}
        {canCreate && (
          <div className="mb-4 space-y-2 rounded-lg border border-dashed border-muted-foreground/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Contenu</p>
            <textarea
              ref={(el) => {
                (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
                autoResize(el)
              }}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
              placeholder="Écrire ici — sauvegarde automatique..."
              value={content}
              onChange={(e) => {
                handleContentChange(e.target.value)
                autoResize(e.target)
              }}
              disabled={saving}
            />
            <div className="flex items-center gap-2">
              <Button
                size="compact-sm"
                onClick={handleNewElement}
                className="w-full"
              >
                Ajouter un élément
              </Button>
              {saving && (
                <span className="text-xs text-muted-foreground shrink-0">Sauvegarde...</span>
              )}
            </div>
          </div>
        )}

        {/* Liste des entrées */}
        {dayEntries.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Aucune entrée pour ce jour.
          </p>
        ) : (
          <div className="space-y-2">
            {dayEntries.map((entry) => {
              const isEditing = currentEntryId === entry.id

              return (
                <div
                  key={entry.id}
                  className={`rounded-md border p-2 text-sm ${
                    isEditing ? "ring-2 ring-blue-300 border-blue-300" : ""
                  }`}
                >
                  {/* Contenu text */}
                  <p className="whitespace-pre-wrap break-words">{entry.title}</p>

                  {/* Actions */}
                  <div className="mt-1 flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      aria-label="Modifier"
                      onClick={() => {
                        setContent(entry.title)
                        setCurrentEntryId(entry.id)
                        setTimeout(() => textareaRef.current?.focus(), 50)
                      }}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Copier"
                      onClick={() => {
                        setCopyTarget(entry)
                        setCopyDate(selectedDateStr)
                      }}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="Copier sur un autre jour"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Supprimer"
                      onClick={() => void handleDelete(entry)}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Copy dialog */}
      {copyTarget && (
        <Card withBorder className="mt-3">
          <div className="space-y-2">
            <p className="text-xs font-medium">Copier sur un autre jour</p>
            <p className="text-xs text-muted-foreground">
              "{copyTarget.title}"
            </p>
            <TextInput
              size="xs"
              type="date"
              value={copyDate}
              onChange={(e) => setCopyDate(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="compact-sm" onClick={handleCopy}>
                Copier ici
              </Button>
              <Button size="compact-sm" variant="subtle" onClick={() => setCopyTarget(null)}>
                Annuler
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PlanningPage() {
  return (
    <Suspense fallback={null}>
      <PlanningPageContent />
    </Suspense>
  )
}

function PlanningPageContent() {
  const { user } = useSession()
  const searchParams = useSearchParams()
  const canCreate = user?.role === "admin" || user?.role === "coach"

  // Portée
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState("")

  // Vue
  const [viewMode, setViewMode] = useState<"month" | "week">("month")
  const [calDate, setCalDate] = useState(() => new Date())

  // Données
  const [entries, setEntries] = useState<PlanningEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Panneau latéral — date sélectionnée
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Flag pour savoir si le chargement initial des teams+athlètes est fait
  const [initialLoaded, setInitialLoaded] = useState(false)

  /* ---- Chargement des équipes ---- */
  useEffect(() => {
    let cancelled = false
    async function loadTeams() {
      try {
        const res = await fetch("/api/teams/my")
        if (cancelled) return
        if (!res.ok) {
          setLoading(false)
          setInitialLoaded(true)
          return
        }
        const data = await res.json()
        const t: Team[] = Array.isArray(data) ? data : data.teams ?? []
        setTeams(t)
        if (t.length === 0) {
          setLoading(false)
          setInitialLoaded(true)
        } else {
          setSelectedTeamId((prev) => prev || t[0].id)
        }
      } catch {
        if (!cancelled) {
          setLoading(false)
          setInitialLoaded(true)
        }
      }
    }
    loadTeams()
    return () => {
      cancelled = true
    }
  }, [])

  /* ---- Chargement des athlètes quand l'équipe change ---- */
  useEffect(() => {
    setSelectedAthleteId("")
    setSelectedDate(null)
    if (!selectedTeamId) {
      setAthletes([])
      setInitialLoaded(true)
      return
    }
    let cancelled = false
    async function loadAthletes() {
      try {
        const res = await fetch(`/api/teams/${selectedTeamId}/athletes`)
        if (cancelled) return
        if (!res.ok) {
          setAthletes([])
          return
        }
        const data = await res.json()
        const list: Athlete[] = (Array.isArray(data) ? data : [])
          .map((m: AthleteTeamMember) => m.athlete)
          .filter((a: Athlete | undefined): a is Athlete => !!a)
          .filter((a) => !a.isArchived)
          .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr"))
        setAthletes(list)
      } catch {
        if (!cancelled) setAthletes([])
      } finally {
        if (!cancelled) setInitialLoaded(true)
      }
    }
    loadAthletes()
    return () => {
      cancelled = true
    }
  }, [selectedTeamId])

  // Athlète en attente de sélection (via query param) — appliqué dès que
  // la liste des athlètes de son équipe est chargée
  const [pendingAthleteId, setPendingAthleteId] = useState<string | null>(null)

  /* ---- Query params preselect ---- */
  useEffect(() => {
    if (!initialLoaded || teams.length === 0) return

    const athleteParam = searchParams.get("athlete")
    const teamParam = searchParams.get("team")

    if (athleteParam) {
      // Cherche l'athlète dans les données déjà chargées
      const found = athletes.find((a) => a.id === athleteParam)
      if (found) {
        setPendingAthleteId(null)
        setSelectedAthleteId(athleteParam)
        return
      }
      // Sinon on fetch l'athlète pour trouver son équipe
      let cancelled = false
      void (async () => {
        try {
          const res = await fetch(`/api/athletes/${athleteParam}`)
          if (cancelled || !res.ok) return
          const data = await res.json()
          // data.teams est un tableau AthleteTeam[] avec include: { team: true }
          const athleteTeams: { team: Team }[] = data.teams ?? []
          if (athleteTeams.length > 0 && !cancelled) {
            setPendingAthleteId(athleteParam)
            setSelectedTeamId(athleteTeams[0].team.id)
          }
        } catch {
          // silencieux
        }
      })()
      return () => {
        cancelled = true
      }
    }

    if (teamParam) {
      const found = teams.find((t) => t.id === teamParam)
      if (found) {
        setPendingAthleteId(null)
        setSelectedTeamId(teamParam)
        setSelectedAthleteId("")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoaded, teams, searchParams])

  /* ---- Applique l'athlète en attente quand ses données sont chargées ---- */
  useEffect(() => {
    if (!pendingAthleteId) return
    if (athletes.some((a) => a.id === pendingAthleteId)) {
      setSelectedAthleteId(pendingAthleteId)
      setPendingAthleteId(null)
    }
  }, [athletes, pendingAthleteId])

  /* ---- Mois demandés selon la vue ---- */
  const monthKeys = useMemo(() => {
    if (viewMode === "week") {
      const monday = startOfWeek(calDate)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return Array.from(new Set([monthKeyOf(monday), monthKeyOf(sunday)]))
    }
    return [monthKeyOf(calDate)]
  }, [viewMode, calDate])

  /* ---- Chargement des entrées ---- */
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!selectedTeamId) {
      setEntries([])
      return
    }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const athleteScope = !!selectedAthleteId
        const base = new URLSearchParams({
          scope: athleteScope ? "athlete" : "team",
          id: athleteScope ? selectedAthleteId : selectedTeamId,
        })
        const results = await Promise.all(
          monthKeys.map(async (mk) => {
            const params = new URLSearchParams(base)
            params.set("month", mk)
            const res = await fetch(`/api/planning?${params.toString()}`)
            if (!res.ok) return [] as PlanningEntry[]
            const data = await res.json()
            return (Array.isArray(data) ? data : data.entries ?? []) as PlanningEntry[]
          })
        )
        const merged = new Map<string, PlanningEntry>()
        for (const list of results) {
          for (const entry of list) merged.set(entry.id, entry)
        }
        if (!cancelled) setEntries(Array.from(merged.values()))
      } catch {
        if (!cancelled) setEntries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedTeamId, selectedAthleteId, monthKeys, refreshKey])

  /* ---- Regroupement par jour (périodes incluses) ---- */
  const entriesByDate = useMemo(() => {
    const map = new Map<string, PlanningEntry[]>()
    for (const entry of entries) {
      const keys = entryDateKeys(entry)
      for (const key of keys) {
        const list = map.get(key) ?? []
        list.push(entry)
        map.set(key, list)
      }
    }
    return map
  }, [entries])

  /* ---- Calculs calendrier ---- */
  const calYear = calDate.getFullYear()
  const calMonth = calDate.getMonth()
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)

  const monday = viewMode === "week" ? startOfWeek(calDate) : null
  const weekDays = monday
    ? Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
    : []
  const sunday = monday ? new Date(monday) : null
  if (sunday) sunday.setDate(monday!.getDate() + 6)

  const headerLabel =
    viewMode === "week" && monday && sunday
      ? `Semaine du ${monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
      : `${MONTHS[calMonth]} ${calYear}`

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null
  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId) ?? null

  const scopeLabel = selectedAthlete
    ? `Planning individuel — ${selectedAthlete.firstName} ${selectedAthlete.lastName}`
    : selectedTeam
    ? `Planning équipe — ${selectedTeam.name}`
    : ""

  /* ---- Navigation ---- */
  function goPrev() {
    setSelectedDate(null)
    if (viewMode === "week") {
      const m = startOfWeek(calDate)
      m.setDate(m.getDate() - 7)
      setCalDate(m)
    } else {
      setCalDate(new Date(calYear, calMonth - 1, 1))
    }
  }

  function goNext() {
    setSelectedDate(null)
    if (viewMode === "week") {
      const m = startOfWeek(calDate)
      m.setDate(m.getDate() + 7)
      setCalDate(m)
    } else {
      setCalDate(new Date(calYear, calMonth + 1, 1))
    }
  }

  function goToday() {
    setSelectedDate(null)
    setCalDate(new Date())
  }

  /* ---- Style des pastilles ---- */
  function chipClasses(entry: PlanningEntry) {
    if (entry.isObjective || entry.type === "OBJECTIF") {
      return "bg-amber-500/20 text-amber-700 border-l-4 border-amber-400"
    }
    if (entry.origin === "equipe") {
      return "bg-emerald-500/15 text-green-700"
    }
    return "bg-blue-500/15 text-blue-700"
  }

  function renderEntryChip(entry: PlanningEntry, day: Date) {
    const isObjective = entry.isObjective || entry.type === "OBJECTIF"
    return (
      <div
        key={entry.id}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedDate(day)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setSelectedDate(day)
          }
        }}
        title={`${entry.title}${entry.origin === "equipe" && entry.team ? ` (${entry.team.name})` : ""}`}
        className={`group flex w-full cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] leading-tight transition-colors ${chipClasses(entry)}`}
      >
        <span className="flex-1 truncate">
          {isObjective ? "🎯 " : ""}
          {entry.title}
        </span>
      </div>
    )
  }

  /* ---- Cellule de jour ---- */
  function renderDayCell(date: Date) {
    const now = new Date()
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()

    const key = dateKey(date)
    const dayEntries = entriesByDate.get(key) ?? []
    const isSelected = selectedDate && dateKey(selectedDate) === key

    return (
      <div
        key={key}
        onClick={() => setSelectedDate(date)}
        className={`min-h-[115px] cursor-pointer bg-background p-1 transition-colors hover:bg-muted/30 ${
          isToday ? "ring-2 ring-primary/30 ring-inset" : ""
        } ${isSelected ? "ring-2 ring-amber-500 ring-inset" : ""}`}
      >
        <div
          className={`mb-1 px-1 text-xs font-semibold ${
            isToday ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {date.getDate()}
        </div>

        <div className="space-y-0.5">
          {dayEntries.slice(0, 4).map((entry) => renderEntryChip(entry, date))}
          {dayEntries.length > 4 && (
            <div className="px-1 text-[10px] text-muted-foreground">
              +{dayEntries.length - 4} autres
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planning</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planifiez les séances, matchs et objectifs de vos équipes et athlètes.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-auto">
            <NativeSelect
              label="Équipe"
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.currentTarget.value)
                setSelectedDate(null)
              }}
              data={[
                { value: "", label: "Sélectionner une équipe" },
                ...teams.map((t) => ({ value: t.id, label: t.name })),
              ]}
              className="w-full sm:min-w-[220px]"
            />
          </div>
          <div className="w-full sm:w-auto">
            <NativeSelect
              label="Athlète"
              value={selectedAthleteId}
              onChange={(e) => {
                setSelectedAthleteId(e.currentTarget.value)
                setSelectedDate(null)
              }}
              disabled={!selectedTeamId}
              data={[
                {
                  value: "",
                  label: "Planification equipe",
                },
                ...athletes.map((a) => ({
                  value: a.id,
                  label: `${a.firstName} ${a.lastName}`,
                })),
              ]}
              className="w-full sm:min-w-[260px]"
            />
          </div>
        </div>
      </div>

      {/* Grille principale : calendrier + panneau latéral */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Calendrier */}
        <Card withBorder>
          {/* Légende + bascule Mois/Semaine */}
          <div className="flex flex-col gap-3 px-6 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                Individuel
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Équipe
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Objectif
              </span>
            </div>

            <div className="flex overflow-hidden rounded-md border">
              <Button
                variant={viewMode === "month" ? "filled" : "subtle"}
                size="compact-sm"
                className="rounded-none"
                onClick={() => {
                  setViewMode("month")
                  setSelectedDate(null)
                }}
              >
                Mois
              </Button>
              <Button
                variant={viewMode === "week" ? "filled" : "subtle"}
                size="compact-sm"
                className="rounded-none"
                onClick={() => {
                  setViewMode("week")
                  setSelectedDate(null)
                }}
              >
                Semaine
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-row flex-wrap items-center justify-between gap-2 px-6 pb-2 pt-4">
            <div className="flex items-center gap-1">
              <Button variant="subtle" size="compact-sm" onClick={goPrev} aria-label="Précédent">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="min-w-[190px] text-center text-lg font-semibold">{headerLabel}</span>
              <Button variant="subtle" size="compact-sm" onClick={goNext} aria-label="Suivant">
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="compact-sm" onClick={goToday} className="ml-1">
                Aujourd'hui
              </Button>
            </div>
            <div className="hidden text-sm text-muted-foreground md:block">{scopeLabel}</div>
          </div>

          {/* Grille calendrier */}
          <div className="px-6 pb-6 pt-2">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground">Chargement...</div>
            ) : teams.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                Aucune équipe disponible pour votre compte.
              </div>
            ) : !selectedTeamId ? (
              <div className="py-16 text-center text-muted-foreground">
                Sélectionnez une équipe pour afficher le planning.
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-muted">
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className="bg-background px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}

                {viewMode === "month" ? (
                  <>
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="min-h-[115px] bg-background p-1" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) =>
                      renderDayCell(new Date(calYear, calMonth, i + 1))
                    )}
                  </>
                ) : (
                  weekDays.map((d) => renderDayCell(d))
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Panneau latéral */}
        <SidePanel
          selectedDate={selectedDate}
          entriesByDate={entriesByDate}
          canCreate={canCreate}
          selectedAthleteId={selectedAthleteId}
          selectedTeamId={selectedTeamId}
          onRefetch={refetch}
        />
      </div>
    </div>
  )
}