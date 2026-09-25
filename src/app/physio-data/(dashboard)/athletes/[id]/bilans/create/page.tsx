"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft, Save, Plus, X, Search, FileText, Activity,
  RadarIcon, LayoutList, Check, GripVertical,
  Settings, BarChart3, Eye,
} from "lucide-react"
import {
  Button, Card, TextInput, Textarea, Badge, Switch,
  Modal, Group, Text, ActionIcon, Divider,
} from "@mantine/core"
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from "recharts"
import { BilanModuleRenderer } from "@/components/physio-data/bilan-module-renderer"
import { ErrorBoundary } from "@/components/error-boundary"

/* ---------- Types ---------- */

interface Question {
  id: string
  type: string
  label: string
  options: string
}

interface Module {
  id: string
  title: string
  categories: string[]
  questions: Question[]
  ordering: number
  isActive: boolean
  bilanId: string | null
}

interface TestTypeInfo {
  id: string
  name: string
  category: string
  unit: string
  higherIsBetter: boolean
  normMale: number | null
  normFemale: number | null
  isUnilateral?: boolean
}

interface AthleteResult {
  testTypeId: string
  value: number
  valueLeft?: number
  valueRight?: number
  date: string
}

interface RightPanelItem {
  id: string
  type: "module" | "metric" | "radar" | "textNote"
  refId?: string
  config?: {
    metricIds?: string[]
    testCount?: number
    showNorms?: boolean
    textTitle?: string
    textContent?: string
  }
}

/* ---------- Helpers ---------- */

function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

let _itemCounter = 0
function nextId(prefix: string): string {
  return `${prefix}-${++_itemCounter}-${Date.now()}`
}

/* ---------- Draggable List Component ---------- */

function DraggableList({
  items,
  onReorder,
  children,
}: {
  items: RightPanelItem[]
  onReorder: (newItems: RightPanelItem[]) => void
  children: (item: RightPanelItem, index: number) => React.ReactNode
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(index))
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const srcIdx = Number(e.dataTransfer.getData("text/plain"))
    if (isNaN(srcIdx) || srcIdx === dropIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }
    const arr = Array.from(items)
    const [moved] = arr.splice(srcIdx, 1)
    arr.splice(dropIndex, 0, moved)
    onReorder(arr)
    setDragIndex(null)
    setOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <div className="space-y-4 min-h-[200px]">
      {items.map((item, idx) => (
        <div
          key={item.id}
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={(e) => handleDrop(e, idx)}
          onDragEnd={handleDragEnd}
          style={{
            opacity: dragIndex === idx ? 0.4 : 1,
            borderTop: overIndex === idx && overIndex !== dragIndex
              ? "3px solid #3b82f6"
              : "3px solid transparent",
            transition: "opacity 0.15s, border-color 0.15s",
          }}
          draggable
        >
          {children(item, idx)}
        </div>
      ))}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileText className="h-16 w-16 text-gray-200 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-1">Bilan vierge</h3>
          <p className="text-sm text-gray-400 max-w-md">
            Cliquez sur un module dans le panneau de gauche, ou utilisez
            les boutons &laquo;&nbsp;Ajouter&nbsp;&raquo; pour commencer
            &agrave; construire votre bilan.
          </p>
        </div>
      )}
    </div>
  )
}

/* ---------- Component ---------- */

export default function CreateBilanPage() {
  return (
    <ErrorBoundary>
      <CreateBilanPageInner />
    </ErrorBoundary>
  )
}

function CreateBilanPageInner() {
  const router = useRouter()
  const params = useParams()
  const athleteId = params.id as string
  // Read edit param from URL synchronously
  const [editBilanId, setEditBilanId] = useState<string | null>(null)

  // Data
  const [modules, setModules] = useState<Module[]>([])
  const [testTypes, setTestTypes] = useState<TestTypeInfo[]>([])
  const [results, setResults] = useState<AthleteResult[]>([])
  const [athleteGender, setAthleteGender] = useState<string | null>(null)
  const [athleteName, setAthleteName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [title, setTitle] = useState("")
  const [bilanDate, setBilanDate] = useState(toLocalDateString(new Date()))

  // Right panel items
  const [items, setItems] = useState<RightPanelItem[]>([])

  // Left filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [metricPickerOpen, setMetricPickerOpen] = useState(false)
  const [metricPickerItemId, setMetricPickerItemId] = useState<string | null>(null)
  const [metricPickerTempIds, setMetricPickerTempIds] = useState<Set<string>>(new Set())

  // Module answers
  const [moduleAnswers, setModuleAnswers] = useState<Record<string, Record<string, string>>>({})
  // Test comments
  const [testComments, setTestComments] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      try {
        // Read edit param directly from URL
        const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
        const editId = sp?.get("edit") ?? null
        if (editId !== editBilanId) setEditBilanId(editId)
        
        const [athleteRes, modulesRes, typesRes, resultsRes] = await Promise.all([
          fetch(`/physio-data/api/athletes/${athleteId}`),
          fetch("/physio-data/api/bilans/modules"),
          fetch("/physio-data/api/tests/types"),
          fetch(`/physio-data/api/athletes/${athleteId}/tests`),
        ])

        if (!athleteRes.ok) { router.push("/physio-data/athletes"); return }

        const athleteData = await athleteRes.json()
        setAthleteName(`${athleteData.firstName} ${athleteData.lastName}`)
        setAthleteGender(athleteData.gender)
        setTitle(`Bilan — ${athleteData.firstName} ${athleteData.lastName}`)

        if (modulesRes.ok) {
          const m = await modulesRes.json()
          setModules(m.modules ?? [])
        }

        if (typesRes.ok) {
          const t = await typesRes.json()
          setTestTypes(t.testTypes ?? t ?? [])
        }

        if (resultsRes.ok) {
          const r = await resultsRes.json()
          setResults(Array.isArray(r.results ?? r) ? (r.results ?? r) : [])
        }

        // If editing, load existing bilan data
        if (editId) {
          const bilanRes = await fetch(`/physio-data/api/bilans/${editId}`)
          if (bilanRes.ok) {
            const d = await bilanRes.json()
            const b = d.bilan
            if (b && b.athleteId === athleteId) {
              setTitle(b.title)

              // Reconstruct items from config
              const cfg = b.config || {}
              const newItems: RightPanelItem[] = []

              // Modules
              const modIds: string[] = cfg.selectedModuleIds ?? []
              for (const mid of modIds) {
                newItems.push({ id: nextId("mod"), type: "module", refId: mid })
              }

              // Metric cards
              const mCards: any[] = cfg.metricCards ?? []
              for (const mc of mCards) {
                newItems.push({
                  id: mc.itemId || nextId("met"),
                  type: "metric",
                  config: { metricIds: mc.metricIds ?? [] },
                })
              }

              // Radars
              const rads: any[] = cfg.radars ?? []
              for (const rad of rads) {
                newItems.push({
                  id: rad.itemId || nextId("rad"),
                  type: "radar",
                  config: {
                    metricIds: rad.metricIds ?? [],
                    testCount: rad.testCount ?? 6,
                    showNorms: rad.showNorms ?? true,
                  },
                })
              }

              // Text notes
              const notes: any[] = cfg.textNotes ?? []
              for (const note of notes) {
                newItems.push({
                  id: note.itemId || nextId("note"),
                  type: "textNote",
                  config: {
                    textTitle: note.title ?? "Note",
                    textContent: note.content ?? "",
                  },
                })
              }

              setItems(newItems)
              if (cfg.testComments) setTestComments(cfg.testComments)
              if (cfg.modulesData) setModuleAnswers(cfg.modulesData)
            }
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [athleteId, router])

  // Filtered modules by search (title + categories)
  const filteredModules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return modules.filter((m) => {
      if (!q) return true
      const inTitle = m.title.toLowerCase().includes(q)
      const inCats = (m.categories ?? []).some((c) => c.toLowerCase().includes(q))
      return inTitle || inCats
    })
  }, [modules, searchQuery])

  // Latest results per test type
  const latestResults = useMemo(() => {
    const map = new Map<string, AthleteResult>()
    for (const r of results) {
      const existing = map.get(r.testTypeId)
      if (!existing || new Date(r.date) > new Date(existing.date)) {
        map.set(r.testTypeId, r)
      }
    }
    return map
  }, [results])

  // Test types that have data
  const testTypesWithData = useMemo(() =>
    testTypes.filter((tt) => latestResults.has(tt.id)),
  [testTypes, latestResults])

  const isModuleSelected = useCallback(
    (moduleId: string) => items.some((it) => it.type === "module" && it.refId === moduleId),
    [items]
  )

  // --- Item management ---

  const handleReorder = (newItems: RightPanelItem[]) => {
    setItems(newItems)
  }

  const addModuleItem = (moduleId: string) => {
    setItems((prev) => [...prev, { id: nextId("mod"), type: "module", refId: moduleId }])
  }

  const removeModuleItem = (refId: string) => {
    setItems((prev) => prev.filter((it) => !(it.type === "module" && it.refId === refId)))
  }

  const addMetricCard = () => {
    const id = nextId("met")
    setItems((prev) => [...prev, { id, type: "metric", config: { metricIds: [] } }])
    setMetricPickerItemId(id)
    setMetricPickerTempIds(new Set())
    setMetricPickerOpen(true)
  }

  const removeMetricCardItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId))
  }

  const addRadarItem = () => {
    const id = nextId("rad")
    setItems((prev) => [
      ...prev,
      { id, type: "radar", config: { metricIds: [], testCount: 6, showNorms: true } },
    ])
    setMetricPickerItemId(id)
    setMetricPickerTempIds(new Set())
    setMetricPickerOpen(true)
  }

  const removeRadarItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId))
  }

  const addTextNoteItem = () => {
    const id = nextId("note")
    setItems((prev) => [...prev, {
      id,
      type: "textNote",
      config: { textTitle: "Note", textContent: "" },
    }])
  }

  const removeTextNoteItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId))
  }

  const updateItemConfig = (itemId: string, patch: Partial<RightPanelItem["config"]>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, config: { ...it.config, ...patch } } : it))
    )
  }

  const handleModuleToggle = (moduleId: string) => {
    if (isModuleSelected(moduleId)) {
      removeModuleItem(moduleId)
    } else {
      addModuleItem(moduleId)
    }
  }

  // --- Metric picker modal ---
  const openMetricPicker = (itemId: string) => {
    const item = items.find((it) => it.id === itemId)
    if (!item) return
    setMetricPickerItemId(itemId)
    setMetricPickerTempIds(new Set(item.config?.metricIds ?? []))
    setMetricPickerOpen(true)
  }

  const saveMetricPicker = () => {
    if (!metricPickerItemId) return
    updateItemConfig(metricPickerItemId, {
      metricIds: Array.from(metricPickerTempIds),
    })
    setMetricPickerOpen(false)
    setMetricPickerItemId(null)
  }

  // --- Module answers ---
  const handleModuleAnswer = (moduleId: string, questionId: string, value: string) => {
    setModuleAnswers((prev) => ({
      ...prev,
      [moduleId]: { ...(prev[moduleId] || {}), [questionId]: value },
    }))
  }

  // --- Save ---
  const handleSave = async () => {
    if (!title.trim()) { alert("Le titre est obligatoire"); return }
    if (items.length === 0) { alert("Ajoutez au moins un élément au bilan"); return }

    const orderedModuleIds = items.filter((it) => it.type === "module").map((it) => it.refId!).filter(Boolean)
    const metricCards = items.filter((it) => it.type === "metric").map((it) => ({
      itemId: it.id,
      metricIds: it.config?.metricIds ?? [],
    }))
    const radars = items.filter((it) => it.type === "radar").map((it) => ({
      itemId: it.id,
      metricIds: it.config?.metricIds ?? [],
      testCount: it.config?.testCount ?? 6,
      showNorms: it.config?.showNorms ?? true,
    }))
    const textNotes = items.filter((it) => it.type === "textNote").map((it) => ({
      itemId: it.id,
      title: it.config?.textTitle ?? "Note",
      content: it.config?.textContent ?? "",
    }))
    // Preserve full item order (interleaving) for view rendering
    const itemOrder = items.map((it) => ({
      type: it.type,
      refId: it.refId,
      itemId: it.id,
    }))

    setSaving(true)
    try {
      let bilanId = editBilanId
      if (editBilanId) {
        // Update existing bilan
        const res = await fetch(`/physio-data/api/bilans/${editBilanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: null,
            config: {
              selectedModuleIds: orderedModuleIds,
              metricCards,
              radars,
              textNotes,
              testComments,
              modulesData: moduleAnswers,
              itemOrder,
            },
          }),
        })
        if (!res.ok) throw new Error("Erreur")
      } else {
        // Create new bilan
        const res = await fetch(`/physio-data/api/athletes/${athleteId}/bilans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: null,
            config: {
              selectedModuleIds: orderedModuleIds,
              metricCards,
              radars,
              textNotes,
              testComments,
              modulesData: moduleAnswers,
              itemOrder,
            },
          }),
        })
        if (!res.ok) throw new Error("Erreur")
        const data = await res.json()
        bilanId = data.bilan.id
        // Link modules to the bilan (only for new bilans)
        if (orderedModuleIds.length > 0) {
          await Promise.all(
            orderedModuleIds.map((modId, idx) =>
              fetch(`/physio-data/api/bilans/modules/${modId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bilanId, ordering: idx }),
              })
            )
          )
        }
      }
      router.push(`/physio-data/bilans/${bilanId}/view`)
    } catch (err) {
      console.error(err)
      alert("Erreur lors de la création du bilan")
    } finally {
      setSaving(false)
    }
  }

  // --- Autosave for edit mode ---
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [autosaveStatus, setAutosaveStatus] = useState<"saved" | "saving" | "unsaved" | null>(null)

  // Build a serializable snapshot of all editable data
  const autosavePayload = useMemo(() => ({
    items,
    title,
    testComments,
    moduleAnswers,
  }), [items, title, testComments, moduleAnswers])

  useEffect(() => {
    if (!editBilanId) {
      setAutosaveStatus(null)
      return
    }
    // Mark as unsaved, clear previous timer
    setAutosaveStatus("unsaved")
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)

    // Debounce 2 seconds
    autosaveTimer.current = setTimeout(async () => {
      setAutosaveStatus("saving")
      try {
        const orderedModuleIds = items
          .filter((it) => it.type === "module")
          .map((it) => it.refId!).filter(Boolean)
        const metricCards = items
          .filter((it) => it.type === "metric")
          .map((it) => ({ itemId: it.id, metricIds: it.config?.metricIds ?? [] }))
        const radars = items
          .filter((it) => it.type === "radar")
          .map((it) => ({
            itemId: it.id,
            metricIds: it.config?.metricIds ?? [],
            testCount: it.config?.testCount ?? 6,
            showNorms: it.config?.showNorms ?? true,
          }))
        const textNotes = items
          .filter((it) => it.type === "textNote")
          .map((it) => ({
            itemId: it.id,
            title: it.config?.textTitle ?? "Note",
            content: it.config?.textContent ?? "",
          }))
        const itemOrder = items.map((it) => ({
          type: it.type,
          refId: it.refId,
          itemId: it.id,
        }))

        const res = await fetch(`/physio-data/api/bilans/${editBilanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: null,
            config: { selectedModuleIds: orderedModuleIds, metricCards, radars, textNotes, testComments, modulesData: moduleAnswers, itemOrder },
          }),
        })
        if (!res.ok) throw new Error("Autosave failed")
        setAutosaveStatus("saved")
      } catch (err) {
        console.error("Autosave error:", err)
        setAutosaveStatus("unsaved")
      }
    }, 2000)

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [autosavePayload, editBilanId])

  // --- Derived data ---
  const metricCardItems = useMemo(() => items.filter((it) => it.type === "metric"), [items])
  const radarItems = useMemo(() => items.filter((it) => it.type === "radar"), [items])

  const renderModuleCard = (item: RightPanelItem, idx: number) => {
    const mod = modules.find((m) => m.id === item.refId)
    if (!mod) return null
    return (
      <Card shadow="sm" radius="md" withBorder className="relative" key={item.id}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gray-50/30 rounded-t-md">
          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing shrink-0" />
          <LayoutList className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="font-semibold text-sm flex-1 truncate">{mod.title}</span>
          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeModuleItem(item.refId!)}>
            <X className="h-3.5 w-3.5" />
          </ActionIcon>
        </div>
        <div className="p-4">
          <BilanModuleRenderer
            module={{
              id: mod.id,
              instanceId: mod.id,
              title: mod.title,
              questions: (mod.questions ?? []) as any,
              answers: moduleAnswers[mod.id] || {},
            }}
            onAnswerChange={(questionId, value) => handleModuleAnswer(mod.id, questionId, value)}
          />
        </div>
      </Card>
    )
  }

  const renderMetricCard = (item: RightPanelItem, idx: number) => {
    const metricIds = item.config?.metricIds ?? []
    const hasMetrics = metricIds.length > 0
    return (
      <Card shadow="sm" radius="md" withBorder className="relative" key={item.id}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gray-50/30 rounded-t-md">
          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing shrink-0" />
          <Activity className="h-4 w-4 text-green-500 shrink-0" />
          <span className="font-semibold text-sm flex-1 truncate">
            Métriques {hasMetrics ? `(${metricIds.length})` : ""}
          </span>
          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeMetricCardItem(item.id)}>
            <X className="h-3.5 w-3.5" />
          </ActionIcon>
        </div>
        <div className="p-4 space-y-4">
          <Button variant="light" size="xs" leftSection={<Settings className="h-3 w-3" />} onClick={() => openMetricPicker(item.id)}>
            {hasMetrics ? `Modifier les métriques (${metricIds.length})` : "Choisir les métriques"}
          </Button>
          {hasMetrics && (
            <div className="space-y-3">
              {metricIds.map((id) => {
                const tt = testTypes.find((t) => t.id === id)
                const result = latestResults.get(id)
                if (!tt || !result) return null
                const val = Number(result.value)
                const norm = athleteGender === "M"
                  ? (tt.normMale != null ? Number(tt.normMale) : null)
                  : athleteGender === "F"
                    ? (tt.normFemale != null ? Number(tt.normFemale) : null)
                    : null
                const beatsNorm = norm !== null
                  ? tt.higherIsBetter ? val >= norm : val <= norm
                  : null
                return (
                  <div key={id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <Text size="sm" fw={500}>{tt.name}</Text>
                      <Text size="xs" c="dimmed">{tt.category} &mdash; {tt.unit}</Text>
                    </div>
                    <div className="text-right">
                      <Text fw={700} size="md" c={beatsNorm === false ? "red" : "green"}>
                        {val.toFixed(1)}
                      </Text>
                      {norm !== null && (
                        <Text size="xs" c={beatsNorm === true ? "green" : beatsNorm === false ? "red" : "dimmed"}>
                          Norme: {norm.toFixed(1)}
                        </Text>
                      )}
                    </div>
                    <TextInput
                      placeholder="Commentaire..."
                      size="xs"
                      className="w-32"
                      value={testComments[id] || ''}
                      onChange={(e) => setTestComments((prev) => ({...prev, [id]: e.target.value}))}
                    />
                  </div>
                )
              })}
            </div>
          )}
          {!hasMetrics && (
            <div className="text-center py-4 text-gray-400 text-sm">
              Cliquez sur &ldquo;Choisir les m&eacute;triques&rdquo; pour ajouter des tests
            </div>
          )}
        </div>
      </Card>
    )
  }

  const renderRadarCard = (item: RightPanelItem, idx: number) => {
    const metricIds = item.config?.metricIds ?? []
    const hasEnoughMetrics = metricIds.length >= 3
    return (
      <Card shadow="sm" radius="md" withBorder className="relative" key={item.id}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gray-50/30 rounded-t-md">
          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing shrink-0" />
          <RadarIcon className="h-4 w-4 text-purple-500 shrink-0" />
          <span className="font-semibold text-sm flex-1 truncate">
            Radar {hasEnoughMetrics ? `(${metricIds.length} m&eacute;triques)` : ""}
          </span>
          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeRadarItem(item.id)}>
            <X className="h-3.5 w-3.5" />
          </ActionIcon>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button variant="light" size="xs" leftSection={<Settings className="h-3 w-3" />} onClick={() => openMetricPicker(item.id)}>
              {hasEnoughMetrics ? `Modifier les m&eacute;triques (${metricIds.length})` : "Choisir les m&eacute;triques"}
            </Button>
            {hasEnoughMetrics && (
              <>
                <div className="flex items-center gap-2">
                  <Text size="xs" c="dimmed">Tests:</Text>
                  <input
                    type="range"
                    min={3}
                    max={Math.max(metricIds.length, 6)}
                    value={item.config?.testCount ?? 6}
                    onChange={(e) => updateItemConfig(item.id, { testCount: Number(e.target.value) })}
                    className="w-20"
                  />
                  <Text size="xs" fw={600}>{item.config?.testCount ?? 6}</Text>
                </div>
                <Switch
                  label="Normes"
                  size="xs"
                  checked={item.config?.showNorms ?? true}
                  onChange={(e) => updateItemConfig(item.id, { showNorms: e.currentTarget.checked })}
                />
              </>
            )}
          </div>
          {hasEnoughMetrics ? (
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <RadarChart
                  data={metricIds.slice(0, item.config?.testCount ?? 6).map((id) => {
                    const tt = testTypes.find((t) => t.id === id)
                    const result = latestResults.get(id)
                    if (!tt || !result) return null
                    const val = Number(result.value)
                    const norm = athleteGender === "M" ? tt.normMale : athleteGender === "F" ? tt.normFemale : null
                    const maxVal = Math.max(val, norm ?? 0, 1)
                    return {
                      name: tt.name,
                      Valeur: Math.round((val / maxVal) * 100),
                      ...(item.config?.showNorms && norm ? { Norme: Math.round((Number(norm) / maxVal) * 100) } : {}),
                    }
                  }).filter(Boolean) as any[]}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Athlète" dataKey="Valeur" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
                  {item.config?.showNorms && (
                    <Radar name="Norme" dataKey="Norme" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} />
                  )}
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <Text size="sm">Ajoutez au moins 3 m&eacute;triques pour afficher le radar</Text>
            </div>
          )}
        </div>
      </Card>
    )
  }

  const hasAnySelection = items.length > 0

  const textNoteItems = useMemo(() => items.filter((it) => it.type === "textNote"), [items])

  const renderTextNoteCard = (item: RightPanelItem, idx: number) => {
    return (
      <Card shadow="sm" radius="md" withBorder className="relative" key={item.id}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gray-50/30 rounded-t-md">
          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing shrink-0" />
          <FileText className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="font-semibold text-sm flex-1 truncate">Note</span>
          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeTextNoteItem(item.id)}>
            <X className="h-3.5 w-3.5" />
          </ActionIcon>
        </div>
        <div className="p-4 space-y-3">
          <TextInput
            label="Titre"
            placeholder="Titre de la note"
            size="sm"
            value={item.config?.textTitle ?? ""}
            onChange={(e) => updateItemConfig(item.id, { textTitle: e.target.value })}
          />
          <Textarea
            label="Contenu"
            placeholder="Saisissez votre texte..."
            minRows={4}
            autosize
            value={item.config?.textContent ?? ""}
            onChange={(e) => updateItemConfig(item.id, { textContent: e.target.value })}
          />
        </div>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ---- Fixed Header ---- */}
      <div className="flex items-center gap-4 flex-wrap p-4 border-b bg-white shrink-0">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1 flex-wrap">
          <div className="min-w-[200px]">
            <TextInput
              label="Titre du bilan"
              placeholder="Titre du bilan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="w-40">
            <TextInput
              label="Date"
              type="date"
              value={bilanDate}
              onChange={(e) => setBilanDate(e.target.value)}
            />
          </div>
          <Text size="sm" c="dimmed" className="mt-5">
            {athleteName}
          </Text>
        </div>
        {editBilanId && autosaveStatus === "saving" && (
          <Text size="xs" c="blue" className="mt-5 shrink-0">Sauvegarde automatique...</Text>
        )}
        {editBilanId && autosaveStatus === "saved" && (
          <Text size="xs" c="green" className="mt-5 shrink-0">✓ Enregistré</Text>
        )}
        {editBilanId && autosaveStatus === "unsaved" && (
          <Text size="xs" c="dimmed" className="mt-5 shrink-0">Modifications non sauvegardées</Text>
        )}
        <Button className="mt-5" onClick={handleSave} loading={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {/* ---- Body ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* ====== Left Panel ====== */}
        <aside className="w-80 border-r bg-gray-50/50 overflow-y-auto shrink-0 p-4 space-y-6">
          {/* MÉTRIQUES & RADARS — buttons above everything */}
          <div className="space-y-2">
            <Button
              variant="light"
              size="sm"
              fullWidth
              leftSection={<Activity className="h-4 w-4" />}
              onClick={addMetricCard}
            >
              {metricCardItems.length > 0
                ? `+ Métrique (${metricCardItems.length})`
                : "Ajouter une métrique"}
            </Button>
            <Button
              variant="light"
              size="sm"
              fullWidth
              leftSection={<RadarIcon className="h-4 w-4" />}
              onClick={addRadarItem}
            >
              {radarItems.length > 0
                ? `+ Radar (${radarItems.length})`
                : "Ajouter un radar"}
            </Button>
            <Button
              variant="light"
              size="sm"
              fullWidth
              leftSection={<FileText className="h-4 w-4" />}
              onClick={addTextNoteItem}
            >
              {textNoteItems.length > 0
                ? `+ Note (${textNoteItems.length})`
                : "Ajouter une note"}
            </Button>
          </div>

          {/* Summary */}
          {hasAnySelection && (
            <div className="text-xs text-gray-400 text-center">
              {items.length} élément{items.length > 1 ? "s" : ""} dans le bilan
            </div>
          )}

          {/* Modules section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <LayoutList className="h-4 w-4 text-blue-500" />
                Modules
              </h2>
              <Badge size="sm" variant="light" color="blue">
                {items.filter((it) => it.type === "module").length}
              </Badge>
            </div>

            <TextInput
              placeholder="Rechercher un module ou une catégorie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<Search className="h-3.5 w-3.5" />}
              className="mb-2"
              size="sm"
            />

            {filteredModules.length === 0 ? (
              <Text size="sm" c="dimmed" className="text-center py-4">
                Aucun module trouvé
              </Text>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filteredModules.map((m) => {
                  const selected = isModuleSelected(m.id)
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
                        selected
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => handleModuleToggle(m.id)}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        selected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'}`}>
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.title}</p>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {(m.categories ?? []).length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {(m.categories ?? []).map((cat) => (
                                <Badge key={cat} variant="light" color="gray" size="xs">{cat}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Summary */}
          {hasAnySelection && (
            <div className="text-xs text-gray-400 text-center pt-2 border-t">
              {items.length} élément{items.length > 1 ? "s" : ""} dans le bilan
            </div>
          )}
        </aside>

        {/* ====== Right Panel ====== */}
        <main className="flex-1 overflow-y-auto p-6">
          <DraggableList items={items} onReorder={handleReorder}>
            {(item, idx) => {
              if (item.type === "module") return renderModuleCard(item, idx)
              if (item.type === "metric") return renderMetricCard(item, idx)
              if (item.type === "radar") return renderRadarCard(item, idx)
              if (item.type === "textNote") return renderTextNoteCard(item, idx)
              return null
            }}
          </DraggableList>
        </main>
      </div>

      {/* Metric/Radar picker modal */}
      <Modal
        opened={metricPickerOpen}
        onClose={() => setMetricPickerOpen(false)}
        title="Choisir les métriques"
        size="md"
      >
        <div className="space-y-4 py-2">
          <Text size="sm" c="dimmed">
            Sélectionnez les métriques à afficher :
          </Text>
          {testTypesWithData.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py={4}>
              Aucune métrique disponible pour cet athlète
            </Text>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {testTypesWithData.map((tt) => {
                const isIn = metricPickerTempIds.has(tt.id)
                return (
                  <div
                    key={tt.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                      isIn ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setMetricPickerTempIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(tt.id)) next.delete(tt.id)
                        else next.add(tt.id)
                        return next
                      })
                    }}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isIn ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {isIn && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Text size="sm" fw={500}>{tt.name}</Text>
                      <Text size="xs" c="dimmed">{tt.category} &mdash; {tt.unit}</Text>
                    </div>
                    {(() => {
                      const result = latestResults.get(tt.id)
                      return result ? (
                        <Text size="xs" c="dimmed">{Number(result.value).toFixed(1)}</Text>
                      ) : null
                    })()}
                  </div>
                )
              })}
            </div>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setMetricPickerOpen(false)}>Annuler</Button>
            <Button onClick={saveMetricPicker} disabled={metricPickerTempIds.size === 0}>
              Valider ({metricPickerTempIds.size} métrique{metricPickerTempIds.size > 1 ? "s" : ""})
            </Button>
          </Group>
        </div>
      </Modal>
    </div>
  )
}