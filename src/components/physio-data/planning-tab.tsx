"use client"

import { useCallback, useEffect, useMemo, useState, memo } from "react"
import { Loader2, ChevronLeft, ChevronRight, Plus, X, Copy } from "lucide-react"
import {
  Button,
  Modal,
  Stack,
  NativeSelect,
  TextInput,
  Textarea,
  Group,
  Paper,
  Text,
  ScrollArea,
} from "@mantine/core"

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
  sessionData: string | null
  origin?: string
  teamName?: string | null
}

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const typeColors: Record<string, string> = {
  ENTRAINEMENT: "border-blue-400 bg-blue-50",
  MATCH: "border-green-400 bg-green-50",
  OBJECTIF: "border-amber-400 bg-amber-50",
  REPOS: "border-gray-400 bg-gray-50",
  TEST: "border-cyan-400 bg-cyan-50",
  AUTRE: "border-slate-400 bg-slate-50",
  INDISPONIBILITE: "border-red-400 bg-red-50",
}

const typeLabels: Record<string, string> = {
  ENTRAINEMENT: "Séance",
  MATCH: "Compétition",
  OBJECTIF: "Objectif",
  REPOS: "Repos",
  TEST: "Test",
  AUTRE: "Autre",
  INDISPONIBILITE: "Indisponibilité",
}

const DAY_NAMES = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
]

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
]

/* ------------------------------------------------------------------ */
/* EntryCard                                                         */
/* ------------------------------------------------------------------ */

const EntryCard = memo(function EntryCard({
  entry,
  compact,
  onDelete,
  onCopy,
  onStartEdit,
  editingId,
  editingContent,
  onEditingContentChange,
  onSaveEdit,
  onCancelEdit,
  isSaving,
  isDeleting,
  onOpenWellness,
}: {
  entry: PlanningEntry
  compact?: boolean
  onDelete: (id: string) => void
  onCopy?: (entry: PlanningEntry) => void
  onStartEdit: (entry: PlanningEntry) => void
  editingId: string | null
  editingContent: string
  onEditingContentChange: (val: string) => void
  onSaveEdit: (id: string, content: string) => void
  onCancelEdit: () => void
  isSaving: boolean
  isDeleting: boolean
  onOpenWellness?: (entry: PlanningEntry) => void
}) {
  const isEditing = editingId === entry.id
  const typeLabel = typeLabels[entry.type] ?? entry.type
  const colorClass = typeColors[entry.type] ?? typeColors.AUTRE

  return (
    <div
      className={`rounded border-l-4 ${colorClass} ${compact ? "p-1.5" : "p-2"}`}
    >
      {/* Type badge at top */}
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="inline-block rounded bg-white/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
          {typeLabel}
        </span>
        {!isEditing && (
          <div className="flex items-center gap-2">
            {onCopy && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCopy(entry)
                }}
                className="ml-1 text-gray-400 hover:text-blue-500 flex-shrink-0"
                title="Copier"
              >
                <Copy size={compact ? 10 : 12} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(entry.id)
              }}
              className="text-red-400 hover:text-red-600 flex-shrink-0"
              title="Supprimer"
              disabled={isDeleting}
            >
            {isDeleting ? (
              <Loader2 size={compact ? 10 : 12} className="animate-spin" />
            ) : (
              <X size={compact ? 10 : 12} />
            )}
          </button>
          </div>
        )}
      </div>

      {/* Content: read or edit inline */}
      {isEditing ? (
        <div className="space-y-1">
          <textarea
            autoFocus
            dir="ltr"
            className="w-full rounded border border-blue-300 bg-white p-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            style={{ textAlign: "left" }}
            value={editingContent}
            onChange={(e) => onEditingContentChange(e.target.value)}
            onBlur={() => onSaveEdit(entry.id, editingContent)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onCancelEdit()
              }
            }}
            rows={Math.max(2, (editingContent.match(/\n/g)?.length ?? 0) + 2)}
          />
          {isSaving && (
            <span className="text-[9px] text-blue-500">Sauvegarde...</span>
          )}
        </div>
      ) : (
        <div className="cursor-pointer" onClick={() => onStartEdit(entry)}>
          {entry.notes ? (
            <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
              {entry.notes}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Cliquez pour ajouter du contenu
            </p>
          )}
        </div>
      )}

      {/* Session data summary + questionnaire button */}
      {!isEditing &&
        (entry.type === "ENTRAINEMENT" || entry.type === "MATCH") &&
        onOpenWellness && (
          <div className={`${compact ? "mt-1" : "mt-2"} space-y-1`}>
            {entry.sessionData ? (
              (() => {
                try {
                  const sd: SessionDataPayload = JSON.parse(entry.sessionData)
                  const w = sd.wellness
                  return (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-gray-500">
                      {w && (
                        <span>
                          😴{w.sleep} 🔥{w.mood} 💪{w.physical}
                        </span>
                      )}
                      {sd.rpe !== undefined && (
                        <span>RPE: {sd.rpe}</span>
                      )}
                      {sd.duration !== undefined && (
                        <span>{sd.duration}min</span>
                      )}
                    </div>
                  )
                } catch {
                  return null
                }
              })()
            ) : (
              <div className="text-[9px] text-gray-400 italic">
                Pas encore de données
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenWellness(entry)
              }}
              className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 hover:bg-blue-100 transition-colors"
            >
              Questionnaire
            </button>
          </div>
        )}
    </div>
  )
})

/* ------------------------------------------------------------------ */
/* WellnessModal                                                     */
/* ------------------------------------------------------------------ */

interface SessionDataPayload {
  wellness?: { sleep: number; mood: number; physical: number }
  rpe?: number
  duration?: number
}

function WellnessModal({
  opened,
  onClose,
  entry,
  onSave,
}: {
  opened: boolean
  onClose: () => void
  entry: PlanningEntry | null
  onSave: (id: string, data: SessionDataPayload) => void
}) {
  const [sleep, setSleep] = useState(7)
  const [mood, setMood] = useState(7)
  const [physical, setPhysical] = useState(7)
  const [rpe, setRpe] = useState(5)
  const [duration, setDuration] = useState(45)

  // Load existing data when modal opens
  useEffect(() => {
    if (entry?.sessionData) {
      try {
        const parsed = JSON.parse(entry.sessionData) as SessionDataPayload
        setSleep(parsed.wellness?.sleep ?? 7)
        setMood(parsed.wellness?.mood ?? 7)
        setPhysical(parsed.wellness?.physical ?? 7)
        setRpe(parsed.rpe ?? 5)
        setDuration(parsed.duration ?? 45)
      } catch {
        // reset to defaults
        setSleep(7)
        setMood(7)
        setPhysical(7)
        setRpe(5)
        setDuration(45)
      }
    } else {
      setSleep(7)
      setMood(7)
      setPhysical(7)
      setRpe(5)
      setDuration(45)
    }
  }, [entry?.sessionData, opened])

  if (!entry) return null

  const sliderStyle: React.CSSProperties = {
    width: "100%",
    accentColor: "#3b82f6",
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Questionnaire — ${entry.title}`}
      size="sm"
      trapFocus={false}
    >
      <Stack gap="md">
        {/* Wellness sliders */}
        <Text fw={600} size="sm">
          Bien-être pré-effort
        </Text>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Text size="xs">Sommeil</Text>
            <Text size="xs" fw={700}>
              😴 {sleep}
            </Text>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={sleep}
            onChange={(e) => setSleep(Number(e.target.value))}
            style={sliderStyle}
          />
          <div className="flex justify-between text-[9px] text-gray-400">
            <span>0</span>
            <span>10</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Text size="xs">Moral</Text>
            <Text size="xs" fw={700}>
              🔥 {mood}
            </Text>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            style={sliderStyle}
          />
          <div className="flex justify-between text-[9px] text-gray-400">
            <span>0</span>
            <span>10</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Text size="xs">Physique</Text>
            <Text size="xs" fw={700}>
              💪 {physical}
            </Text>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={physical}
            onChange={(e) => setPhysical(Number(e.target.value))}
            style={sliderStyle}
          />
          <div className="flex justify-between text-[9px] text-gray-400">
            <span>0</span>
            <span>10</span>
          </div>
        </div>

        {/* RPE slider */}
        <div className="border-t border-gray-100 pt-3">
          <Text fw={600} size="sm" mb={4}>
            RPE (charge perçue)
          </Text>
          <div className="flex items-center justify-between mb-1">
            <Text size="xs">RPE</Text>
            <Text size="xs" fw={700}>
              {rpe}
            </Text>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            style={sliderStyle}
          />
          <div className="flex justify-between text-[9px] text-gray-400">
            <span>0 (très facile)</span>
            <span>10 (maximal)</span>
          </div>
        </div>

        {/* Duration */}
        <div className="border-t border-gray-100 pt-3">
          <Text fw={600} size="sm" mb={4}>
            Durée
          </Text>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={600}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-center"
            />
            <Text size="sm" c="dimmed">
              minutes
            </Text>
          </div>
        </div>

        {/* Buttons */}
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              onSave(entry.id, {
                wellness: { sleep, mood, physical },
                rpe,
                duration,
              })
              onClose()
            }}
          >
            Enregistrer
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* PlanningTab                                                       */
/* ------------------------------------------------------------------ */

export default function PlanningTab({
  athleteId,
}: {
  athleteId: string
}) {
  const [entries, setEntries] = useState<PlanningEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"week" | "month" | "list">("week")

  // Date state: weekStart for week view, calDate for month view
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + mondayOffset,
    )
    monday.setHours(0, 0, 0, 0)
    return monday
  })
  const [calDate, setCalDate] = useState(() => new Date())

  const sunday = new Date(weekStart)
  sunday.setDate(sunday.getDate() + 6)

  // Sort mode: affects all views
  const [sortMode, setSortMode] = useState<"date-asc" | "date-desc" | "type">("date-asc")

  // List view: past events toggle & pagination
  const [showPastEvents, setShowPastEvents] = useState(false)
  const [pastPage, setPastPage] = useState(0)
  const PAST_PAGE_SIZE = 10

  // Day modal (month view)
  const [dayModalOpen, setDayModalOpen] = useState(false)
  const [dayModalDateKey, setDayModalDateKey] = useState("")

  // Date picker for navigation
  const [datePickerValue, setDatePickerValue] = useState("")

  // Use current month or week month as the API fetch month
  const monthKey = useMemo(() => {
    if (viewMode === "week") {
      const mid = new Date(weekStart)
      mid.setDate(mid.getDate() + 3)
      return `${mid.getFullYear()}-${String(mid.getMonth() + 1).padStart(2, "0")}`
    }
    return `${calDate.getFullYear()}-${String(calDate.getMonth() + 1).padStart(2, "0")}`
  }, [viewMode, weekStart, calDate])

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [lastDeleted, setLastDeleted] = useState<{
    entry: PlanningEntry
    content: string
  } | null>(null)

  // Wellness modal state
  const [wellnessModalOpen, setWellnessModalOpen] = useState(false)
  const [wellnessEntry, setWellnessEntry] = useState<PlanningEntry | null>(null)

  // Create modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createDate, setCreateDate] = useState("")
  const [createDateEnd, setCreateDateEnd] = useState("")
  const [createHasDateEnd, setCreateHasDateEnd] = useState(false)
  const [createType, setCreateType] = useState("ENTRAINEMENT")
  const [createContent, setCreateContent] = useState("")
  const [creating, setCreating] = useState(false)

  const weekDates = useMemo(() => {
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      dates.push(d)
    }
    return dates
  }, [weekStart])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/physio-data/api/planning?athleteId=${athleteId}&month=${monthKey}`,
      )
      if (res.ok) {
        const data = await res.json()
        setEntries(Array.isArray(data) ? data : data.entries ?? [])
      }
    } catch (err) {
      console.error("Error fetching planning entries:", err)
    } finally {
      setLoading(false)
    }
  }, [athleteId, monthKey])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  function dateKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }

  // Format an API date string for display
  function parseDate(dateStr: string): Date {
    return new Date(dateStr.slice(0, 10) + "T12:00:00")
  }

  // Calculate training load for an entry (RPE × duration)
  function calcSessionLoad(entry: PlanningEntry): number {
    if (!entry.sessionData) return 0
    try {
      const data = JSON.parse(entry.sessionData)
      return (data.rpe ?? 0) * (data.duration ?? 0)
    } catch { return 0 }
  }

  // Sum training load for a set of entries
  function sumLoad(entryList: PlanningEntry[]): number {
    return entryList.reduce((sum, e) => sum + calcSessionLoad(e), 0)
  }

  // Get entries within a date range
  function entriesInRange(start: Date, end: Date): PlanningEntry[] {
    return entries.filter((e) => {
      const d = new Date(e.date)
      return d >= start && d <= end
    })
  }

  // Group by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, PlanningEntry[]>()
    for (const entry of entries) {
      const start = new Date(entry.date)
      const keys: string[] = [dateKey(start)]
      if (entry.dateEnd) {
        const end = new Date(entry.dateEnd)
        const cursor = new Date(start)
        cursor.setDate(cursor.getDate() + 1)
        while (cursor <= end) {
          keys.push(dateKey(cursor))
          cursor.setDate(cursor.getDate() + 1)
        }
      }
      for (const key of keys) {
        const list = map.get(key) ?? []
        list.push(entry)
        map.set(key, list)
      }
    }
    return map
  }, [entries])

  // Sort entries according to current sortMode
  function sortEntries(list: PlanningEntry[]): PlanningEntry[] {
    const sorted = [...list]
    switch (sortMode) {
      case "date-desc":
        sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        break
      case "type":
        sorted.sort((a, b) => {
          const ta = typeLabels[a.type] ?? a.type
          const tb = typeLabels[b.type] ?? b.type
          const cmp = ta.localeCompare(tb)
          if (cmp !== 0) return cmp
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        })
        break
      case "date-asc":
      default:
        sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        break
    }
    return sorted
  }

  // Start inline edit mode
  function startEdit(entry: PlanningEntry) {
    setEditingId(entry.id)
    setEditingContent(entry.notes ?? "")
  }

  // Inline edit: auto-save on blur
  async function saveEdit(entryId: string, content: string) {
    setSavingId(entryId)
    try {
      await fetch(`/physio-data/api/planning/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: content || null }),
      })
      // Update local state
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, notes: content || null } : e,
        ),
      )
    } catch {
      // silencieux
    } finally {
      setSavingId(null)
      setEditingId(null)
      setEditingContent("")
    }
  }

  // Create entry
  async function handleCreate() {
    setCreating(true)
    try {
      const typeLabel = typeLabels[createType] ?? createType
      const body: Record<string, unknown> = {
        athleteId,
        title: typeLabel,
        date: createDate,
        type: createType,
        notes: createContent.trim() || typeLabel,
      }
      if (createHasDateEnd && createDateEnd) {
        body.dateEnd = createDateEnd
      }
      await fetch("/physio-data/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      setCreateModalOpen(false)
      setCreateContent("")
      setCreateDateEnd("")
      setCreateHasDateEnd(false)
      fetchEntries()
    } catch {
      // silencieux
    } finally {
      setCreating(false)
    }
  }

  // Copy an entry to a specific date
  function handleCopy(entry: PlanningEntry) {
    setCreateType(entry.type)
    setCreateContent(entry.notes ?? "")
    setCreateDate(new Date().toISOString().slice(0, 10))
    setCreateDateEnd("")
    setCreateHasDateEnd(false)
    setCreateModalOpen(true)
  }

  async function handleDelete(id: string) {
    // Save entry info for undo before deleting
    const entryToDelete = entries.find((e) => e.id === id)
    if (entryToDelete) {
      const content = entryToDelete.notes ?? ""
      setLastDeleted({ entry: { ...entryToDelete }, content })
      // Auto-clear undo after 10 seconds
      setTimeout(() => {
        setLastDeleted((prev) =>
          prev?.entry.id === id ? null : prev,
        )
      }, 10000)
    }
    setDeletingId(id)
    try {
      const res = await fetch(`/physio-data/api/planning/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(`Delete failed with status ${res.status}`)
      fetchEntries()
    } catch (err) {
      console.error("Error deleting planning entry:", err)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleUndoDelete() {
    if (!lastDeleted) return
    const { entry, content } = lastDeleted
    setLastDeleted(null)
    try {
      await fetch("/physio-data/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: entry.athleteId,
          teamId: entry.teamId,
          title: entry.title,
          date: entry.date,
          dateEnd: entry.dateEnd,
          type: entry.type,
          isObjective: entry.isObjective,
          notes: content,
          origin: entry.origin,
        }),
      })
      fetchEntries()
    } catch (err) {
      console.error("Error undoing delete:", err)
    }
  }

  // ─── Wellness modal handlers ───
  function handleOpenWellness(entry: PlanningEntry) {
    setWellnessEntry(entry)
    setWellnessModalOpen(true)
  }

  async function handleSaveWellness(id: string, data: SessionDataPayload) {
    try {
      await fetch(`/physio-data/api/planning/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionData: data }),
      })
      // Update local state
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, sessionData: JSON.stringify(data) }
            : e,
        ),
      )
    } catch (err) {
      console.error("Error saving wellness data:", err)
    }
  }

  // ──────────────────────────────────────────────
  // Navigation helpers
  // ──────────────────────────────────────────────

  const goToPrevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }
  const goToNextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }
  const goToPrevMonth = () =>
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))
  const goToNextMonth = () =>
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))

  const goToToday = () => {
    const now = new Date()
    const day = now.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + mondayOffset,
    )
    monday.setHours(0, 0, 0, 0)
    setWeekStart(monday)
    setCalDate(new Date())
  }

  const weekLabel = `${weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
  const monthLabel = `${MONTHS[calDate.getMonth()]} ${calDate.getFullYear()}`

  // Calculate training loads
  const weekLoad = useMemo(() => {
    return sumLoad(entriesInRange(weekStart, sunday))
  }, [entries, weekStart])
  const prevWeekStart = useMemo(() => new Date(weekStart.getTime() - 7 * 86400000), [weekStart])
  const prevWeekEnd = useMemo(() => new Date(sunday.getTime() - 7 * 86400000), [sunday])
  const prevWeekLoad = useMemo(() => {
    return sumLoad(entriesInRange(prevWeekStart, prevWeekEnd))
  }, [entries, prevWeekStart, prevWeekEnd])

  // Month calendar helpers
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }
  function getFirstDayOfMonth(year: number, month: number) {
    return (new Date(year, month, 1).getDay() + 6) % 7
  }

  // ──────────────────────────────────────────────
  // View: List
  // ──────────────────────────────────────────────

  function ListView() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayKey = dateKey(today)

    // Separate upcoming and past entries
    const allSorted = useMemo(() => sortEntries(entries), [entries, sortMode])

    const upcomingEntries = useMemo(
      () => allSorted.filter((e) => e.date >= todayKey),
      [allSorted, todayKey],
    )

    const pastEntries = useMemo(
      () => allSorted.filter((e) => e.date < todayKey).reverse(),
      [allSorted, todayKey],
    )

    // Pagination for past events
    const totalPastPages = Math.max(1, Math.ceil(pastEntries.length / PAST_PAGE_SIZE))
    const safePastPage = Math.min(pastPage, totalPastPages - 1)
    const paginatedPast = pastEntries.slice(
      safePastPage * PAST_PAGE_SIZE,
      (safePastPage + 1) * PAST_PAGE_SIZE,
    )

    // Group a list by date for display
    function groupByDate(list: PlanningEntry[]) {
      const groups: { dateKey: string; entries: PlanningEntry[] }[] = []
      for (const entry of list) {
        const datePart = entry.date.slice(0, 10)
        const last = groups[groups.length - 1]
        if (last && last.dateKey === datePart) {
          last.entries.push(entry)
        } else {
          groups.push({ dateKey: datePart, entries: [entry] })
        }
      }
      return groups
    }

    const upcomingGroups = groupByDate(upcomingEntries)
    const pastGroups = groupByDate(paginatedPast)
    const displayList = showPastEvents ? pastGroups : upcomingGroups

    if (entries.length === 0) {
      return (
        <div className="py-12 text-center text-sm text-gray-400">
          Aucune entrée pour ce mois.
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {/* Toggle upcoming / past */}
        <div className="flex items-center gap-2">
          <Button
            variant={!showPastEvents ? "filled" : "subtle"}
            size="compact-xs"
            onClick={() => { setShowPastEvents(false); setPastPage(0) }}
          >
            À venir
          </Button>
          <Button
            variant={showPastEvents ? "filled" : "subtle"}
            size="compact-xs"
            onClick={() => { setShowPastEvents(true); setPastPage(0) }}
          >
            Événements passés ({pastEntries.length})
          </Button>
        </div>

        {/* Entries grouped by date */}
        {displayList.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">
            {showPastEvents ? "Aucun événement passé." : "Aucun événement à venir."}
          </div>
        )}
        <div className="space-y-4">
          {displayList.map((group) => (
            <div key={group.dateKey}>
              {/* Date header */}
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                  {parseDate(group.dateKey).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className="space-y-2">
                {group.entries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="min-w-[80px] text-center flex-shrink-0">
                      <p className="text-xs font-bold text-gray-500">
                        {parseDate(entry.date).toLocaleDateString("fr-FR", {
                          weekday: "short",
                        })}
                      </p>
                      <p className="text-lg font-black text-gray-700">
                        {parseDate(entry.date).getDate()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <EntryCard
                        entry={entry}
                        onDelete={handleDelete}
                        onCopy={handleCopy}
                        onStartEdit={startEdit}
                        editingId={editingId}
                        editingContent={editingContent}
                        onEditingContentChange={setEditingContent}
                        onSaveEdit={saveEdit}
                        onCancelEdit={() => {
                          setEditingId(null)
                          setEditingContent("")
                        }}
                        isSaving={savingId === entry.id}
                        isDeleting={deletingId === entry.id}
                        onOpenWellness={handleOpenWellness}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination for past events */}
        {showPastEvents && pastEntries.length > PAST_PAGE_SIZE && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="subtle"
              size="compact-sm"
              disabled={safePastPage <= 0}
              onClick={() => setPastPage((p) => Math.max(0, p - 1))}
            >
              Précédent
            </Button>
            <span className="text-xs text-gray-500">
              Page {safePastPage + 1} / {totalPastPages}
            </span>
            <Button
              variant="subtle"
              size="compact-sm"
              disabled={safePastPage >= totalPastPages - 1}
              onClick={() => setPastPage((p) => Math.min(totalPastPages - 1, p + 1))}
            >
              Suivant
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin" size={24} />
      </div>
    )
  }

  return (
    <Stack gap="md">
      {/* Navigation + View toggle */}
      <Paper shadow="sm" p="sm" radius="md" withBorder>
        <div className="flex flex-col gap-3">
          {/* First row: navigation + view toggle + add */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Nav buttons */}
            <div className="flex items-center gap-1">
              {viewMode === "week" && (
                <>
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    onClick={goToPrevWeek}
                    leftSection={<ChevronLeft size={14} />}
                  >
                    Sem.
                  </Button>
                  <Button
                    variant="light"
                    size="compact-sm"
                    onClick={goToToday}
                  >
                    Auj.
                  </Button>
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    onClick={goToNextWeek}
                    rightSection={<ChevronRight size={14} />}
                  >
                    Sem.
                  </Button>
                </>
              )}
              {viewMode === "month" && (
                <>
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    onClick={goToPrevMonth}
                    leftSection={<ChevronLeft size={14} />}
                  >
                    Mois
                  </Button>
                  <Button
                    variant="light"
                    size="compact-sm"
                    onClick={goToToday}
                  >
                    Auj.
                  </Button>
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    onClick={goToNextMonth}
                    rightSection={<ChevronRight size={14} />}
                  >
                    Mois
                  </Button>
                </>
              )}
              {viewMode === "list" && (
                <>
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    onClick={goToPrevMonth}
                    leftSection={<ChevronLeft size={14} />}
                  >
                    Mois
                  </Button>
                  <Button
                    variant="light"
                    size="compact-sm"
                    onClick={goToToday}
                  >
                    Auj.
                  </Button>
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    onClick={goToNextMonth}
                    rightSection={<ChevronRight size={14} />}
                  >
                    Mois
                  </Button>
                </>
              )}
              <Text fw={600} size="sm" className="ml-2 min-w-[140px]">
                {viewMode === "week" ? weekLabel : monthLabel}
              </Text>
            </div>

            {/* View toggle + Add */}
            <div className="flex items-center gap-2">
              <Group gap={4}>
                {(["week", "month", "list"] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "filled" : "subtle"}
                    size="compact-xs"
                    onClick={() => setViewMode(mode)}
                  >
                    {mode === "week"
                      ? "Semaine"
                      : mode === "month"
                        ? "Mois"
                        : "Liste"}
                  </Button>
                ))}
              </Group>
              <Button
                size="compact-sm"
                variant="light"
                leftSection={<Plus size={14} />}
                onClick={() => {
                  setCreateDate(new Date().toISOString().slice(0, 10))
                  setCreateType("ENTRAINEMENT")
                  setCreateContent("")
                  setCreateDateEnd("")
                  setCreateHasDateEnd(false)
                  setCreateModalOpen(true)
                }}
              >
                Ajouter
              </Button>
            </div>
          </div>
          {/* Second row: sort + date picker */}
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-2">
            <div className="flex items-center gap-2">
              <Text size="xs" c="dimmed">Trier:</Text>
              <NativeSelect
                size="xs"
                data={[
                  { value: "date-asc", label: "Date ↑" },
                  { value: "date-desc", label: "Date ↓" },
                  { value: "type", label: "Type" },
                ]}
                value={sortMode}
                onChange={(e) => setSortMode(e.currentTarget.value as "date-asc" | "date-desc" | "type")}
                style={{ minWidth: 110 }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Text size="xs" c="dimmed">Aller à:</Text>
              <input
                type="date"
                value={datePickerValue}
                onChange={(e) => {
                  const val = e.currentTarget.value
                  setDatePickerValue(val)
                  if (val) {
                    const targetDate = new Date(val + "T00:00:00")
                    if (viewMode === "week") {
                      // Go to the week containing this date
                      const day = targetDate.getDay()
                      const mondayOffset = day === 0 ? -6 : 1 - day
                      const monday = new Date(
                        targetDate.getFullYear(),
                        targetDate.getMonth(),
                        targetDate.getDate() + mondayOffset,
                      )
                      monday.setHours(0, 0, 0, 0)
                      setWeekStart(monday)
                    } else {
                      // Go to the month containing this date
                      setCalDate(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1))
                    }
                  }
                }}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                style={{ width: 150 }}
              />
            </div>
            {viewMode === "week" && (weekLoad > 0 || prevWeekLoad > 0) && (
              <div className="flex items-center gap-4 ml-auto">
                {prevWeekLoad > 0 && (
                  <Text size="xs" c="dimmed">
                    S. précédente: <span className="font-semibold text-gray-700">{prevWeekLoad}</span>
                  </Text>
                )}
                <Text size="xs" c="dimmed">
                  Charge semaine: <span className="font-semibold text-blue-700">{weekLoad}</span>
                </Text>
                {prevWeekLoad > 0 && weekLoad > 0 && (() => {
                  const pct = Math.round(((weekLoad - prevWeekLoad) / prevWeekLoad) * 100)
                  const isUp = pct > 0
                  const color = isUp ? "text-green-600" : "text-red-500"
                  return (
                    <Text size="xs" className={color}>
                      {isUp ? "↑" : "↓"} {Math.abs(pct)}%
                    </Text>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </Paper>

      {/* ─── WEEK VIEW ─── */}
      {viewMode === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, idx) => {
            const key = dateKey(date)
            const dayEntries = sortEntries(entriesByDate.get(key) ?? [])
            const isToday =
              date.getFullYear() === new Date().getFullYear() &&
              date.getMonth() === new Date().getMonth() &&
              date.getDate() === new Date().getDate()

            return (
              <div
                key={key}
                className={`flex flex-col rounded-lg border min-h-[220px] ${
                  isToday
                    ? "border-blue-400 ring-1 ring-blue-200"
                    : "border-gray-200"
                }`}
              >
                <div
                  className={`px-2 py-1.5 text-center text-xs font-bold ${
                    isToday
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-50 text-gray-600"
                  }`}
                >
                  {DAY_NAMES[idx]}
                  <span className="block text-lg">{date.getDate()}</span>
                </div>
                <div className="flex-1 space-y-1.5 p-1.5 overflow-auto">
                  {dayEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      compact
                      onDelete={handleDelete}
                      onCopy={handleCopy}
                      onStartEdit={startEdit}
                      editingId={editingId}
                      editingContent={editingContent}
                      onEditingContentChange={setEditingContent}
                      onSaveEdit={saveEdit}
                      onCancelEdit={() => {
                        setEditingId(null)
                        setEditingContent("")
                      }}
                      isSaving={savingId === entry.id}
                      isDeleting={deletingId === entry.id}
                      onOpenWellness={handleOpenWellness}
                    />
                  ))}
                  <button
                    onClick={() => {
                      setCreateDate(key)
                      setCreateType("ENTRAINEMENT")
                      setCreateContent("")
                      setCreateDateEnd("")
                      setCreateHasDateEnd(false)
                      setCreateModalOpen(true)
                    }}
                    className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-gray-300 p-1 text-[10px] text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                  >
                    <Plus size={12} />
                    Ajouter
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── MONTH VIEW ─── */}
      {viewMode === "month" && (
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-7 bg-gray-50">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-b"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({
              length: getFirstDayOfMonth(
                calDate.getFullYear(),
                calDate.getMonth(),
              ),
            }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[90px] bg-gray-50/50 p-1 border"
              />
            ))}
            {Array.from({
              length: getDaysInMonth(calDate.getFullYear(), calDate.getMonth()),
            }).map((_, i) => {
              const d = new Date(
                calDate.getFullYear(),
                calDate.getMonth(),
                i + 1,
              )
              const key = dateKey(d)
              const dayEntries = sortEntries(entriesByDate.get(key) ?? [])
              const isToday =
                d.getFullYear() === new Date().getFullYear() &&
                d.getMonth() === new Date().getMonth() &&
                d.getDate() === new Date().getDate()

              return (
                <div
                  key={key}
                  className={`min-h-[90px] p-1 border cursor-pointer ${isToday ? "bg-blue-50" : ""}`}
                  onClick={() => {
                    setDayModalDateKey(key)
                    setDayModalOpen(true)
                  }}
                >
                  <div
                    className={`text-xs font-semibold mb-1 px-1 ${isToday ? "text-blue-700" : "text-gray-500"}`}
                  >
                    {i + 1}
                  </div>
                  <div className="space-y-0.5">
                    {dayEntries.slice(0, 2).map((entry) => {
                      const typeLabelStr =
                        typeLabels[entry.type] ?? entry.type
                      return (
                        <div
                          key={entry.id}
                          className="cursor-pointer rounded border-l-2 px-1 text-[9px] leading-tight truncate"
                          style={{
                            borderLeftColor:
                              typeColors[entry.type]?.match(
                                /border-(\w+-\d+)/,
                              )?.[1] ?? "gray",
                          }}
                          onClick={() => startEdit(entry)}
                          title={entry.notes || undefined}
                        >
                          <span className="font-medium">{typeLabelStr}</span>
                          {entry.notes && (
                            <span className="ml-0.5 text-gray-500">
                              : {entry.notes}
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {dayEntries.length > 2 && (
                      <div
                        className="text-[9px] text-gray-400 px-1 cursor-pointer hover:text-blue-500"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDayModalDateKey(key)
                          setDayModalOpen(true)
                        }}
                      >
                        +{dayEntries.length - 2} autres
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── LIST VIEW ─── */}
      {viewMode === "list" && <ListView />}

      {/* ─── Undo Delete ─── */}
      {lastDeleted && (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <span className="text-sm text-gray-600">
            Entrée supprimée
          </span>
          <Button
            size="compact-sm"
            variant="light"
            color="blue"
            onClick={handleUndoDelete}
          >
            Annuler suppression
          </Button>
        </div>
      )}

      {/* ─── Create Modal ─── */}
      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Nouvelle entrée"
        size="md"
        trapFocus={false}
      >
        <Stack gap="sm">
          <NativeSelect
            label="Type"
            data={[
              { value: "ENTRAINEMENT", label: "Séance" },
              { value: "MATCH", label: "Compétition" },
              { value: "OBJECTIF", label: "Objectif" },
              { value: "REPOS", label: "Repos" },
              { value: "TEST", label: "Test" },
              { value: "AUTRE", label: "Autre" },
              { value: "INDISPONIBILITE", label: "Indisponibilité" },
            ]}
            value={createType}
            onChange={(e) => setCreateType(e.currentTarget.value)}
          />
          <TextInput
            label="Date de début"
            type="date"
            value={createDate}
            onChange={(e) => setCreateDate(e.currentTarget.value)}
            required
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={createHasDateEnd}
              onChange={(e) => setCreateHasDateEnd(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label className="text-sm">Sur plusieurs jours</label>
          </div>
          {createHasDateEnd && (
            <TextInput
              label="Date de fin"
              type="date"
              value={createDateEnd}
              onChange={(e) => setCreateDateEnd(e.currentTarget.value)}
            />
          )}
          <Textarea
            label="Contenu"
            placeholder="Détails de l'événement..."
            value={createContent}
            onChange={(e) => setCreateContent(e.target.value)}
            minRows={3}
            autosize
            autoFocus
            dir="ltr"
          />
          <Group justify="flex-end" mt="xs">
            <Button
              variant="default"
              onClick={() => setCreateModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              loading={creating}
            >
              Ajouter
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ─── Day Modal (Month View) ─── */}
      <Modal
        opened={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        title={`Événements du ${dayModalDateKey ? parseDate(dayModalDateKey).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }) : ""}`}
        size="lg"
      >
        <ScrollArea.Autosize mah="70vh" type="auto">
          <Stack gap="sm">
            {(dayModalDateKey ? sortEntries(entriesByDate.get(dayModalDateKey) ?? []) : []).map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3">
                <EntryCard
                  entry={entry}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                  onStartEdit={startEdit}
                  editingId={editingId}
                  editingContent={editingContent}
                  onEditingContentChange={setEditingContent}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => {
                    setEditingId(null)
                    setEditingContent("")
                  }}
                  isSaving={savingId === entry.id}
                  isDeleting={deletingId === entry.id}
                  onOpenWellness={handleOpenWellness}
                />
              </div>
            ))}
            {dayModalDateKey && (entriesByDate.get(dayModalDateKey) ?? []).length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">
                Aucun événement ce jour.
              </div>
            )}
          </Stack>
        </ScrollArea.Autosize>
      </Modal>

      {/* ─── Wellness Modal ─── */}
      <WellnessModal
        opened={wellnessModalOpen}
        onClose={() => { setWellnessModalOpen(false); setWellnessEntry(null) }}
        entry={wellnessEntry}
        onSave={handleSaveWellness}
      />
    </Stack>
  )
}