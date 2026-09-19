"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft, Save, Plus, X, Search, FileText, Activity,
  RadarIcon, LayoutList, Check, Trash2, GripVertical,
} from "lucide-react"
import {
  Button, Card, TextInput, Textarea, Badge, Switch, Select,
  Modal, Group, Text,
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

/* ---------- Helpers ---------- */

function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
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

  // Selected items in the right panel
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set())
  const [orderedModuleIds, setOrderedModuleIds] = useState<string[]>([])
  const [orderedTestIds, setOrderedTestIds] = useState<string[]>([])
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set())
  const [radarDataConfig, setRadarDataConfig] = useState<{ testIds: string[]; radarCount: number; showNorms: boolean }>({
    testIds: [],
    radarCount: 6,
    showNorms: true,
  })

  // Left filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  // Radar modal
  const [radarModalOpen, setRadarModalOpen] = useState(false)
  const [radarTempIds, setRadarTempIds] = useState<Set<string>>(new Set())

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

  // Toggle module selection
  const toggleModule = (id: string) => {
    setSelectedModuleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setOrderedModuleIds((o) => o.filter((x) => x !== id))
      } else {
        next.add(id)
        setOrderedModuleIds((o) => [...o, id])
      }
      return next
    })
  }

  // Toggle test/metric selection
  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setOrderedTestIds((o) => o.filter((x) => x !== id))
      } else {
        next.add(id)
        setOrderedTestIds((o) => [...o, id])
      }
      return next
    })
  }

  // Drag & drop reorder
  const handleDragEnd = (result: any) => {
    if (!result.destination) return
    const sourceIndex = result.source.index
    const destIndex = result.destination.index
    const droppableId = result.droppableId

    if (droppableId === "modules") {
      setOrderedModuleIds((prev) => {
        const items = Array.from(prev)
        const [moved] = items.splice(sourceIndex, 1)
        items.splice(destIndex, 0, moved)
        return items
      })
    } else if (droppableId === "metrics") {
      setOrderedTestIds((prev) => {
        const items = Array.from(prev)
        const [moved] = items.splice(sourceIndex, 1)
        items.splice(destIndex, 0, moved)
        return items
      })
    }
  }

  // Open radar creation modal
  const openRadarModal = () => {
    setRadarTempIds(new Set(selectedTestIds))
    setRadarModalOpen(true)
  }

  // Save radar
  const saveRadar = () => {
    setRadarDataConfig((prev) => ({
      ...prev,
      testIds: Array.from(radarTempIds).slice(0, radarDataConfig.radarCount),
    }))
    setRadarModalOpen(false)
  }

  // Module answer callback
  const handleModuleAnswer = (moduleId: string, questionId: string, value: string) => {
    setModuleAnswers((prev) => ({
      ...prev,
      [moduleId]: { ...(prev[moduleId] || {}), [questionId]: value },
    }))
  }

  // Save everything
  const handleSave = async () => {
    if (!title.trim()) { alert("Le titre est obligatoire"); return }
    if (selectedModuleIds.size === 0 && selectedTestIds.size === 0 && radarDataConfig.testIds.length === 0) {
      alert("Ajoutez au moins un module, une métrique ou un radar au bilan"); return
    }
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
            radarTestCount: radarDataConfig.radarCount,
            radarTestIds: radarDataConfig.testIds,
            showNorms: radarDataConfig.showNorms,
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
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <LayoutList className="h-4 w-4 text-blue-500" />
              Modules disponibles
            </h2>

            {/* Search */}
            <TextInput
              placeholder="Rechercher un module..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<Search className="h-3.5 w-3.5" />}
              className="mb-2"
              size="sm"
            />

            {/* Tag filters */}
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

            {/* Module list */}
            {filteredModules.length === 0 ? (
              <Text size="sm" c="dimmed" className="text-center py-4">
                Aucun module trouvé
              </Text>
            ) : (
              <div className="space-y-1">
                {filteredModules.map((m) => {
                  const isSelected = selectedModuleIds.has(m.id)
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => toggleModule(m.id)}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'}`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
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
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-green-500" />
              Métriques disponibles
            </h2>
            {testTypesWithData.length === 0 ? (
              <Text size="sm" c="dimmed" className="text-center py-4">
                Aucune métrique enregistrée
              </Text>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {testTypesWithData.map((tt) => {
                  const isSelected = selectedTestIds.has(tt.id)
                  return (
                    <div
                      key={tt.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-green-50 border border-green-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => toggleTest(tt.id)}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-green-600 border-green-600'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
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
        </aside>

        {/* ====== Right Panel ====== */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add radar button */}
                  {selectedTestIds.size >= 3 && (
                    <div className="flex justify-end">
                      <Button variant="light" size="sm" onClick={openRadarModal}>
                        <RadarIcon className="h-4 w-4 mr-1" />
                        Créer un radar
                      </Button>
                    </div>
                  )}

                  {/* No content yet */}
                  {selectedModuleIds.size === 0 && selectedTestIds.size === 0 && radarDataConfig.testIds.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <FileText className="h-16 w-16 text-gray-200 mb-4" />
                      <h3 className="text-lg font-medium text-gray-400 mb-1">
                        Bilan vierge
                      </h3>
                      <p className="text-sm text-gray-400 max-w-md">
                        Sélectionnez des modules et des métriques dans le panneau de gauche
                        pour commencer à construire votre bilan. Vous pouvez aussi créer
                        un radar avec les métriques sélectionnées.
                      </p>
                    </div>
                  )}

                  <DragDropContext onDragEnd={handleDragEnd}>
                    {/* Selected modules */}
                    {orderedModuleIds.length > 0 && (
                      <Droppable droppableId="modules">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                            {orderedModuleIds.map((modId, idx) => {
                              const m = modules.find((x) => x.id === modId)
                              if (!m) return null
                              return (
                                <Draggable key={modId} draggableId={`mod-${modId}`} index={idx}>
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
                                        <div className="absolute top-3 right-3 flex items-center gap-1">
                                          <Button
                                            variant="subtle"
                                            size="sm"
                                            color="red"
                                            onClick={() => toggleModule(modId)}
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                        <Card.Section withBorder inheritPadding py="sm">
                                          <div className="flex items-center gap-2">
                                            <div {...prov.dragHandleProps} className="cursor-grab text-gray-400 hover:text-gray-700">
                                              <GripVertical className="h-5 w-5" />
                                            </div>
                                            <LayoutList className="h-4 w-4 text-blue-500" />
                                            <h3 className="font-semibold">{m.title}</h3>
                                          </div>
                                        </Card.Section>
                                        <div className="p-4">
                                          <BilanModuleRenderer
                                            module={{
                                              id: m.id,
                                              instanceId: m.id,
                                              title: m.title,
                                              questions: (m.questions ?? []) as any,
                                              answers: moduleAnswers[modId] || {},
                                            }}
                                            onAnswerChange={(questionId, value) => handleModuleAnswer(modId, questionId, value)}
                                          />
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
                    )}

                    {/* Selected metrics table */}
                    {orderedTestIds.length > 0 && (
                      <Droppable droppableId="metrics">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef}>
                            <Card shadow="sm" radius="md" withBorder>
                              <Card.Section withBorder inheritPadding py="sm">
                                <h3 className="font-semibold">Métriques sélectionnées</h3>
                              </Card.Section>
                              <div className="p-4">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b text-left text-gray-500">
                                      <th className="pb-2 w-6"></th>
                                      <th className="pb-2 font-medium">Test</th>
                                      <th className="pb-2 font-medium">Valeur</th>
                                      <th className="pb-2 font-medium">Unité</th>
                                      <th className="pb-2 font-medium">Norme</th>
                                      <th className="pb-2"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {orderedTestIds.map((id, idx) => {
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
                                        <Draggable key={id} draggableId={`met-${id}`} index={idx}>
                                          {(prov, snap) => (
                                            <tr
                                              ref={prov.innerRef}
                                              {...prov.draggableProps}
                                              className="border-b last:border-0"
                                              style={{
                                                ...prov.draggableProps.style,
                                                opacity: snap.isDragging ? 0.85 : 1,
                                                background: snap.isDragging ? "#f0f9ff" : undefined,
                                              }}
                                            >
                                              <td className="py-2" {...prov.dragHandleProps}>
                                                <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                                              </td>
                                              <td className="py-2 font-medium">{tt.name}</td>
                                              <td className="py-2">
                                                {tt.isUnilateral && result.valueLeft != null && result.valueRight != null
                                                  ? `G: ${Number(result.valueLeft).toFixed(1)} | D: ${Number(result.valueRight).toFixed(1)}`
                                                  : `${val.toFixed(1)}`
                                                }
                                              </td>
                                              <td className="py-2 text-gray-500">{tt.unit}</td>
                                              <td className="py-2">
                                                <span className={beatsNorm === true ? 'text-green-600' : beatsNorm === false ? 'text-red-600' : 'text-gray-400'}>
                                                  {norm !== null ? `${norm.toFixed(1)} ${tt.unit}` : "—"}
                                                </span>
                                              </td>
                                              <td className="py-2">
                                                <TextInput
                                                  placeholder="Commentaire..."
                                                  size="xs"
                                                  value={testComments[id] || ''}
                                                  onChange={(e) => setTestComments((prev) => ({...prev, [id]: e.target.value}))}
                                                />
                                              </td>
                                            </tr>
                                          )}
                                        </Draggable>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </Card>
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    )}
                  </DragDropContext>

          {/* Radar chart */}
          {radarDataConfig.testIds.length >= 3 && (
            <Card shadow="sm" radius="md" withBorder>
              <Card.Section withBorder inheritPadding py="sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <RadarIcon className="h-4 w-4 text-purple-500" />
                    Radar des performances
                  </h3>
                  <Button variant="subtle" size="xs" color="red" onClick={() => setRadarDataConfig((prev) => ({ ...prev, testIds: [] }))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </Card.Section>
              <div className="p-4">
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <RadarChart data={
                      radarDataConfig.testIds.map((id) => {
                        const tt = testTypes.find((t) => t.id === id)
                        const result = latestResults.get(id)
                        if (!tt || !result) return null
                        const val = Number(result.value)
                        const norm = athleteGender === "M" ? tt.normMale : athleteGender === "F" ? tt.normFemale : null
                        const maxVal = Math.max(val, norm ?? 0, 1)
                        return {
                          name: tt.name,
                          Valeur: Math.round((val / maxVal) * 100),
                          ...(radarDataConfig.showNorms && norm ? { Norme: Math.round((Number(norm) / maxVal) * 100) } : {}),
                        }
                      }).filter(Boolean) as any[]
                    }>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" fontSize={11} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Athlète" dataKey="Valeur" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
                      {radarDataConfig.showNorms && (
                        <Radar name="Norme" dataKey="Norme" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} />
                      )}
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* Radar creation modal */}
      <Modal
        opened={radarModalOpen}
        onClose={() => setRadarModalOpen(false)}
        title="Créer un radar"
        size="md"
      >
        <div className="space-y-4 py-2">
          <Text size="sm" c="dimmed">
            Sélectionnez les métriques à inclure dans le radar (minimum 3, max{" "}
            {radarDataConfig.radarCount}):
          </Text>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {Array.from(selectedTestIds).map((id) => {
              const tt = testTypes.find((t) => t.id === id)
              if (!tt) return null
              const isIn = radarTempIds.has(id)
              return (
                <div
                  key={id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                    isIn ? 'bg-purple-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setRadarTempIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(id)) next.delete(id)
                      else next.add(id)
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
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Nombre de métriques :</span>
            <input
              type="range"
              min="3"
              max={selectedTestIds.size}
              value={radarDataConfig.radarCount}
              onChange={(e) => setRadarDataConfig((prev) => ({ ...prev, radarCount: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-sm">{radarDataConfig.radarCount}</span>
          </div>
          <Switch
            label="Afficher les normes"
            checked={radarDataConfig.showNorms}
            onChange={(e) => setRadarDataConfig((prev) => ({ ...prev, showNorms: e.currentTarget.checked }))}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRadarModalOpen(false)}>Annuler</Button>
            <Button onClick={saveRadar} disabled={radarTempIds.size < 3}>
              Ajouter le radar
            </Button>
          </Group>
        </div>
      </Modal>
    </div>
  )
}