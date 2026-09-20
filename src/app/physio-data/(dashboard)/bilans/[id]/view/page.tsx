"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft, FileText, Printer, Mail, Trash2, Edit3,
  LayoutList, Activity, RadarIcon, EyeOff,
} from "lucide-react"
import { Button, Card, Text, Badge, Switch, Modal, Group, TextInput } from "@mantine/core"
import { ErrorBoundary } from "@/components/error-boundary"
import { BilanModuleRenderer, type ModuleData } from "@/components/physio-data/bilan-module-renderer"
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from "recharts"
import { useSession } from "@/components/layout/providers"

interface BilanAthlete {
  id: string
  firstName: string
  lastName: string
  gender: string | null
  birthDate: string | null
  email: string | null
}

interface TestTypeFull {
  id: string
  name: string
  category: string
  unit: string
  higherIsBetter: boolean
  normMale: number | null
  normFemale: number | null
  isUnilateral?: boolean
}

interface ResultValue {
  testTypeId: string
  value: number
  valueLeft?: number
  valueRight?: number
  date: string
}

interface BilanData {
  id: string
  title: string
  description: string | null
  config: any
  createdAt: string
  updatedAt: string
  athlete: BilanAthlete
}

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export default function BilanViewPage() {
  return (
    <ErrorBoundary>
      <BilanViewPageInner />
    </ErrorBoundary>
  )
}

function BilanViewPageInner() {
  const router = useRouter()
  const params = useParams()
  const bilanId = params.id as string
  const { user } = useSession()

  const [bilan, setBilan] = useState<BilanData | null>(null)
  const [testTypes, setTestTypes] = useState<TestTypeFull[]>([])
  const [allResults, setAllResults] = useState<ResultValue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // For module rendering
  const [modules, setModules] = useState<ModuleData[]>([])

  // Email dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailAddr, setEmailAddr] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/physio-data/api/bilans/${bilanId}`)
        if (!res.ok) throw new Error("Bilan introuvable")
        const data = await res.json()
        const bilanData: BilanData = data.bilan
        setBilan(bilanData)

        // Load athlete's test results
        const athleteId = bilanData.athlete?.id
        if (athleteId) {
          const [typesRes, resultsRes] = await Promise.all([
            fetch("/physio-data/api/tests/types"),
            fetch(`/physio-data/api/athletes/${athleteId}/tests`),
          ])
          if (typesRes.ok) {
            const tData = await typesRes.json()
            setTestTypes(tData.testTypes ?? tData ?? [])
          }
          if (resultsRes.ok) {
            const rData = await resultsRes.json()
            setAllResults(rData.results ?? rData ?? [])
          }
        }

        // Load modules from API + config
        const modRes = await fetch("/physio-data/api/bilans/modules")
        if (modRes.ok) {
          const modData = await modRes.json()
          const allMods: any[] = modData.modules ?? []
          const selectedIds: string[] = bilanData.config?.selectedModuleIds ?? []
          const savedAnswers: Record<string, Record<string, string>> = bilanData.config?.modulesData ?? {}

          const renderedModules: ModuleData[] = selectedIds
            .map((modId) => {
              const src = allMods.find((m) => m.id === modId)
              if (!src) return null
              return {
                ...src,
                instanceId: src.id,
                answers: savedAnswers[modId] || {},
              }
            })
            .filter(Boolean) as ModuleData[]

          setModules(renderedModules)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [bilanId])

  const athlete = bilan?.athlete
  const config = bilan?.config ?? {}

  // Latest results map
  const latestResults = useMemo(() => {
    const map = new Map<string, ResultValue>()
    for (const r of allResults) {
      const existing = map.get(r.testTypeId)
      if (!existing || new Date(r.date) > new Date(existing.date)) {
        map.set(r.testTypeId, r)
      }
    }
    return map
  }, [allResults])

  const athleteGender = athlete?.gender

  // --- Delete ---
  const handleDelete = async () => {
    if (!confirm("Supprimer ce bilan définitivement ?")) return
    try {
      await fetch(`/physio-data/api/bilans/${bilanId}`, { method: "DELETE" })
      if (athlete) {
        router.push(`/physio-data/athletes/${athlete.id}`)
      } else {
        router.back()
      }
    } catch {
      alert("Erreur")
    }
  }

  // --- Send email ---
  const handleEmail = async () => {
    if (!emailAddr.trim()) return
    // Simple: open default mail client
    const subject = encodeURIComponent(`Bilan — ${athlete?.lastName?.toUpperCase()} ${athlete?.firstName}`)
    window.open(`mailto:${emailAddr.trim()}?subject=${subject}`, "_blank")
    setEmailDialogOpen(false)
  }

  // --- Render helpers ---
  const metricCards: any[] = Array.isArray(config.metricCards) ? config.metricCards : []
  const radarItems: any[] = Array.isArray(config.radars) ? config.radars : []

  if (loading) {
    return <div className="p-6 text-center text-gray-400 py-24">Chargement...</div>
  }
  if (error) {
    return <div className="p-6 text-center text-red-500">{error}</div>
  }
  if (!bilan) {
    return <div className="p-6 text-center text-gray-400">Bilan introuvable</div>
  }

  const athleteAge = athlete?.birthDate ? calculateAge(athlete.birthDate) : null

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="subtle" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{bilan.title}</h1>
          <p className="text-sm text-gray-500">
            {athlete?.lastName?.toUpperCase()} {athlete?.firstName}
            {athleteAge !== null ? ` — ${athleteAge} ans` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="light" size="sm" leftSection={<Edit3 className="h-4 w-4" />}
            onClick={() => router.push(`/physio-data/bilans/${bilanId}`)}>
            Modifier
          </Button>
          <Button variant="light" size="sm" color="red" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Description */}
      {bilan.description && (
        <Card withBorder className="bg-blue-50/30">
          <Text size="sm">{bilan.description}</Text>
        </Card>
      )}

      {/* ====== MODULES ====== */}
      {modules.map((mod) => (
        <Card key={mod.instanceId} shadow="sm" radius="md" withBorder>
          <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gray-50/30 rounded-t-md">
            <LayoutList className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="font-semibold text-sm">{mod.title}</span>
          </div>
          <div className="p-4">
            <BilanModuleRenderer
              module={mod}
              onAnswerChange={() => {}} // read-only
            />
          </div>
        </Card>
      ))}

      {/* ====== METRIC CARDS ====== */}
      {metricCards.map((mc: any, idx: number) => {
        const ids: string[] = mc.metricIds ?? []
        if (ids.length === 0) return null
        return (
          <Card key={mc.itemId || idx} shadow="sm" radius="md" withBorder>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gray-50/30 rounded-t-md">
              <Activity className="h-4 w-4 text-green-500 shrink-0" />
              <span className="font-semibold text-sm">Métriques ({ids.length})</span>
            </div>
            <div className="p-4 space-y-3">
              {ids.map((id: string) => {
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
                  <div key={id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <Text size="sm" fw={500}>{tt.name}</Text>
                      <Text size="xs" c="dimmed">{tt.category}</Text>
                    </div>
                    <div className="text-right">
                      <Text fw={700} size="lg" c={beatsNorm === false ? "red" : "green"}>
                        {val.toFixed(1)} <Text span size="xs" c="dimmed">{tt.unit}</Text>
                      </Text>
                      {norm !== null && (
                        <Text size="xs" c={beatsNorm === true ? "green" : beatsNorm === false ? "red" : "dimmed"}>
                          Norme: {norm.toFixed(1)}
                        </Text>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}

      {/* ====== RADARS ====== */}
      {radarItems.map((rad: any, idx: number) => {
        const ids: string[] = rad.metricIds ?? []
        const testCount = rad.testCount ?? 6
        const showNorms = rad.showNorms !== false
        const hasEnough = ids.length >= 3
        if (!hasEnough) return null
        return (
          <Card key={rad.itemId || idx} shadow="sm" radius="md" withBorder>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gray-50/30 rounded-t-md">
              <RadarIcon className="h-4 w-4 text-purple-500 shrink-0" />
              <span className="font-semibold text-sm">Radar ({ids.length} métriques)</span>
              {showNorms && <Badge size="xs" variant="light">Normes</Badge>}
            </div>
            <div className="p-4">
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <RadarChart
                    data={ids.slice(0, testCount).map((id: string) => {
                      const tt = testTypes.find((t) => t.id === id)
                      const result = latestResults.get(id)
                      if (!tt || !result) return null
                      const val = Number(result.value)
                      const norm = athleteGender === "M" ? tt.normMale : athleteGender === "F" ? tt.normFemale : null
                      const maxVal = Math.max(val, norm ?? 0, 1)
                      return {
                        name: tt.name,
                        Valeur: Math.round((val / maxVal) * 100),
                        ...(showNorms && norm ? { Norme: Math.round((Number(norm) / maxVal) * 100) } : {}),
                      }
                    }).filter(Boolean) as any[]}
                  >
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Athlète" dataKey="Valeur" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
                    {showNorms && (
                      <Radar name="Norme" dataKey="Norme" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} />
                    )}
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        )
      })}

      {/* PDF & Email buttons */}
      <div className="flex items-center gap-2 justify-center pt-4 border-t">
        <Button variant="light" size="sm" leftSection={<Printer className="h-4 w-4" />}
          onClick={() => window.print()}>
          Imprimer / PDF
        </Button>
        <Button variant="light" size="sm" leftSection={<Mail className="h-4 w-4" />}
          onClick={() => {
            setEmailAddr(athlete?.email ?? "")
            setEmailDialogOpen(true)
          }}>
          Envoyer par email
        </Button>
      </div>

      {/* Email Modal */}
      <Modal opened={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} title="Envoyer par email" size="sm">
        <div className="space-y-3 py-2">
          <TextInput
            label="Adresse email"
            type="email"
            value={emailAddr}
            onChange={(e) => setEmailAddr(e.target.value)}
            placeholder="email@exemple.com"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEmailDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEmail} disabled={!emailAddr.trim()}>Envoyer</Button>
          </Group>
        </div>
      </Modal>
    </div>
  )
}