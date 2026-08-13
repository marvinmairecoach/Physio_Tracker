"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Badge, Button, Card, Modal, NativeSelect, Switch, Textarea, TextInput } from "@mantine/core"
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

const TYPE_LABELS: Record<string, string> = {
  ENTRAINEMENT: "Entraînement",
  MATCH: "Match",
  OBJECTIF: "Objectif",
  REATHLETISATION: "Réathlétisation",
  REPOS: "Repos",
  TEST: "Test",
  AUTRE: "Autre",
}

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))

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

function entryDateKey(entry: PlanningEntry) {
  return dateKey(toLocalDate(entry.date))
}

/* ------------------------------------------------------------------ */
/* Modal d'édition (auto-save 600ms sur les champs texte,              */
/* bouton explicite pour le switch objectif)                           */
/* ------------------------------------------------------------------ */

interface EditEntryModalProps {
  entry: PlanningEntry
  canEdit: boolean
  onClose: () => void
  onSaved: (updated: PlanningEntry) => void
}

function EditEntryModal({ entry, canEdit, onClose, onSaved }: EditEntryModalProps) {
  const [form, setForm] = useState({
    title: entry.title,
    type: entry.type,
    notes: entry.notes ?? "",
    isObjective: entry.isObjective,
  })
  const [savingObjective, setSavingObjective] = useState(false)

  // Réinitialise le formulaire uniquement quand on ouvre une autre entrée
  useEffect(() => {
    setForm({
      title: entry.title,
      type: entry.type,
      notes: entry.notes ?? "",
      isObjective: entry.isObjective,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id])

  const isObjective = form.isObjective || form.type === "OBJECTIF"

  // Auto-save (debounce 600ms) : titre, type, notes
  useEffect(() => {
    if (!canEdit) return
    const original = { title: entry.title, type: entry.type, notes: entry.notes ?? "" }
    if (
      form.title === original.title &&
      form.type === original.type &&
      (form.notes ?? "") === original.notes
    ) {
      return
    }
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/planning/${entry.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: form.title,
              type: form.type,
              notes: form.notes || null,
            }),
          })
          if (res.ok) {
            const updated = await res.json()
            onSaved({ ...entry, ...updated })
          }
        } catch {
          // silencieux — on garde l'état local
        }
      })()
    }, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, form.type, form.notes, entry.id, canEdit])

  const objectiveChanged = form.isObjective !== entry.isObjective

  async function saveObjective() {
    setSavingObjective(true)
    try {
      const res = await fetch(`/api/planning/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isObjective: form.isObjective }),
      })
      if (res.ok) {
        const updated = await res.json()
        onSaved({ ...entry, ...updated })
      }
    } catch {
      // silencieux
    } finally {
      setSavingObjective(false)
    }
  }

  return (
    <Modal opened onClose={onClose} title="Modifier l'entrée" size="md" centered>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {isObjective ? (
            <Badge color="yellow" variant="light">🎯 Objectif</Badge>
          ) : entry.origin === "equipe" ? (
            <Badge color="green" variant="light">
              Équipe{entry.team?.name ? ` · ${entry.team.name}` : ""}
            </Badge>
          ) : (
            <Badge color="blue" variant="light">Individuel</Badge>
          )}
          <span className="text-xs capitalize text-muted-foreground">
            {toLocalDate(entry.date).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        <TextInput
          label="Titre"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.currentTarget.value })}
          disabled={!canEdit}
          placeholder="Titre de l'entrée"
        />

        <NativeSelect
          label="Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.currentTarget.value })}
          data={TYPE_OPTIONS}
          disabled={!canEdit}
        />

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.currentTarget.value })}
          minRows={3}
          disabled={!canEdit}
          placeholder="Notes, consignes, détails..."
        />

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Objectif</div>
            <div className="text-xs text-muted-foreground">
              Marquer cette entrée comme un objectif à atteindre
            </div>
          </div>
          <Switch
            checked={form.isObjective}
            onChange={(e) => setForm({ ...form, isObjective: e.currentTarget.checked })}
            disabled={!canEdit}
          />
        </div>

        {canEdit && objectiveChanged && (
          <div className="flex justify-end">
            <Button size="compact-sm" onClick={saveObjective} loading={savingObjective}>
              Enregistrer l'objectif
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {canEdit
            ? "Titre, type et notes sont enregistrés automatiquement (délai de 600 ms)."
            : "Lecture seule — seuls les coachs peuvent modifier le planning."}
        </p>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PlanningPage() {
  const { user } = useSession()
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

  // Ajout rapide
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null)
  const [quickAddValue, setQuickAddValue] = useState("")
  const [quickAddSaving, setQuickAddSaving] = useState(false)

  // Édition
  const [editEntry, setEditEntry] = useState<PlanningEntry | null>(null)

  /* ---- Chargement des équipes ---- */
  useEffect(() => {
    let cancelled = false
    async function loadTeams() {
      try {
        const res = await fetch("/api/teams/my")
        if (cancelled) return
        if (!res.ok) {
          setLoading(false)
          return
        }
        const data = await res.json()
        const t: Team[] = Array.isArray(data) ? data : data.teams ?? []
        setTeams(t)
        if (t.length === 0) {
          setLoading(false)
        } else {
          setSelectedTeamId((prev) => prev || t[0].id)
        }
      } catch {
        if (!cancelled) setLoading(false)
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
    setQuickAddDate(null)
    setQuickAddValue("")
    if (!selectedTeamId) {
      setAthletes([])
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
          .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr"))
        setAthletes(list)
      } catch {
        if (!cancelled) setAthletes([])
      }
    }
    loadAthletes()
    return () => {
      cancelled = true
    }
  }, [selectedTeamId])

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

  /* ---- Regroupement par jour ---- */
  const entriesByDate = useMemo(() => {
    const map = new Map<string, PlanningEntry[]>()
    for (const entry of entries) {
      const key = entryDateKey(entry)
      const list = map.get(key) ?? []
      list.push(entry)
      map.set(key, list)
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
    setQuickAddDate(null)
    if (viewMode === "week") {
      const m = startOfWeek(calDate)
      m.setDate(m.getDate() - 7)
      setCalDate(m)
    } else {
      setCalDate(new Date(calYear, calMonth - 1, 1))
    }
  }

  function goNext() {
    setQuickAddDate(null)
    if (viewMode === "week") {
      const m = startOfWeek(calDate)
      m.setDate(m.getDate() + 7)
      setCalDate(m)
    } else {
      setCalDate(new Date(calYear, calMonth + 1, 1))
    }
  }

  function goToday() {
    setQuickAddDate(null)
    setCalDate(new Date())
  }

  /* ---- Ajout rapide ---- */
  function openQuickAdd(key: string) {
    if (!canCreate) return
    setQuickAddDate(key)
    setQuickAddValue("")
  }

  async function submitQuickAdd() {
    const title = quickAddValue.trim()
    if (!title || !quickAddDate) return
    setQuickAddSaving(true)
    try {
      const athleteScope = !!selectedAthleteId
      await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          date: quickAddDate,
          type: "ENTRAINEMENT",
          ...(athleteScope
            ? { athleteId: selectedAthleteId }
            : { teamId: selectedTeamId }),
          isObjective: false,
          notes: null,
        }),
      })
      setQuickAddDate(null)
      setQuickAddValue("")
      setRefreshKey((k) => k + 1)
    } catch {
      // silencieux
    } finally {
      setQuickAddSaving(false)
    }
  }

  /* ---- Suppression ---- */
  async function deleteEntry(entry: PlanningEntry) {
    try {
      await fetch(`/api/planning/${entry.id}`, { method: "DELETE" })
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    } catch {
      // silencieux
    }
  }

  /* ---- Mise à jour après édition ---- */
  function handleEntryUpdated(updated: PlanningEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)))
    setEditEntry((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev))
  }

  /* ---- Style des pastilles ---- */
  function chipClasses(entry: PlanningEntry) {
    if (entry.isObjective || entry.type === "OBJECTIF") {
      return "bg-amber-500/20 text-amber-700"
    }
    if (entry.origin === "equipe") {
      return "bg-emerald-500/15 text-green-700"
    }
    return "bg-blue-500/15 text-blue-700"
  }

  function renderEntryChip(entry: PlanningEntry) {
    const isObjective = entry.isObjective || entry.type === "OBJECTIF"
    return (
      <div
        key={entry.id}
        role="button"
        tabIndex={0}
        onClick={() => setEditEntry(entry)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setEditEntry(entry)
          }
        }}
        title={`${entry.title}${entry.origin === "equipe" && entry.team ? ` (${entry.team.name})` : ""}`}
        className={`group flex w-full cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] leading-tight transition-colors ${chipClasses(entry)}`}
      >
        <span className="flex-1 truncate">
          {isObjective ? "🎯 " : ""}
          {entry.title}
        </span>
        {canCreate && (
          <button
            type="button"
            aria-label="Supprimer l'entrée"
            onClick={(e) => {
              e.stopPropagation()
              void deleteEntry(entry)
            }}
            className="rounded p-0.5 opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100"
          >
            ✕
          </button>
        )}
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
    const showQuickAdd = quickAddDate === key

    return (
      <div
        key={key}
        onClick={() => openQuickAdd(key)}
        className={`min-h-[115px] cursor-pointer bg-background p-1 transition-colors hover:bg-muted/30 ${
          isToday ? "ring-2 ring-primary/30 ring-inset" : ""
        }`}
      >
        <div
          className={`mb-1 px-1 text-xs font-semibold ${
            isToday ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {date.getDate()}
        </div>

        {showQuickAdd && canCreate && (
          <TextInput
            size="xs"
            placeholder="Ajouter..."
            value={quickAddValue}
            onChange={(e) => setQuickAddValue(e.currentTarget.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void submitQuickAdd()
              } else if (e.key === "Escape") {
                setQuickAddDate(null)
                setQuickAddValue("")
              }
            }}
            autoFocus
            disabled={quickAddSaving}
            className="mb-1"
            aria-label="Ajouter une entrée"
          />
        )}

        <div className="space-y-0.5">
          {dayEntries.slice(0, 4).map(renderEntryChip)}
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
                setQuickAddDate(null)
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
                setQuickAddDate(null)
              }}
              disabled={!selectedTeamId}
              data={[
                {
                  value: "",
                  label: "Aucun athlète (planification équipe)",
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
                setQuickAddDate(null)
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
                setQuickAddDate(null)
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

        {/* Grille */}
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

      {/* Modal d'édition */}
      {editEntry && (
        <EditEntryModal
          entry={editEntry}
          canEdit={canCreate}
          onClose={() => setEditEntry(null)}
          onSaved={handleEntryUpdated}
        />
      )}
    </div>
  )
}
