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
  REATHLETISATION: "border-purple-400 bg-purple-50",
  REPOS: "border-gray-400 bg-gray-50",
  TEST: "border-cyan-400 bg-cyan-50",
  AUTRE: "border-slate-400 bg-slate-50",
  INDISPONIBILITE: "border-red-400 bg-red-50",
}

const typeLabels: Record<string, string> = {
  ENTRAINEMENT: "Entraînement",
  MATCH: "Match",
  OBJECTIF: "Objectif",
  REATHLETISATION: "Réathlétisation",
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
          <div className="flex items-center gap-0.5">
            {onCopy && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCopy(entry)
                }}
                className="text-gray-400 hover:text-blue-500 flex-shrink-0"
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
    </div>
  )
})

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

  // Inline edit: open edit mode
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
    if (!createContent.trim()) return
    setCreating(true)
    try {
      const typeLabel = typeLabels[createType] ?? createType
      const body: Record<string, unknown> = {
        athleteId,
        title: typeLabel,
        date: createDate,
        type: createType,
        notes: createContent.trim(),
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
    // Sort entries by date ascending
    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    if (sorted.length === 0) {
      return (
        <div className="py-12 text-center text-sm text-gray-400">
          Aucune entrée pour ce mois.
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {sorted.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="min-w-[80px] text-center">
              <p className="text-xs font-bold">
                {new Date(entry.date).toLocaleDateString("fr-FR", {
                  weekday: "short",
                })}
              </p>
              <p className="text-lg font-black">
                {new Date(entry.date).getDate()}
              </p>
            </div>
            <div className="flex-1">
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
              />
            </div>
          </div>
        ))}
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
      </Paper>

      {/* ─── WEEK VIEW ─── */}
      {viewMode === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, idx) => {
            const key = dateKey(date)
            const dayEntries = entriesByDate.get(key) ?? []
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
              const dayEntries = entriesByDate.get(key) ?? []
              const isToday =
                d.getFullYear() === new Date().getFullYear() &&
                d.getMonth() === new Date().getMonth() &&
                d.getDate() === new Date().getDate()

              return (
                <div
                  key={key}
                  className={`min-h-[90px] p-1 border ${isToday ? "bg-blue-50" : ""}`}
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
                      <div className="text-[9px] text-gray-400 px-1">
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
              { value: "ENTRAINEMENT", label: "Entraînement" },
              { value: "MATCH", label: "Match" },
              { value: "OBJECTIF", label: "Objectif" },
              { value: "REATHLETISATION", label: "Réathlétisation" },
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
              disabled={!createContent.trim()}
            >
              Ajouter
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}