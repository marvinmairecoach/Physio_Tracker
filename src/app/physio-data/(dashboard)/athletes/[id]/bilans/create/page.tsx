"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft, Save, Plus, X, Search, FileText, Activity,
  RadarIcon, LayoutList, Check, Trash2, GripVertical,
  Settings, BarChart3,
} from "lucide-react"
import {
  Button, Card, TextInput, Textarea, Badge, Switch, Select,
  Modal, Group, Text, NumberInput, ActionIcon,
} from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from "recharts"
import { BilanModuleRenderer } from "@/components/physio-data/bilan-module-renderer"

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
  tags: string[]
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

/** A generic item on the right panel — can be a module, a metric group, or a radar */
interface RightPanelItem {
  id: string
  type: "module" | "metric" | "radar"
  /** for modules: module id; for metrics: single test type id; for radars: empty initially */
  refId?: string
  /** Metric/radar-specific config */
  config?: {
    metricIds?: string[]     // which test types to show
    testCount?: number       // how many tests for radar
    showNorms?: boolean
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
function nextItemId(prefix: string): string {
  return `${prefix}-${++_itemCounter}-${Date.now()}`
}

/* ---------- Component ---------- */

export default function CreateBilanPage() {
  const router = useRouter()
  const params = useParams()
  const athleteId = params.id as string

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

  // Right panel items — unified list that supports all types
  const [items, setItems] = useState<RightPanelItem[]>([])

  // Left filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  // Radar metric picker modal (shared across all radar items)
  const [radarPickerOpen, setRadarPickerOpen] = useState(false)
  const [radarPickerItemId, setRadarPickerItemId] = useState<string | null>(null)
  const [radarPickerTempIds, setRadarPickerTempIds] = useState<Set<string>>(new Set())

  // Module answers
  const [moduleAnswers, setModuleAnswers] = useState<Record<string, Record<string, string>>>({})
  // Test comments
  const [testComments, setTestComments] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      try {
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
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [athleteId, router])

  // All available tags from modules
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    for (const m of modules) {
      for (const t of (m.tags ?? [])) tags.add(t)
    }
    return Array.from(tags).sort()
  }, [modules])

  // Filtered modules by search + tags
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!m.title.toLowerCase().includes(q)) return false
      }
      if (selectedTags.size > 0) {
        const moduleTagSet = new Set(m.tags ?? [])
        for (const tag of selectedTags) {
          if (!moduleTagSet.has(tag)) return false
        }
      }
      return true
    })
  }, [modules, searchQuery, selectedTags])

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

  // Test types that have data (available metrics)
  const testTypesWithData = useMemo(() =>
    testTypes.filter((tt) => latestResults.has(tt.id)),
  [testTypes, latestResults])

  // Helper: is a given module/test already selected?
  const isModuleSelected = useCallback(
    (moduleId: string) => items.some((it) => it.type === "module" && it.refId === moduleId),
    [items]
  )
  const isTestSelected = useCallback(
    (testId: string) => items.some((it) => it.type === "metric" && it.refId === testId),
    [items]
  )

  // --- Item management (add / remove) ---

  const addModuleItem = (moduleId: string) => {
    setItems((prev) => [...prev, { id: nextItemId("mod"), type: "module", refId: moduleId }])
  }

  const removeModuleItem = (refId: string) => {
    setItems((prev) => prev.filter((it) => !(it.type === "module" && it.refId === refId)))
  }

  const addMetricItem = (testId: string) => {
    setItems((prev) => [...prev, { id: nextItemId("met"), type: "metric", refId: testId }])
  }

  const removeMetricItem = (refId: string) => {
    setItems((prev) => prev.filter((it) => !(it.type === "metric" && it.refId === refId)))
  }

  const addRadarItem = () => {
    const id = nextItemId("rad")
    setItems((prev) => [
      ...prev,
      {
        id,
        type: "radar",
        config: { metricIds: [], testCount: 6, showNorms: true },
      },
    ])
    // Immediately open the metric picker
    setRadarPickerItemId(id)
    setRadarPickerTempIds(new Set())
    setRadarPickerOpen(true)
  }

  const removeRadarItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId))
  }

  const updateRadarConfig = (itemId: string, patch: Partial<RightPanelItem["config"]>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, config: { ...it.config, ...patch } } : it))
    )
  }

  // --- Drag & drop ---

  const handleDragEnd = (result: any) => {
    if (!result.destination) return
    const droppableId = result.droppableId
    // Only one droppable: "items"
    if (droppableId !== "items") return
    setItems((prev) => {
      const arr = Array.from(prev)
      const [moved] = arr.splice(result.source.index, 1)
      arr.splice(result.destination.index, 0, moved)
      return arr
    })
  }

  // --- Radar metric picker ---

  const openRadarPicker = (itemId: string) => {
    const item = items.find((it) => it.id === itemId)
    if (!item) return
    setRadarPickerItemId(itemId)
    setRadarPickerTempIds(new Set(item.config?.metricIds ?? []))
    setRadarPickerOpen(true)
  }

  const saveRadarPicker = () => {
    if (!radarPickerItemId) return
    const testCount = items.find((it) => it.id === radarPickerItemId)?.config?.testCount ?? 6
    updateRadarConfig(radarPickerItemId, {
      metricIds: Array.from(radarPickerTempIds).slice(0, testCount),
    })
    setRadarPickerOpen(false)
    setRadarPickerItemId(null)
  }

  // --- Toggle helpers for left panel ---

  const handleModuleToggle = (moduleId: string) => {
    if (isModuleSelected(moduleId)) {
      removeModuleItem(moduleId)
    } else {
      addModuleItem(moduleId)
    }
  }

  const handleMetricToggle = (testId: string) => {
    if (isTestSelected(testId)) {
      removeMetricItem(testId)
    } else {
      addMetricItem(testId)
    }
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
    const orderedTestIds = items.filter((it) => it.type === "metric").map((it) => it.refId!).filter(Boolean)
    const radars = items.filter((it) => it.type === "radar").map((it) => ({
      itemId: it.id,
      metricIds: it.config?.metricIds ?? [],
      testCount: it.config?.testCount ?? 6,
      showNorms: it.config?.showNorms ?? true,
    }))

    setSaving(true)
    try {
      const res = await fetch(`/physio-data/api/athletes/${athleteId}/bilans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: null,
          config: {
            selectedModuleIds: orderedModuleIds,
            selectedTestIds: orderedTestIds,
            testComments,
            radars,
            showNorms: true,
            modulesData: moduleAnswers,
          },
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      // Link modules to the bilan
      if (orderedModuleIds.length > 0) {
        await Promise.all(
          orderedModuleIds.map((modId, idx) =>
            fetch(`/physio-data/api/bilans/modules/${modId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bilanId: data.bilan.id, ordering: idx }),
            })
          )
        )
      }
      router.push(`/physio-data/bilans/${data.bilan.id}`)
    } catch (err) {
      console.error(err)
      alert("Erreur lors de la création du bilan")
    } finally {
      setSaving(false)
    }
  }

  // --- Get data for rendering right-panel cards ---
  const selectedModules = useMemo(
    () => items.filter((it) => it.type === "module").map((it) => ({
      item: it,
      module: modules.find((m) => m.id === it.refId),
    })).filter((x) => x.module),
    [items, modules]
  )

  const selectedMetrics = useMemo(
    () => items.filter((it) => it.type === "metric").map((it) => ({
      item: it,
      testType: testTypes.find((t) => t.id === it.refId),
    })).filter((x) => x.testType),
    [items, testTypes]
  )

  const radarItems = useMemo(
    () => items.filter((it) => it.type === "radar"),
    [items]
  )

  const hasContent = items.length > 0

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
        <Button className="mt-5" onClick={handleSave} loading={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {/* ---- Body: Left Panel + Right Panel ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* ====== Left Panel ====== */}
        <aside className="w-80 border-r bg-gray-50/50 overflow-y-auto shrink-0 p-4 space-y-6">
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
              placeholder="Rechercher un module..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<Search className="h-3.5 w-3.5" />}
              className="mb-2"
              size="sm"
            />

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.has(tag) ? "filled" : "light"}
                    color="blue"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      setSelectedTags((prev) => {
                        const next = new Set(prev)
                        if (next.has(tag)) next.delete(tag)
                        else next.add(tag)
                        return next
                      })
                    }
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

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
                          {(m.tags ?? []).map((tag) => (
                            <Badge key={tag} variant="light" color="gray" size="xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Metrics section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                Métriques
              </h2>
              <Badge size="sm" variant="light" color="green">
                {items.filter((it) => it.type === "metric").length}
              </Badge>
            </div>
            {testTypesWithData.length === 0 ? (
              <Text size="sm" c="dimmed" className="text-center py-4">
                Aucune métrique enregistrée
              </Text>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {testTypesWithData.map((tt) => {
                  const selected = isTestSelected(tt.id)
                  return (
                    <div
                      key={tt.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        selected
                          ? 'bg-green-50 border border-green-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => handleMetricToggle(tt.id)}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        selected
                          ? 'bg-green-600 border-green-600'
                          : 'border-gray-300'
                      }`}>
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tt.name}</p>
                        <p className="text-xs text-gray-400">{tt.category}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Radars section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <RadarIcon className="h-4 w-4 text-purple-500" />
                Radars
              </h2>
              <Badge size="sm" variant="light" color="purple">
                {items.filter((it) => it.type === "radar").length}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              Créez un ou plusieurs radars avec les métriques de votre choix.
            </div>
            <Button
              variant="light"
              size="sm"
              fullWidth
              leftSection={<Plus className="h-3.5 w-3.5" />}
              onClick={addRadarItem}
            >
              Ajouter un radar
            </Button>
          </div>
        </aside>

        {/* ====== Right Panel ====== */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Always render DragDropContext — never conditionally */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="items">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4 min-h-[200px]"
                >
                  {!hasContent && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <FileText className="h-16 w-16 text-gray-200 mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-1">
                        Bilan vierge
                      </h3>
                      <p className="text-sm text-gray-400 max-w-md">
                        Cliquez sur les éléments dans le panneau de gauche
                        pour les ajouter à ce bilan. Vous pouvez réordonner
                        chaque élément par drag & drop et les supprimer
                        individuellement.
                      </p>
                    </div>
                  )}

                  {/* RENDER MODULES */}
                  {selectedModules.map(({ item, module }, idx) => (
                    <Draggable key={item.id} draggableId={item.id} index={idx}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          style={{
                            ...prov.draggableProps.style,
                            opacity: snap.isDragging ? 0.85 : 1,
                          }}
                        >
                          <Card shadow="sm" radius="md" withBorder className="relative">
                            <Card.Section withBorder inheritPadding py="sm">
                              <div className="flex items-center justify-between pr-12">
                                <div className="flex items-center gap-2">
                                  <div {...prov.dragHandleProps} className="cursor-grab text-gray-400 hover:text-gray-700">
                                    <GripVertical className="h-5 w-5" />
                                  </div>
                                  <LayoutList className="h-4 w-4 text-blue-500" />
                                  <h3 className="font-semibold">{module!.title}</h3>
                                </div>
                              </div>
                            </Card.Section>
                            {/* X button — properly aligned, outside the section padding */}
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => removeModuleItem(item.refId!)}
                              className="absolute top-3 right-3"
                            >
                              <X className="h-3.5 w-3.5" />
                            </ActionIcon>
                            <div className="p-4">
                              <BilanModuleRenderer
                                module={{
                                  id: module!.id,
                                  instanceId: module!.id,
                                  title: module!.title,
                                  questions: (module!.questions ?? []) as any,
                                  answers: moduleAnswers[module!.id] || {},
                                }}
                                onAnswerChange={(questionId, value) => handleModuleAnswer(module!.id, questionId, value)}
                              />
                            </div>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {/* RENDER METRICS */}
                  {selectedMetrics.map(({ item, testType }, idx) => {
                    const actualIdx = selectedModules.length + idx
                    const result = latestResults.get(testType!.id)
                    const val = result ? Number(result.value) : 0
                    const norm = athleteGender === "M"
                      ? (testType!.normMale != null ? Number(testType!.normMale) : null)
                      : athleteGender === "F"
                        ? (testType!.normFemale != null ? Number(testType!.normFemale) : null)
                        : null
                    const beatsNorm = norm !== null
                      ? testType!.higherIsBetter ? val >= norm : val <= norm
                      : null
                    return (
                      <Draggable key={item.id} draggableId={item.id} index={actualIdx}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            style={{
                              ...prov.draggableProps.style,
                              opacity: snap.isDragging ? 0.85 : 1,
                            }}
                          >
                            <Card shadow="sm" radius="md" withBorder className="relative">
                              <Card.Section withBorder inheritPadding py="sm">
                                <div className="flex items-center justify-between pr-12">
                                  <div className="flex items-center gap-2">
                                    <div {...prov.dragHandleProps} className="cursor-grab text-gray-400 hover:text-gray-700">
                                      <GripVertical className="h-5 w-5" />
                                    </div>
                                    <Activity className="h-4 w-4 text-green-500" />
                                    <h3 className="font-semibold">{testType!.name}</h3>
                                  </div>
                                </div>
                              </Card.Section>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="sm"
                                onClick={() => removeMetricItem(item.refId!)}
                                className="absolute top-3 right-3"
                              >
                                <X className="h-3.5 w-3.5" />
                              </ActionIcon>
                              <div className="p-4 space-y-3">
                                {/* Value display */}
                                <div className="flex items-center gap-4">
                                  <div>
                                    <Text size="xs" c="dimmed">Valeur</Text>
                                    <Text fw={700} size="xl" c={beatsNorm === false ? "red" : "green"}>
                                      {val.toFixed(1)}
                                      <Text span size="sm" c="dimmed" className="ml-1">
                                        {testType!.unit}
                                      </Text>
                                    </Text>
                                    {testType!.isUnilateral && result?.valueLeft != null && result?.valueRight != null && (
                                      <Text size="xs" c="dimmed">
                                        G: {Number(result.valueLeft).toFixed(1)} | D: {Number(result.valueRight).toFixed(1)}
                                      </Text>
                                    )}
                                  </div>
                                  {norm !== null && (
                                    <div>
                                      <Text size="xs" c="dimmed">Norme</Text>
                                      <Text fw={600} size="md" c={beatsNorm === true ? "green" : beatsNorm === false ? "red" : "dimmed"}>
                                        {norm.toFixed(1)} {testType!.unit}
                                      </Text>
                                    </div>
                                  )}
                                </div>
                                {/* Comment */}
                                <TextInput
                                  placeholder="Commentaire..."
                                  size="sm"
                                  value={testComments[testType!.id] || ''}
                                  onChange={(e) => setTestComments((prev) => ({...prev, [testType!.id]: e.target.value}))}
                                />
                              </div>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    )
                  })}

                  {/* RENDER RADARS */}
                  {radarItems.map((item, idx) => {
                    const actualIdx = selectedModules.length + selectedMetrics.length + idx
                    const metricIds = item.config?.metricIds ?? []
                    const hasEnoughMetrics = metricIds.length >= 3
                    return (
                      <Draggable key={item.id} draggableId={item.id} index={actualIdx}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            style={{
                              ...prov.draggableProps.style,
                              opacity: snap.isDragging ? 0.85 : 1,
                            }}
                          >
                            <Card shadow="sm" radius="md" withBorder className="relative">
                              <Card.Section withBorder inheritPadding py="sm">
                                <div className="flex items-center justify-between pr-12">
                                  <div className="flex items-center gap-2">
                                    <div {...prov.dragHandleProps} className="cursor-grab text-gray-400 hover:text-gray-700">
                                      <GripVertical className="h-5 w-5" />
                                    </div>
                                    <RadarIcon className="h-4 w-4 text-purple-500" />
                                    <h3 className="font-semibold">Radar</h3>
                                    {hasEnoughMetrics && (
                                      <Badge size="sm" variant="light" color="purple">
                                        {metricIds.length} métriques
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </Card.Section>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="sm"
                                onClick={() => removeRadarItem(item.id)}
                                className="absolute top-3 right-3"
                              >
                                <X className="h-3.5 w-3.5" />
                              </ActionIcon>
                              <div className="p-4 space-y-4">
                                {/* Config bar */}
                                <div className="flex items-center gap-4 flex-wrap">
                                  <Button
                                    variant="light"
                                    size="xs"
                                    leftSection={<Settings className="h-3 w-3" />}
                                    onClick={() => openRadarPicker(item.id)}
                                  >
                                    {hasEnoughMetrics
                                      ? `Modifier les métriques (${metricIds.length})`
                                      : "Choisir les métriques"}
                                  </Button>
                                  <div className="flex items-center gap-2">
                                    <Text size="xs" c="dimmed">Tests:</Text>
                                    <input
                                      type="range"
                                      min={3}
                                      max={Math.max(metricIds.length, 6)}
                                      value={item.config?.testCount ?? 6}
                                      onChange={(e) => updateRadarConfig(item.id, { testCount: Number(e.target.value) })}
                                      className="w-20"
                                    />
                                    <Text size="xs" fw={600}>{item.config?.testCount ?? 6}</Text>
                                  </div>
                                  <Switch
                                    label="Normes"
                                    size="xs"
                                    checked={item.config?.showNorms ?? true}
                                    onChange={(e) => updateRadarConfig(item.id, { showNorms: e.currentTarget.checked })}
                                  />
                                </div>

                                {/* Radar chart */}
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
                                            ...(item.config?.showNorms && norm
                                              ? { Norme: Math.round((Number(norm) / maxVal) * 100) }
                                              : {}),
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
                                    <Text size="sm">
                                      Cliquez sur &ldquo;Choisir les métriques&rdquo; pour configurer ce radar
                                      (minimum 3 métriques requises)
                                    </Text>
                                  </div>
                                )}
                              </div>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    )
                  })}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </main>
      </div>

      {/* Radar metric picker modal */}
      <Modal
        opened={radarPickerOpen}
        onClose={() => setRadarPickerOpen(false)}
        title="Choisir les métriques du radar"
        size="md"
      >
        <div className="space-y-4 py-2">
          <Text size="sm" c="dimmed">
            Sélectionnez les métriques à inclure dans ce radar :
          </Text>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {testTypesWithData.map((tt) => {
              const isIn = radarPickerTempIds.has(tt.id)
              return (
                <div
                  key={tt.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                    isIn ? 'bg-purple-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setRadarPickerTempIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(tt.id)) next.delete(tt.id)
                      else next.add(tt.id)
                      return next
                    })
                  }}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isIn ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                  }`}>
                    {isIn && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm">{tt.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{tt.category}</span>
                </div>
              )
            })}
          </div>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRadarPickerOpen(false)}>Annuler</Button>
            <Button onClick={saveRadarPicker} disabled={radarPickerTempIds.size < 3}>
              {radarPickerTempIds.size < 3
                ? `Minimum 3 métriques (${radarPickerTempIds.size}/3)`
                : `Valider (${radarPickerTempIds.size} métriques)`}
            </Button>
          </Group>
        </div>
      </Modal>
    </div>
  )
}