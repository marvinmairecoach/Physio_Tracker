"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Calendar, Pencil, Trash2, Plus } from "lucide-react"
import Link from "next/link"
import { Button, Card, NativeSelect, TextInput, Textarea, Modal } from "@mantine/core"
import { useSession } from "@/components/layout/providers"

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

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

interface EntryFormData {
  title: string
  type: string
  date: string
  dateEnd: string
  hasDateEnd: boolean
  notes: string
}

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

const ENTRY_TYPES = [
  { value: "ENTRAINEMENT", label: "Entraînement" },
  { value: "MATCH", label: "Match" },
  { value: "OBJECTIF", label: "Objectif" },
  { value: "REATHLETISATION", label: "Réathlétisation" },
  { value: "REPOS", label: "Repos" },
  { value: "TEST", label: "Test" },
  { value: "AUTRE", label: "Autre" },
  { value: "INDISPONIBILITE", label: "Indisponibilité" },
]

const TYPE_COLORS: Record<string, string> = {
  ENTRAINEMENT: "bg-blue-500/15 text-blue-700 border-l-4 border-blue-400",
  MATCH: "bg-green-500/15 text-green-700 border-l-4 border-green-400",
  OBJECTIF: "bg-amber-500/15 text-amber-700 border-l-4 border-amber-400",
  REATHLETISATION: "bg-purple-500/15 text-purple-700 border-l-4 border-purple-400",
  REPOS: "bg-gray-500/15 text-gray-700 border-l-4 border-gray-400",
  TEST: "bg-cyan-500/15 text-cyan-700 border-l-4 border-cyan-400",
  AUTRE: "bg-slate-500/15 text-slate-700 border-l-4 border-slate-400",
  INDISPONIBILITE: "bg-red-500/15 text-red-700 border-l-4 border-red-400",
}

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
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

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/* ------------------------------------------------------------------ */
/* EntryFormModal                                                      */
/* ------------------------------------------------------------------ */

interface EntryFormModalProps {
  opened: boolean
  onClose: () => void
  /** Pre-filled date (YYYY-MM-DD) */
  defaultDate: string
  /** If set, we are editing an existing entry */
  editEntry: PlanningEntry | null
  athleteId: string
  onSaved: () => void
}

function EntryFormModal({
  opened,
  onClose,
  defaultDate,
  editEntry,
  athleteId,
  onSaved,
}: EntryFormModalProps) {
  const isEdit = !!editEntry
  const [form, setForm] = useState<EntryFormData>({
    title: "",
    type: "ENTRAINEMENT",
    date: defaultDate,
    dateEnd: "",
    hasDateEnd: false,
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (!opened) return
    if (editEntry) {
      setForm({
        title: editEntry.title,
        type: editEntry.type,
        date: editEntry.date.slice(0, 10),
        dateEnd: editEntry.dateEnd ? editEntry.dateEnd.slice(0, 10) : "",
        hasDateEnd: !!editEntry.dateEnd,
        notes: editEntry.notes ?? "",
      })
    } else {
      setForm({
        title: "",
        type: "ENTRAINEMENT",
        date: defaultDate,
        dateEnd: "",
        hasDateEnd: false,
        notes: "",
      })
    }
  }, [opened, editEntry, defaultDate])

  function updateField<K extends keyof EntryFormData>(key: K, value: EntryFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        type: form.type,
        athleteId,
      }

      if (isEdit) {
        // PATCH
        await fetch(`/physio-data/api/planning/${editEntry!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        // POST
        body.date = form.date
        if (form.hasDateEnd && form.dateEnd) {
          body.dateEnd = form.dateEnd
        }
        if (form.notes.trim()) {
          body.notes = form.notes.trim()
        }
        await fetch("/physio-data/api/planning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      onSaved()
      onClose()
    } catch {
      // silencieux
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editEntry) return
    if (!confirm("Supprimer cette entrée ?")) return
    try {
      await fetch(`/physio-data/api/planning/${editEntry.id}`, { method: "DELETE" })
      onSaved()
      onClose()
    } catch {
      // silencieux
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? "Modifier l'entrée" : "Nouvelle entrée"}
      size="sm"
      trapFocus={false}
    >
      <div className="space-y-4">
        {/* Type */}
        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <NativeSelect
            value={form.type}
            onChange={(e) => updateField("type", e.currentTarget.value)}
            data={ENTRY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
        </div>

        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium">Titre</label>
          <TextInput
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Description de l'entrée..."
          />
        </div>

        {/* Date */}
        {!isEdit && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Date de début</label>
              <TextInput
                type="date"
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.hasDateEnd}
                onChange={(e) => updateField("hasDateEnd", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label className="text-sm">Entrée multi-jours</label>
            </div>

            {form.hasDateEnd && (
              <div>
                <label className="mb-1 block text-sm font-medium">Date de fin</label>
                <TextInput
                  type="date"
                  value={form.dateEnd}
                  onChange={(e) => updateField("dateEnd", e.target.value)}
                />
              </div>
            )}
          </>
        )}

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <Textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Informations supplémentaires..."
            minRows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2">
          {isEdit && (
            <Button color="red" variant="subtle" size="compact-sm" onClick={handleDelete}>
              <Trash2 className="mr-1 h-4 w-4" />
              Supprimer
            </Button>
          )}
          <div className="flex items-center gap-2">
            {isEdit && (
              <Button variant="subtle" size="compact-sm" onClick={onClose}>
                Annuler
              </Button>
            )}
            <Button
              size="compact-sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.title.trim()}
            >
              {isEdit ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* DaySidePanel                                                        */
/* ------------------------------------------------------------------ */

interface DaySidePanelProps {
  selectedDate: Date | null
  entriesByDate: Map<string, PlanningEntry[]>
  myAthleteId: string
  onRefetch: () => void
}

function DaySidePanel({
  selectedDate,
  entriesByDate,
  myAthleteId,
  onRefetch,
}: DaySidePanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<PlanningEntry | null>(null)

  const selectedDateStr = selectedDate ? dateKey(selectedDate) : ""
  const dayEntries = selectedDate ? (entriesByDate.get(selectedDateStr) ?? []) : []
  const dateLabel = selectedDate ? formatDateLabel(selectedDate) : ""

  function openNewEntry() {
    setEditEntry(null)
    setModalOpen(true)
  }

  function openEditEntry(entry: PlanningEntry) {
    setEditEntry(entry)
    setModalOpen(true)
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

  return (
    <>
      <div className="sticky top-6 self-start">
        <Card withBorder>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold capitalize">{dateLabel}</h3>
            <Button size="compact-sm" variant="light" onClick={openNewEntry}>
              <Plus className="mr-1 h-4 w-4" />
              Ajouter
            </Button>
          </div>

          {dayEntries.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Aucune entrée pour ce jour.
            </p>
          ) : (
            <div className="space-y-2">
              {dayEntries.map((entry) => {
                const typeInfo = ENTRY_TYPES.find((t) => t.value === entry.type)
                return (
                  <div
                    key={entry.id}
                    className="group relative cursor-pointer rounded-md border p-3 text-sm transition-colors hover:bg-muted/30"
                    onClick={() => openEditEntry(entry)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        openEditEntry(entry)
                      }
                    }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                          TYPE_COLORS[entry.type] ?? TYPE_COLORS.AUTRE
                        }`}
                      >
                        {typeInfo?.label ?? entry.type}
                      </span>
                      {entry.dateEnd && (
                        <span className="text-[10px] text-muted-foreground">
                          {entry.date.slice(0, 10)} → {entry.dateEnd.slice(0, 10)}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words font-medium">
                      {entry.title}
                    </p>
                    {entry.notes && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {entry.notes}
                      </p>
                    )}
                    <button
                      type="button"
                      aria-label="Modifier"
                      className="absolute right-2 top-2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditEntry(entry)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <EntryFormModal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditEntry(null)
        }}
        defaultDate={selectedDateStr}
        editEntry={editEntry}
        athleteId={myAthleteId}
        onSaved={onRefetch}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* EntryChip                                                          */
/* ------------------------------------------------------------------ */

interface EntryChipProps {
  entry: PlanningEntry
  day: Date
  onSelectDay: (day: Date) => void
}

function EntryChip({ entry, day, onSelectDay }: EntryChipProps) {
  const typeInfo = ENTRY_TYPES.find((t) => t.value === entry.type)
  const isObjective = entry.type === "OBJECTIF" || entry.isObjective
  const colorClass = TYPE_COLORS[entry.type] ?? TYPE_COLORS.AUTRE

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectDay(day)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelectDay(day)
        }
      }}
      title={`${typeInfo?.label ?? entry.type}: ${entry.title}`}
      className={`group flex w-full cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] leading-tight transition-colors ${colorClass}`}
    >
      <span className="flex-1 truncate">
        {isObjective ? "🎯 " : ""}
        {entry.title}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* DayCell                                                            */
/* ------------------------------------------------------------------ */

interface DayCellProps {
  date: Date
  entriesByDate: Map<string, PlanningEntry[]>
  selectedDate: Date | null
  onSelectDay: (day: Date) => void
}

function DayCell({ date, entriesByDate, selectedDate, onSelectDay }: DayCellProps) {
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
      onClick={() => onSelectDay(date)}
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
        {dayEntries.slice(0, 4).map((entry) => (
          <EntryChip key={entry.id} entry={entry} day={date} onSelectDay={onSelectDay} />
        ))}
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
/* CalendarHeader                                                      */
/* ------------------------------------------------------------------ */

interface CalendarHeaderProps {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

function CalendarHeader({ label, onPrev, onNext, onToday }: CalendarHeaderProps) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="subtle" size="compact-sm" onClick={onPrev} aria-label="Précédent">
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <span className="min-w-[190px] text-center text-lg font-semibold">{label}</span>
      <Button variant="subtle" size="compact-sm" onClick={onNext} aria-label="Suivant">
        <ChevronRight className="h-5 w-5" />
      </Button>
      <Button variant="outline" size="compact-sm" onClick={onToday} className="ml-1">
        Aujourd'hui
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Legend                                                             */
/* ------------------------------------------------------------------ */

function PlanningLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {ENTRY_TYPES.map((t) => (
        <span key={t.value} className="flex items-center gap-1.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              t.value === "ENTRAINEMENT"
                ? "bg-blue-500"
                : t.value === "MATCH"
                  ? "bg-green-500"
                  : t.value === "OBJECTIF"
                    ? "bg-amber-500"
                    : t.value === "REATHLETISATION"
                      ? "bg-purple-500"
                      : t.value === "REPOS"
                        ? "bg-gray-500"
                        : t.value === "TEST"
                          ? "bg-cyan-500"
                          : t.value === "INDISPONIBILITE"
                            ? "bg-red-500"
                            : "bg-slate-500"
            }`}
          />
          {t.label}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page content                                                       */
/* ------------------------------------------------------------------ */

function PlanningPageContent() {
  const { user } = useSession()

  // State
  const [calDate, setCalDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [entries, setEntries] = useState<PlanningEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [myAthleteId, setMyAthleteId] = useState<string>("")

  /* ---- Load my athlete ID ---- */
  useEffect(() => {
    if (!user) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/physio-data/api/athletes?limit=1000&includeArchived=false")
        if (cancelled) return
        if (!res.ok) return
        const data = await res.json()
        const list: { id: string; userId: string | null }[] = Array.isArray(data)
          ? data
          : Array.isArray(data.athletes)
            ? data.athletes
            : []
        const mine = list.find((a) => a.userId === user.id)
        if (mine) {
          setMyAthleteId(mine.id)
        } else if (user.role === "admin" || user.role === "coach") {
          // Chercher d'abord un athlète existant avec le même nom (évite les doublons)
          const sameName = list.find(
            (a: any) => a.firstName === user.firstName && a.lastName === user.lastName
          )
          if (sameName) {
            setMyAthleteId(sameName.id)
          } else {
            // Auto-create an athlete profile for admin/coach users
            try {
              const createRes = await fetch("/physio-data/api/athletes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  firstName: user.firstName,
                  lastName: user.lastName,
                  userId: user.id,
                }),
              })
              if (createRes.ok) {
                const newAthlete = await createRes.json()
                setMyAthleteId(newAthlete.id)
              }
            } catch {
              // silencieux
            }
          }
        }
      } catch {
        // silencieux
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  /* ---- Month key ---- */
  const monthKey = useMemo(() => monthKeyOf(calDate), [calDate])

  /* ---- Fetch entries ---- */
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!myAthleteId) {
      setEntries([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const params = new URLSearchParams({
          athleteId: myAthleteId,
          month: monthKey,
        })
        const res = await fetch(`/physio-data/api/planning?${params.toString()}`)
        if (cancelled) return
        if (!res.ok) {
          setEntries([])
          return
        }
        const data = await res.json()
        const list: PlanningEntry[] = Array.isArray(data) ? data : data.entries ?? []
        if (!cancelled) setEntries(list)
      } catch {
        if (!cancelled) setEntries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [myAthleteId, monthKey, refreshKey])

  /* ---- Group entries by date ---- */
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

  /* ---- Calendar calculations ---- */
  const calYear = calDate.getFullYear()
  const calMonth = calDate.getMonth()
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const headerLabel = `${MONTHS[calMonth]} ${calYear}`

  /* ---- Navigation ---- */
  function goPrev() {
    setSelectedDate(null)
    setCalDate(new Date(calYear, calMonth - 1, 1))
  }

  function goNext() {
    setSelectedDate(null)
    setCalDate(new Date(calYear, calMonth + 1, 1))
  }

  function goToday() {
    setSelectedDate(null)
    setCalDate(new Date())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mon Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultez et gérez votre agenda personnel.
          </p>
        </div>
      </div>

      {/* Main grid: calendar + side panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Calendar */}
        <Card withBorder>
          {/* Legend */}
          <div className="flex flex-col gap-3 px-6 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <PlanningLegend />
          </div>

          {/* Navigation */}
          <div className="flex flex-row flex-wrap items-center justify-between gap-2 px-6 pb-2 pt-4">
            <CalendarHeader label={headerLabel} onPrev={goPrev} onNext={goNext} onToday={goToday} />
          </div>

          {/* Grid */}
          <div className="px-6 pb-6 pt-2">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground">Chargement...</div>
            ) : !myAthleteId ? (
              user?.role === "admin" || user?.role === "coach" ? (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground">
                    Vous n&apos;avez pas de planning personnel. Accédez au planning de vos athlètes depuis leur profil.
                  </p>
                  <Link
                    href="/physio-data/athletes"
                    className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    Voir mes athlètes
                  </Link>
                </div>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  Aucun profil athlète trouvé pour votre compte.
                </div>
              )
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

                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[115px] bg-background p-1" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <DayCell
                    key={i}
                    date={new Date(calYear, calMonth, i + 1)}
                    entriesByDate={entriesByDate}
                    selectedDate={selectedDate}
                    onSelectDay={setSelectedDate}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Side panel */}
        {myAthleteId && (
          <DaySidePanel
            selectedDate={selectedDate}
            entriesByDate={entriesByDate}
            myAthleteId={myAthleteId}
            onRefetch={refetch}
          />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page export                                                        */
/* ------------------------------------------------------------------ */

export default function PlanningPage() {
  return (
    <Suspense fallback={null}>
      <PlanningPageContent />
    </Suspense>
  )
}