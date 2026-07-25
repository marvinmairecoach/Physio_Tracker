"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, Target, Radar as RadarIcon, Check } from "lucide-react"
import { Button, Card, TextInput, Textarea, Badge, Switch } from "@mantine/core"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface TestTypeInfo {
  id: string
  name: string
  category: string
  unit: string
  higherIsBetter: boolean
  normMale: number | null
  normFemale: number | null
}

interface AthleteResult {
  testTypeId: string
  value: number
  date: string
}

export default function CreateBilanPage() {
  const router = useRouter()
  const params = useParams()
  const athleteId = params.id as string

  const [testTypes, setTestTypes] = useState<TestTypeInfo[]>([])
  const [results, setResults] = useState<AthleteResult[]>([])
  const [athleteGender, setAthleteGender] = useState<string | null>(null)
  const [athleteName, setAthleteName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [radarCount, setRadarCount] = useState(6)
  const [showNorms, setShowNorms] = useState(true)
  const [showTeamComparison, setShowTeamComparison] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [athleteRes, typesRes, resultsRes] = await Promise.all([
          fetch(`/api/athletes/${athleteId}`),
          fetch("/api/tests/types"),
          fetch(`/api/athletes/${athleteId}/tests`),
        ])

        if (!athleteRes.ok) { router.push("/athletes"); return }

        const athleteData = await athleteRes.json()
        setAthleteName(`${athleteData.firstName} ${athleteData.lastName}`)
        setAthleteGender(athleteData.gender)

        if (typesRes.ok) {
          const types = await typesRes.json()
          setTestTypes(types.testTypes ?? types ?? [])
        }

        if (resultsRes.ok) {
          const r = await resultsRes.json()
          const allResults = r.results ?? r ?? []
          setResults(Array.isArray(allResults) ? allResults : [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [athleteId])

  // Build latest results per test type
  const latestResults = new Map<string, AthleteResult>()
  for (const r of results) {
    const existing = latestResults.get(r.testTypeId)
    if (!existing || new Date(r.date) > new Date(existing.date)) {
      latestResults.set(r.testTypeId, r)
    }
  }

  // Test types that have data
  const testTypesWithData = testTypes.filter((tt) => latestResults.has(tt.id))

  // Radar data
  const radarData = Array.from(selectedIds)
    .slice(0, radarCount)
    .map((id) => {
      const tt = testTypes.find((t) => t.id === id)
      if (!tt) return null
      const result = latestResults.get(tt.id)
      if (!result) return null
      const val = Number(result.value)
      const norm = athleteGender === "M" ? tt.normMale : athleteGender === "F" ? tt.normFemale : null
      // Normalize to 0-100 for radar display
      const maxVal = Math.max(val, norm ?? 0, 1)
      return {
        name: tt.name,
        Valeur: Math.round((val / maxVal) * 100),
        ...(showNorms && norm ? { Norme: Math.round((norm / maxVal) * 100) } : {}),
      }
    })
    .filter(Boolean)

  const toggleTest = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    if (!title.trim()) { alert("Donnez un titre au bilan"); return }
    if (selectedIds.size === 0) { alert("Sélectionnez au moins un test"); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/athletes/${athleteId}/bilans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          config: {
            selectedTestIds: Array.from(selectedIds),
            radarTestCount: radarCount,
            showNorms,
            showTeamComparison,
          },
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      router.push(`/bilans/${data.bilan.id}`)
    } catch {
      alert("Erreur lors de la création")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>

  const selectedArray = Array.from(selectedIds)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouveau bilan</h1>
          <p className="text-sm text-gray-500">{athleteName}</p>
        </div>
        <Button
          className="ml-auto"
          onClick={handleSave}
          loading={saving}
        >
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Title + desc */}
          <Card shadow="sm" radius="md" withBorder>
            <Card.Section withBorder inheritPadding py="sm">
              <h2 className="text-lg font-semibold">Informations</h2>
            </Card.Section>
            <div className="p-4 space-y-4">
              <TextInput
                label="Titre du bilan"
                placeholder="Bilan pré-saison 2025"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                label="Description (optionnelle)"
                placeholder="Résumé des capacités athlétiques..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </Card>

          {/* Test selection */}
          <Card shadow="sm" radius="md" withBorder>
            <Card.Section withBorder inheritPadding py="sm">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Sélection des tests
              </h2>
              <p className="text-sm text-gray-500">
                {selectedArray.length} test{selectedArray.length > 1 ? "s" : ""} sélectionné{selectedArray.length > 1 ? "s" : ""}
              </p>
            </Card.Section>
            <div className="p-4">
              {testTypesWithData.length === 0 ? (
                <p className="text-center text-gray-400 py-4">
                  Aucun résultat de test enregistré pour cet athlète
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {testTypesWithData.map((tt) => {
                    const result = latestResults.get(tt.id)!
                    const val = Number(result.value)
                    const isSelected = selectedIds.has(tt.id)
                    const norm = athleteGender === "M" ? tt.normMale : athleteGender === "F" ? tt.normFemale : null
                    const beatsNorm = norm !== null && norm !== undefined
                      ? tt.higherIsBetter ? val >= Number(norm) : val <= Number(norm)
                      : null
                    return (
                      <button
                        key={tt.id}
                        onClick={() => toggleTest(tt.id)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:shadow-sm ${
                          isSelected
                            ? "border-blue-300 bg-blue-50 shadow-sm"
                            : "border-gray-200 hover:border-blue-200"
                        }`}
                      >
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"
                        }`}>
                          {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{tt.name}</p>
                          <p className="text-xs text-gray-400">
                            {val.toFixed(1)} {tt.unit}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge color={
                            beatsNorm === true ? "green" : beatsNorm === false ? "orange" : "gray"
                          } variant="light" size="sm">
                            {beatsNorm === true ? "✓ Norme" : beatsNorm === false ? "Sous norme" : "—"}
                          </Badge>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right column: config + preview */}
        <div className="space-y-6">
          {/* Radar config */}
          <Card shadow="sm" radius="md" withBorder>
            <Card.Section withBorder inheritPadding py="sm">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <RadarIcon className="h-4 w-4 text-blue-500" />
                Configuration radar
              </h2>
            </Card.Section>
            <div className="p-4 space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Nombre de tests affichés</label>
                  <span className="text-lg font-bold text-blue-600">{radarCount}</span>
                </div>
                <input
                  type="range"
                  value={radarCount}
                  onChange={(e) => setRadarCount(Number(e.target.value))}
                  min={3}
                  max={Math.max(selectedArray.length, 8)}
                  step={1}
                  className="w-full mt-2"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {Math.min(radarCount, selectedArray.length)}/{selectedArray.length} tests visibles sur le radar
                </p>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium cursor-pointer">Afficher les normes</label>
                <Switch checked={showNorms} onChange={(e) => setShowNorms(e.currentTarget.checked)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium cursor-pointer">Comparaison équipe</label>
                <Switch checked={showTeamComparison} onChange={(e) => setShowTeamComparison(e.currentTarget.checked)} />
              </div>
            </div>
          </Card>

          {/* Radar preview */}
          <Card shadow="sm" radius="md" withBorder>
            <Card.Section withBorder inheritPadding py="xs">
              <h3 className="text-sm font-medium text-gray-400">Aperçu radar</h3>
            </Card.Section>
            <div className="p-4">
              {radarData.length < 3 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <RadarIcon className="h-8 w-8 text-gray-200 mb-2" />
                  <p className="text-xs text-gray-400">
                    Sélectionnez au moins 3 tests pour voir l&apos;aperçu
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e0d4f5" />
                    <PolarAngleAxis dataKey="name" fontSize={10} tick={{ fill: '#6b5b8c' }} />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      fontSize={9}
                      tick={{ fill: '#6b5b8c' }}
                    />
                    <Radar
                      name="Athlète"
                      dataKey="Valeur"
                      stroke="#7c5cbf"
                      fill="#7c5cbf"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    {showNorms && radarData.some((d: any) => d.Norme) && (
                      <Radar
                        name="Norme"
                        dataKey="Norme"
                        stroke="#06b6d4"
                        fill="#06b6d4"
                        fillOpacity={0.1}
                        strokeWidth={2}
                        strokeDasharray="8 4"
                      />
                    )}
                    <Legend
                      formatter={(value: string) => (
                        <span style={{ color: '#4a3f5c', fontWeight: 500, fontSize: 11 }}>{value}</span>
                      )}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}