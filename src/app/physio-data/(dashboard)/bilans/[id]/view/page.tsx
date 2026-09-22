"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft, FileText, Download, Mail, Trash2, Edit3,
  LayoutList, Activity, RadarIcon,
} from "lucide-react"
import { Button, Card, Text, Badge, Modal, Group, TextInput } from "@mantine/core"
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
  const [pdfSaving, setPdfSaving] = useState(false)

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
        router.push(`/physio-data/athletes/${athlete.id}?tab=bilans`)
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
    const subject = encodeURIComponent(`Bilan — ${athlete?.lastName?.toUpperCase()} ${athlete?.firstName}`)
    window.open(`mailto:${emailAddr.trim()}?subject=${subject}`, "_blank")
    setEmailDialogOpen(false)
  }

  // --- PDF Generation ---
  const generatePdf = async () => {
    setPdfSaving(true)
    try {
      const {
        pdf, Document, Page, Text, View, StyleSheet, Image, Svg, Polygon, Line, Rect,
      } = await import("@react-pdf/renderer")

      // Helper: polygon points for radar
      const polyPoints = (values: number[], cx: number, cy: number, radius: number): string => {
        return values.map((v, i) => {
          const angle = (2 * Math.PI * i / values.length) - Math.PI / 2
          const r = (v / 100) * radius
          return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`
        }).join(' ')
      }

      const darkGrey = '#5E5E5E'
      const styles = StyleSheet.create({
        page: { padding: 49, fontSize: 10, fontFamily: 'Helvetica', color: darkGrey },
        headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
        headerLeft: { flexDirection: 'column', alignItems: 'flex-start' },
        headerRight: { flexDirection: 'column', alignItems: 'flex-end' },
        coachName: { fontSize: 24, fontWeight: 'bold', color: darkGrey },
        coachSubtitle: { fontSize: 15, color: darkGrey, marginTop: 2 },
        logo: { width: 90, height: 90 },
        title: { fontSize: 22, fontWeight: 'bold', color: darkGrey },
        athleteInfo: { fontSize: 10, color: darkGrey, marginTop: 2, marginBottom: 12 },
        dashSeparator: { borderTopWidth: 0.5, borderTopColor: darkGrey, borderStyle: 'dashed', marginVertical: 12 },
        section: { marginTop: 8 },
        sectionTitle: { fontSize: 13, fontWeight: 'bold', color: darkGrey, marginBottom: 6 },
        moduleCard: { marginBottom: 8 },
        moduleTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 4, color: darkGrey },
        qaRow: { flexDirection: 'row', marginBottom: 3, paddingLeft: 8 },
        qLabel: { fontWeight: 'bold', width: '50%', fontSize: 10, color: darkGrey },
        qAnswer: { width: '50%', fontSize: 10, color: darkGrey },
        metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
        metricName: { fontWeight: 'bold', width: '35%', fontSize: 10, color: darkGrey },
        metricValue: { width: '25%', textAlign: 'center', fontSize: 10 },
        metricNorm: { width: '20%', textAlign: 'center', fontSize: 9, color: '#888' },
        metricComment: { fontSize: 9, color: '#777', marginTop: 2, marginBottom: 2, paddingLeft: 8 },
        footer: { position: 'absolute', bottom: 20, left: 49, right: 49, fontSize: 8, color: '#999', textAlign: 'center', borderTopWidth: 0.5, borderTopColor: '#ccc', paddingTop: 8 },
      })

      // Prepare data
      const metricCards: any[] = Array.isArray(config.metricCards) ? config.metricCards : []
      const radars: any[] = Array.isArray(config.radars) ? config.radars : []
      const itemOrder: any[] = Array.isArray(config.itemOrder) ? config.itemOrder : null
      const moduleMap = new Map(modules.map((m) => [m.id, m]))
      const metricCardMap = new Map(metricCards.map((mc: any, i: number) => [mc.itemId || String(i), mc]))
      const radarMap = new Map(radars.map((r: any, i: number) => [r.itemId || String(i), r]))
      const today = new Date().toLocaleDateString("fr-FR")
      const athleteAge = athlete?.birthDate ? calculateAge(athlete.birthDate) : null
      const userName = user ? `${user.firstName} ${user.lastName}` : "PP Tracker"

      const PdfDoc = (
        <Document>
          <Page size="A4" style={styles.page}>
            {/* Header: logo left, name+profession right (35px gap) */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                {user?.logoUrl ? (
                  <Image src={user.logoUrl} style={styles.logo} />
                ) : (
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: darkGrey }}>PP Tracker</Text>
                )}
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.coachName}>{userName}</Text>
              </View>
            </View>

            {/* Title & athlete */}
            <Text style={styles.title}>{bilan?.title ?? "Bilan"}</Text>
            <Text style={styles.athleteInfo}>
              {athlete?.lastName?.toUpperCase()} {athlete?.firstName}
              {athleteAge !== null ? ` — ${athleteAge} ans` : ""}
              {bilan?.createdAt ? ` — ${new Date(bilan.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : ""}
            </Text>

            <View style={styles.dashSeparator} />

            {/* ===== CARDS IN ORDER (PDF) ===== */}
            {itemOrder ? itemOrder.map((entry: any, idx: number) => {
              if (entry.type === "module") {
                const mod = moduleMap.get(entry.refId)
                if (!mod) return null
                return (
                  <View key={entry.refId} style={styles.section}>
                    {idx > 0 && <View style={styles.dashSeparator} />}
                    <Text style={styles.sectionTitle}>{mod.title}</Text>
                    <View style={styles.moduleCard} wrap={false}>
                      {(mod.questions ?? []).map((q: any) => (
                        <View key={q.id} style={styles.qaRow}>
                          <Text style={styles.qLabel}>{q.label}</Text>
                          <Text style={styles.qAnswer}>{mod.answers?.[q.id] || "—"}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )
              } else if (entry.type === "metric") {
                const mc = metricCardMap.get(entry.itemId)
                if (!mc) return null
                const ids: string[] = mc.metricIds ?? []
                if (ids.length === 0) return null
                return (
                  <View key={entry.itemId} style={styles.section}>
                    {idx > 0 && <View style={styles.dashSeparator} />}
                    <Text style={styles.sectionTitle}>Métriques</Text>
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
                      const color = beatsNorm === true ? '#16a34a' : beatsNorm === false ? '#dc2626' : darkGrey
                      return (
                        <View key={id}>
                          <View style={styles.metricRow}>
                            <Text style={styles.metricName}>{tt.name}</Text>
                            <Text style={{ ...styles.metricValue, color }}>{val.toFixed(1)} {tt.unit}</Text>
                            <Text style={styles.metricNorm}>{norm !== null ? `${norm.toFixed(1)} ${tt.unit}` : "—"}</Text>
                          </View>
                          {config?.testComments?.[id] && (
                            <Text style={styles.metricComment}>{config.testComments[id]}</Text>
                          )}
                        </View>
                      )
                    })}
                  </View>
                )
              } else if (entry.type === "radar") {
                const rad = radarMap.get(entry.itemId)
                if (!rad) return null
                const ids: string[] = rad.metricIds ?? []
                const testCount = rad.testCount ?? 6
                const showNorms = rad.showNorms !== false
                if (ids.length < 3) return null

                const radarData = ids.slice(0, testCount).map((id: string) => {
                  const tt = testTypes.find((t) => t.id === id)
                  const result = latestResults.get(id)
                  if (!tt || !result) return null
                  const athleteVal = Number(result.value)
                  const normVal = athleteGender === "M" ? Number(tt.normMale ?? 0) : athleteGender === "F" ? Number(tt.normFemale ?? 0) : null
                  const scale = Math.max(athleteVal, normVal !== null ? normVal : 0, 1)
                  return {
                    name: tt.name,
                    athletePct: (athleteVal / scale) * 100,
                    normPct: normVal !== null ? (normVal / scale) * 100 : null,
                  }
                }).filter(Boolean) as { name: string; athletePct: number; normPct: number | null }[]

                const radarCount = radarData.length
                if (radarCount < 3) return null

                return (
                  <View key={entry.itemId} style={styles.section}>
                    {idx > 0 && <View style={styles.dashSeparator} />}
                    <Text style={styles.sectionTitle}>Radar des performances</Text>
                    <View style={{ alignItems: 'center', marginTop: 4 }}>
                      <Svg width={400} height={400}>
                        {[25, 50, 75, 100].map((pct) => (
                          <Polygon
                            key={pct}
                            points={polyPoints(Array(radarCount).fill(pct), 200, 200, 120)}
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth={1}
                          />
                        ))}
                        {Array.from({ length: radarCount }, (_, i) => {
                          const angle = (2 * Math.PI * i / radarCount) - Math.PI / 2
                          const x = 200 + 120 * Math.cos(angle)
                          const y = 200 + 120 * Math.sin(angle)
                          return <Line key={i} x1={200} y1={200} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />
                        })}
                        {showNorms && radarData.some(d => d.normPct !== null) && (
                          <Polygon
                            points={polyPoints(radarData.map(d => d.normPct ?? 0), 200, 200, 120)}
                            fill="#06b6d4"
                            fillOpacity={0.15}
                            stroke="#06b6d4"
                            strokeWidth={1.5}
                            strokeDasharray="4,3"
                          />
                        )}
                        <Polygon
                          points={polyPoints(radarData.map(d => d.athletePct), 200, 200, 120)}
                          fill="#2563eb"
                          fillOpacity={0.2}
                          stroke="#2563eb"
                          strokeWidth={2}
                        />
                        {radarData.map((d, i) => {
                          const angle = (2 * Math.PI * i / radarCount) - Math.PI / 2
                          const labelR = 180
                          const x = 200 + labelR * Math.cos(angle)
                          const y = 200 + labelR * Math.sin(angle)
                          const textAnchor = angle > Math.PI / 2 || angle < -Math.PI / 2 ? 'end' : angle === -Math.PI / 2 || angle === Math.PI / 2 ? 'middle' : 'start'
                          return (
                            <Text key={i} x={x} y={y} style={{ fontSize: 8, fill: '#374151', fontFamily: 'Helvetica' }} textAnchor={textAnchor}>
                              {d.name}
                            </Text>
                          )
                        })}
                      </Svg>
                      <View style={{ flexDirection: 'row', gap: 16, marginTop: 4, fontSize: 9, color: '#666' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Svg width={12} height={12}><Rect width={12} height={12} fill="#2563eb" fillOpacity={0.4} rx={2} /></Svg>
                          <Text style={{ marginLeft: 3 }}>Athlète</Text>
                        </View>
                        {showNorms && radarData.some(d => d.normPct !== null) && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Svg width={12} height={12}><Rect width={12} height={12} fill="#06b6d4" fillOpacity={0.4} rx={2} /></Svg>
                            <Text style={{ marginLeft: 3 }}>Norme</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )
              }
              return null
            }) : (
              <>
                {/* Fallback: grouped PDF rendering for older bilans */}
                {modules.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Modules d'évaluation</Text>
                    {modules.map((mod) => (
                      <View key={mod.instanceId} style={styles.moduleCard} wrap={false}>
                        <Text style={styles.moduleTitle}>{mod.title}</Text>
                        {(mod.questions ?? []).map((q: any) => (
                          <View key={q.id} style={styles.qaRow}>
                            <Text style={styles.qLabel}>{q.label}</Text>
                            <Text style={styles.qAnswer}>{mod.answers?.[q.id] || "—"}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}
                {metricCards.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Métriques</Text>
                    {metricCards.map((mc: any, idx: number) => {
                      const ids: string[] = mc.metricIds ?? []
                      if (ids.length === 0) return null
                      return (
                        <View key={mc.itemId || idx} style={{ marginBottom: 8 }}>
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
                            const color = beatsNorm === true ? '#16a34a' : beatsNorm === false ? '#dc2626' : darkGrey
                            return (
                              <View key={id}>
                                <View style={styles.metricRow}>
                                  <Text style={styles.metricName}>{tt.name}</Text>
                                  <Text style={{ ...styles.metricValue, color }}>{val.toFixed(1)} {tt.unit}</Text>
                                  <Text style={styles.metricNorm}>{norm !== null ? `${norm.toFixed(1)} ${tt.unit}` : "—"}</Text>
                                </View>
                                {config?.testComments?.[id] && (
                                  <Text style={styles.metricComment}>{config.testComments[id]}</Text>
                                )}
                              </View>
                            )
                          })}
                        </View>
                      )
                    })}
                  </View>
                )}
                {radars.map((rad: any, idx: number) => {
                  const ids: string[] = rad.metricIds ?? []
                  const testCount = rad.testCount ?? 6
                  const showNorms = rad.showNorms !== false
                  if (ids.length < 3) return null

                  const radarData = ids.slice(0, testCount).map((id: string) => {
                    const tt = testTypes.find((t) => t.id === id)
                    const result = latestResults.get(id)
                    if (!tt || !result) return null
                    const athleteVal = Number(result.value)
                    const normVal = athleteGender === "M" ? Number(tt.normMale ?? 0) : athleteGender === "F" ? Number(tt.normFemale ?? 0) : null
                    const scale = Math.max(athleteVal, normVal !== null ? normVal : 0, 1)
                    return {
                      name: tt.name,
                      athletePct: (athleteVal / scale) * 100,
                      normPct: normVal !== null ? (normVal / scale) * 100 : null,
                    }
                  }).filter(Boolean) as { name: string; athletePct: number; normPct: number | null }[]

                  const radarCount = radarData.length
                  if (radarCount < 3) return null

                  return (
                    <View key={rad.itemId || idx} style={styles.section}>
                      <Text style={styles.sectionTitle}>Radar des performances</Text>
                      <View style={{ alignItems: 'center', marginTop: 4 }}>
                        <Svg width={400} height={400}>
                          {[25, 50, 75, 100].map((pct) => (
                            <Polygon
                              key={pct}
                              points={polyPoints(Array(radarCount).fill(pct), 200, 200, 120)}
                              fill="none"
                              stroke="#e5e7eb"
                              strokeWidth={1}
                            />
                          ))}
                          {Array.from({ length: radarCount }, (_, i) => {
                            const angle = (2 * Math.PI * i / radarCount) - Math.PI / 2
                            const x = 200 + 120 * Math.cos(angle)
                            const y = 200 + 120 * Math.sin(angle)
                            return <Line key={i} x1={200} y1={200} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />
                          })}
                          {showNorms && radarData.some(d => d.normPct !== null) && (
                            <Polygon
                              points={polyPoints(radarData.map(d => d.normPct ?? 0), 200, 200, 120)}
                              fill="#06b6d4"
                              fillOpacity={0.15}
                              stroke="#06b6d4"
                              strokeWidth={1.5}
                              strokeDasharray="4,3"
                            />
                          )}
                          <Polygon
                            points={polyPoints(radarData.map(d => d.athletePct), 200, 200, 120)}
                            fill="#2563eb"
                            fillOpacity={0.2}
                            stroke="#2563eb"
                            strokeWidth={2}
                          />
                          {radarData.map((d, i) => {
                            const angle = (2 * Math.PI * i / radarCount) - Math.PI / 2
                            const labelR = 180
                            const x = 200 + labelR * Math.cos(angle)
                            const y = 200 + labelR * Math.sin(angle)
                            const textAnchor = angle > Math.PI / 2 || angle < -Math.PI / 2 ? 'end' : angle === -Math.PI / 2 || angle === Math.PI / 2 ? 'middle' : 'start'
                            return (
                              <Text key={i} x={x} y={y} style={{ fontSize: 8, fill: '#374151', fontFamily: 'Helvetica' }} textAnchor={textAnchor}>
                                {d.name}
                              </Text>
                            )
                          })}
                        </Svg>
                        <View style={{ flexDirection: 'row', gap: 16, marginTop: 4, fontSize: 9, color: '#666' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Svg width={12} height={12}><Rect width={12} height={12} fill="#2563eb" fillOpacity={0.4} rx={2} /></Svg>
                            <Text style={{ marginLeft: 3 }}>Athlète</Text>
                          </View>
                          {showNorms && radarData.some(d => d.normPct !== null) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Svg width={12} height={12}><Rect width={12} height={12} fill="#06b6d4" fillOpacity={0.4} rx={2} /></Svg>
                              <Text style={{ marginLeft: 3 }}>Norme</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  )
                })}
              </>
            )}

            {/* Description/Analysis */}
            {bilan?.description && (
              <View style={styles.section}>
                <View style={styles.dashSeparator} />
                <Text style={styles.sectionTitle}>Analyse</Text>
                <Text style={{ fontSize: 10, color: darkGrey, lineHeight: 1.4 }}>{bilan.description}</Text>
              </View>
            )}

            <Text style={styles.footer}>PP Tracker — Bilan physique généré le {today}</Text>
          </Page>
        </Document>
      )

      const blob = await pdf(PdfDoc).toBlob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    } catch (err) {
      console.error("PDF generation error:", err)
      alert("Erreur lors de la génération du PDF : " + (err instanceof Error ? err.message : "Erreur") + ". Utilisez l'impression navigateur à la place.")
    } finally {
      setPdfSaving(false)
    }
  }

  // --- Render helpers ---
  const metricCards: any[] = Array.isArray(config.metricCards) ? config.metricCards : []
  const radarItems: any[] = Array.isArray(config.radars) ? config.radars : []
  const itemOrder: any[] = Array.isArray(config.itemOrder) ? config.itemOrder : null

  // Build lookup maps for order-based rendering
  const moduleMap = new Map(modules.map((m) => [m.instanceId, m]))
  const metricCardMap = new Map(metricCards.map((mc: any, i: number) => [mc.itemId || String(i), mc]))
  const radarMap = new Map(radarItems.map((r: any, i: number) => [r.itemId || String(i), r]))

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
        <Button variant="subtle" size="sm"
          onClick={() => athlete ? router.push(`/physio-data/athletes/${athlete.id}?tab=bilans`) : router.back()}>
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
            onClick={() => {
            const athleteId = bilan?.athlete?.id
            if (athleteId) {
              router.push(`/physio-data/athletes/${athleteId}/bilans/create?edit=${bilanId}`)
            } else {
              router.push(`/physio-data/bilans/${bilanId}?edit=1`)
            }
          }}>
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

      {/* ====== CARDS IN ORDER ====== */}
      {itemOrder ? (
        // Render using the saved interleaving order
        itemOrder.map((entry: any, idx: number) => {
          if (entry.type === "module") {
            const mod = moduleMap.get(entry.refId)
            if (!mod) return null
            return (
              <Card key={entry.refId} shadow="sm" radius="md" withBorder>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gray-50/30 rounded-t-md">
                  <LayoutList className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-semibold text-sm">{mod.title}</span>
                </div>
                <div className="p-4">
                  <BilanModuleRenderer module={mod} onAnswerChange={() => {}} />
                </div>
              </Card>
            )
          } else if (entry.type === "metric") {
            const mc = metricCardMap.get(entry.itemId)
            if (!mc) return null
            const ids: string[] = mc.metricIds ?? []
            if (ids.length === 0) return null
            return (
              <Card key={entry.itemId} shadow="sm" radius="md" withBorder>
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
          } else if (entry.type === "radar") {
            const rad = radarMap.get(entry.itemId)
            if (!rad) return null
            const ids: string[] = rad.metricIds ?? []
            const testCount = rad.testCount ?? 6
            const showNorms = rad.showNorms !== false
            if (ids.length < 3) return null
            return (
              <Card key={entry.itemId} shadow="sm" radius="md" withBorder>
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
          }
          return null
        })
      ) : (
        <>
          {/* Fallback: grouped rendering for bilans without itemOrder */}
          {modules.map((mod) => (
            <Card key={mod.instanceId} shadow="sm" radius="md" withBorder>
              <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gray-50/30 rounded-t-md">
                <LayoutList className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="font-semibold text-sm">{mod.title}</span>
              </div>
              <div className="p-4">
                <BilanModuleRenderer module={mod} onAnswerChange={() => {}} />
              </div>
            </Card>
          ))}
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
        </>
      )}

      {/* PDF & Email buttons */}
      <div className="flex items-center gap-2 justify-center pt-4 border-t">
        <Button variant="light" size="sm" leftSection={<Download className="h-4 w-4" />}
          onClick={generatePdf} loading={pdfSaving}>
          {pdfSaving ? "Génération..." : "Télécharger PDF"}
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