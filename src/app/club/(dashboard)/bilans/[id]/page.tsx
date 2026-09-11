"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft, FileText, Download, Mail, Trash2, Edit3, Save, X,
  Target, Printer, Send,
} from "lucide-react"
import { Button, Card, TextInput, Textarea, Badge, Switch, Slider, Checkbox, Modal } from "@mantine/core"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { useSession } from "@/components/layout/providers"

interface BilanAthlete {
  id: string
  firstName: string
  lastName: string
  gender: string | null
  birthDate: string | null
  email: string | null
  teams: { team: { id: string; name: string } }[]
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
  config: {
    selectedTestIds: string[]
    radarTestCount: number
    showNorms: boolean
    showTeamComparison: boolean
    subtitle?: string
    testComments?: Record<string, string>
  }
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
  const router = useRouter()
  const params = useParams()
  const bilanId = params.id as string
  const { user } = useSession()

  const [bilan, setBilan] = useState<BilanData | null>(null)
  const [testTypes, setTestTypes] = useState<TestTypeFull[]>([])
  const [allResults, setAllResults] = useState<ResultValue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editSelectedIds, setEditSelectedIds] = useState<Set<string>>(new Set())
  const [editRadarCount, setEditRadarCount] = useState(6)
  const [editShowNorms, setEditShowNorms] = useState(true)
  const [editShowTeam, setEditShowTeam] = useState(true)
  const [saving, setSaving] = useState(false)

  // New edit fields
  const [editSubtitle, setEditSubtitle] = useState("")
  const [testComments, setTestComments] = useState<Record<string, string>>({})

  // PDF / Email dialogs
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailAddr, setEmailAddr] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const fetchBilan = async () => {
    try {
      const [bilanRes, typesRes, resultsRes] = await Promise.all([
        fetch(`/api/bilans/${bilanId}`),
        fetch("/api/tests/types"),
        fetch(`/api/athletes/${bilanId.split("/")[0]}/tests`),
      ])
      // Actually we need the athlete ID from the bilan
      if (!bilanRes.ok) throw new Error("Bilan introuvable")
      const bData = await bilanRes.json()
      const bilanData = bData.bilan
      setBilan(bilanData)
      setEditTitle(bilanData.title)
      setEditDesc(bilanData.description ?? "")
      setEditSelectedIds(new Set(bilanData.config.selectedTestIds ?? []))
      setEditRadarCount(bilanData.config.radarTestCount ?? 6)
      setEditShowNorms(bilanData.config.showNorms ?? true)
      setEditShowTeam(bilanData.config.showTeamComparison ?? true)
      setEditSubtitle(bilanData.config?.subtitle ?? "")
      setTestComments(bilanData.config?.testComments ?? {})

      if (typesRes.ok) {
        const tData = await typesRes.json()
        setTestTypes(tData.testTypes ?? tData ?? [])
      }

      // Fetch athlete's actual test results
      const athleteId = bilanData.athlete?.id
      if (athleteId) {
        const rRes = await fetch(`/api/athletes/${athleteId}/tests`)
        if (rRes.ok) {
          const rData = await rRes.json()
          setAllResults(rData.results ?? rData ?? [])
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBilan()
  }, [bilanId])

  const athlete = bilan?.athlete

  // Build latest results map
  const latestResults = new Map<string, ResultValue>()
  for (const r of allResults) {
    const existing = latestResults.get(r.testTypeId)
    if (!existing || new Date(r.date) > new Date(existing.date)) {
      latestResults.set(r.testTypeId, r)
    }
  }

  // Find if athlete actually has a team-comparison data
  const effectiveIds = editing ? editSelectedIds : (bilan?.config.selectedTestIds ? new Set(bilan.config.selectedTestIds) : new Set<string>())
  const effectiveRadarCount = editing ? editRadarCount : (bilan?.config.radarTestCount ?? 6)
  const effectiveShowNorms = editing ? editShowNorms : (bilan?.config.showNorms ?? true)

  const effectiveIdsArray = Array.from(effectiveIds)

  // Build radar data from latest results
  const radarData = effectiveIdsArray.slice(0, effectiveRadarCount).map((id) => {
    const tt = testTypes.find((t) => t.id === id)
    const result = latestResults.get(id)
    if (!tt || !result) return null
    const norm = athlete?.gender === "M" ? Number(tt.normMale ?? 0) : athlete?.gender === "F" ? Number(tt.normFemale ?? 0) : null
    const val = Number(result.value)
    const maxVal = Math.max(val, norm ?? 0, 1)
    return {
      name: tt.name,
      Valeur: Math.round((val / maxVal) * 100),
      Norme: norm && effectiveShowNorms ? Math.round((norm / maxVal) * 100) : undefined,
    }
  }).filter(Boolean)

  const handleSave = async () => {
    if (!editTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/bilans/${bilanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          config: {
            selectedTestIds: Array.from(editSelectedIds),
            radarTestCount: editRadarCount,
            showNorms: editShowNorms,
            showTeamComparison: editShowTeam,
            subtitle: editSubtitle || undefined,
            testComments: testComments,
          },
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      await fetchBilan()
      setEditing(false)
    } catch {
      alert("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Supprimer ce bilan définitivement ?")) return
    try {
      const res = await fetch(`/api/bilans/${bilanId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erreur")
      if (athlete) {
        router.push(`/athletes/${athlete.id}/bilans`)
      } else {
        router.push("/athletes")
      }
    } catch {
      alert("Erreur lors de la suppression")
    }
  }

  // PDF generation (client-side using @react-pdf/renderer)
  const generatePdf = async () => {
    try {
      // Lazy load PDF renderer
      const { pdf, Document, Page, Text, View, StyleSheet, Image, Svg, Circle, Polygon, Line, Rect } = await import("@react-pdf/renderer")

      const styles = StyleSheet.create({
        page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
        header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#2563eb', paddingBottom: 10 },
        title: { fontSize: 24, fontWeight: 'bold', color: '#1e40af' },
        subtitle: { fontSize: 12, color: '#666', marginTop: 4 },
        athleteInfo: { fontSize: 11, color: '#444', marginTop: 4 },
        section: { marginTop: 16 },
        sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e40af', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#bfdbfe', paddingBottom: 4 },
        testRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
        testName: { fontWeight: 'bold', width: '40%' },
        testValue: { width: '25%', textAlign: 'center' },
        testAsym: { width: '15%', textAlign: 'center', fontSize: 8, color: '#666' },
        testNorm: { width: '20%', textAlign: 'center', color: '#666' },
        testStatus: { width: '20%', textAlign: 'right' },
        testComment: { fontSize: 10, color: '#444', marginTop: 4, marginBottom: 2 },
        testSeparator: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginTop: 2 },
        footer: { position: 'absolute', bottom: 20, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8 },
        headerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: '#2563eb', fontSize: 9, color: '#666', fontWeight: 'bold' },
      })

      // Radar chart data (compute normalized values for SVG polygon)
      const radarData = effectiveIdsArray.slice(0, effectiveRadarCount).map((id) => {
        const tt = testTypes.find((t) => t.id === id)
        const result = latestResults.get(id)
        if (!tt || !result) return null
        const athleteVal = Number(result.value)
        const normVal = athlete?.gender === "M" ? Number(tt.normMale ?? 0) : athlete?.gender === "F" ? Number(tt.normFemale ?? 0) : null
        const scale = Math.max(athleteVal, normVal !== null ? normVal : 0, 1)
        return {
          name: tt.name,
          athletePct: (athleteVal / scale) * 100,
          normPct: normVal !== null ? (normVal / scale) * 100 : null,
        }
      }).filter(Boolean) as { name: string; athletePct: number; normPct: number | null }[]

      const radarCount = radarData.length

      // Helper: compute polygon points string from percentage values
      const polyPoints = (values: number[], cx: number, cy: number, radius: number): string => {
        return values.map((v, i) => {
          const angle = (2 * Math.PI * i / values.length) - Math.PI / 2
          const r = (v / 100) * radius
          return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`
        }).join(' ')
      }

      // Test results table rows
      const testRows = effectiveIdsArray.map((id) => {
        const tt = testTypes.find((t) => t.id === id)
        const result = latestResults.get(id)
        if (!tt || !result) return null
        const val = Number(result.value)
        const norm = athlete?.gender === "M" ? Number(tt.normMale ?? 0) : athlete?.gender === "F" ? Number(tt.normFemale ?? 0) : null
        const beatsNorm = norm !== null
          ? tt.higherIsBetter ? val >= norm : val <= norm
          : null
        const beatColor = beatsNorm === true ? '#16a34a' : beatsNorm === false ? '#dc2626' : '#333'
        const valLeft = result.valueLeft != null ? Number(result.valueLeft) : null
        const valRight = result.valueRight != null ? Number(result.valueRight) : null
        const isUnilateral = tt.isUnilateral && valLeft != null && valRight != null
        const asymPct = isUnilateral && (valLeft! + valRight!) > 0
          ? Math.abs(valLeft! - valRight!) / ((valLeft! + valRight!) / 2) * 100
          : null
        return (
          <View key={id}>
            <View style={styles.testRow}>
              <Text style={styles.testName}>{tt.name}</Text>
              <Text style={{ ...styles.testValue, color: beatColor }}>
                {isUnilateral
                  ? `G: ${valLeft!.toFixed(1)} | D: ${valRight!.toFixed(1)}`
                  : `${val.toFixed(1)} ${tt.unit}`}
              </Text>
              <Text style={styles.testAsym}>{asymPct !== null ? `${asymPct.toFixed(1)}%` : ""}</Text>
              <Text style={styles.testNorm}>{norm !== null ? `${norm.toFixed(1)} ${tt.unit}` : "—"}</Text>
            </View>
            {bilan?.config?.testComments?.[id] && (
              <Text style={styles.testComment}>{bilan.config.testComments[id]}</Text>
            )}
            <View style={styles.testSeparator} />
          </View>
        )
      }).filter(Boolean)

      const today = new Date().toLocaleDateString("fr-FR")
      const athleteAge = athlete?.birthDate ? calculateAge(athlete.birthDate) : null
      const teamName = athlete?.teams?.[0]?.team?.name ?? "—"

      const PdfDoc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <View style={styles.header}>
              {user?.logoUrl && (
                <Image src={user.logoUrl} style={{ position: 'absolute', top: 20, right: 40, width: 60, height: 60 }} />
              )}
              <Text style={styles.title}>Bilan du {new Date(bilan?.createdAt || Date.now()).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</Text>
              {bilan?.config?.subtitle && (
                <Text style={styles.subtitle}>{bilan.config.subtitle}</Text>
              )}
              <Text style={styles.athleteInfo}>
                {athlete?.lastName?.toUpperCase()} {athlete?.firstName}
                {athleteAge ? ` — ${athleteAge} ans` : ""} — {teamName}
              </Text>
            </View>

            {/* Radar section (first) — SVG polygon chart */}
            {radarCount >= 3 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Radar des performances</Text>
              <View style={{ alignItems: 'center', marginTop: 4 }}>
                <Svg width={480} height={480}>
                  {/* 4 concentric grid polygons at 25/50/75/100% */}
                  {[25, 50, 75, 100].map((pct) => (
                    <Polygon
                      key={pct}
                      points={polyPoints(Array(radarCount).fill(pct), 240, 240, 140)}
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth={1}
                    />
                  ))}
                  {/* Axis lines from center to each vertex */}
                  {Array.from({ length: radarCount }, (_, i) => {
                    const angle = (2 * Math.PI * i / radarCount) - Math.PI / 2
                    const x = 240 + 140 * Math.cos(angle)
                    const y = 240 + 140 * Math.sin(angle)
                    return <Line key={i} x1={240} y1={240} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />
                  })}
                  {/* Norm data polygon (rendered first so athlete is on top) */}
                  {radarData.some(d => d.normPct !== null) && (
                    <Polygon
                      points={polyPoints(radarData.map(d => d.normPct ?? 0), 240, 240, 140)}
                      fill="#06b6d4"
                      fillOpacity={0.15}
                      stroke="#06b6d4"
                      strokeWidth={1.5}
                      strokeDasharray="4,3"
                    />
                  )}
                  {/* Athlete data polygon */}
                  <Polygon
                    points={polyPoints(radarData.map(d => d.athletePct), 240, 240, 140)}
                    fill="#2563eb"
                    fillOpacity={0.2}
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                  {/* Labels positioned beyond the last grid ring */}
                  {radarData.map((d, i) => {
                    const angle = (2 * Math.PI * i / radarCount) - Math.PI / 2
                    const labelR = 220
                    const x = 240 + labelR * Math.cos(angle)
                    const y = 240 + labelR * Math.sin(angle)
                    const textAnchor = angle > Math.PI / 2 || angle < -Math.PI / 2 ? 'end' : angle === -Math.PI / 2 || angle === Math.PI / 2 ? 'middle' : 'start'
                    return (
                      <Text key={i} x={x} y={y} style={{ fontSize: 8, fill: '#374151', fontFamily: 'Helvetica' }} textAnchor={textAnchor}>
                        {d.name}
                      </Text>
                    )
                  })}
                </Svg>
                {/* Legend */}
                <View style={{ flexDirection: 'row', gap: 20, marginTop: 6, fontSize: 10, color: '#666' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Svg width={14} height={14}>
                      <Rect width={14} height={14} fill="#2563eb" fillOpacity={0.4} rx={2} />
                    </Svg>
                    <Text style={{ marginLeft: 4 }}>Athlète</Text>
                  </View>
                  {radarData.some(d => d.normPct !== null) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Svg width={14} height={14}>
                        <Rect width={14} height={14} fill="#06b6d4" fillOpacity={0.4} rx={2} />
                      </Svg>
                      <Text style={{ marginLeft: 4 }}>Norme</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            )}

            {/* Analyse section (second, renamed from Description) */}
            {bilan?.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Analyse</Text>
                <Text style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>{bilan.description}</Text>
              </View>
            )}

            <Text style={styles.footer}>PP Tracker — Bilan physique généré automatiquement</Text>
          </Page>
          <Page size="A4" style={styles.page}>
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>Résultats des tests</Text>
                <View style={{ flexDirection: 'row', gap: 12, fontSize: 9, color: '#999' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Svg width={10} height={10}><Circle cx="5" cy="5" r="4" fill="#22c55e" /></Svg>
                    <Text style={{ marginLeft: 3, fontSize: 9, color: '#999' }}>Norme atteinte</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Svg width={10} height={10}><Circle cx="5" cy="5" r="4" fill="#ef4444" /></Svg>
                    <Text style={{ marginLeft: 3, fontSize: 9, color: '#999' }}>Sous la norme</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Svg width={10} height={10}><Circle cx="5" cy="5" r="4" fill="#9ca3af" /></Svg>
                    <Text style={{ marginLeft: 3, fontSize: 9, color: '#999' }}>Pas de norme</Text>
                  </View>
                </View>
              </View>
              <View style={styles.headerRow}>
                <Text style={{ width: '40%' }}>Test</Text>
                <Text style={{ width: '25%', textAlign: 'center' }}>Valeur</Text>
                <Text style={{ width: '15%', textAlign: 'center' }}>Asym</Text>
                <Text style={{ width: '20%', textAlign: 'center' }}>Norme</Text>
              </View>
              {testRows}
            </View>
            <Text style={styles.footer}>PP Tracker — Bilan physique généré automatiquement</Text>
          </Page>
        </Document>
      )

      const blob = await pdf(PdfDoc).toBlob()
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      setPdfDialogOpen(true)
    } catch (err) {
      console.error("PDF generation error:", err)
      alert("Erreur lors de la génération du PDF : " + (err instanceof Error ? err.message : "Erreur inconnue") + ". Utilisez le print navigateur à la place.")
    }
  }

  const handleEmail = async () => {
    if (!emailAddr.trim()) return
    setSendingEmail(true)
    setEmailSent(false)
    try {
      // Generate PDF first
      const { pdf, Document, Page, Text, View, StyleSheet, Image, Svg, Circle, Polygon, Line, Rect } = await import("@react-pdf/renderer")

      const styles = StyleSheet.create({
        page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
        header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#2563eb', paddingBottom: 10 },
        title: { fontSize: 24, fontWeight: 'bold', color: '#1e40af' },
        subtitle: { fontSize: 12, color: '#666', marginTop: 4 },
        athleteInfo: { fontSize: 11, color: '#444', marginTop: 4 },
        section: { marginTop: 16 },
        sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e40af', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#bfdbfe', paddingBottom: 4 },
        testRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
        testName: { fontWeight: 'bold', width: '40%' },
        testValue: { width: '25%', textAlign: 'center' },
        testAsym: { width: '15%', textAlign: 'center', fontSize: 8, color: '#666' },
        testNorm: { width: '20%', textAlign: 'center', color: '#666' },
        testStatus: { width: '20%', textAlign: 'right' },
        testComment: { fontSize: 10, color: '#444', marginTop: 4, marginBottom: 2 },
        testSeparator: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginTop: 2 },
        footer: { position: 'absolute', bottom: 20, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8 },
        headerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: '#2563eb', fontSize: 9, color: '#666', fontWeight: 'bold' },
      })

      // Radar chart data (compute normalized values for SVG polygon)
      const radarData = effectiveIdsArray.slice(0, effectiveRadarCount).map((id) => {
        const tt = testTypes.find((t) => t.id === id)
        const result = latestResults.get(id)
        if (!tt || !result) return null
        const athleteVal = Number(result.value)
        const normVal = athlete?.gender === "M" ? Number(tt.normMale ?? 0) : athlete?.gender === "F" ? Number(tt.normFemale ?? 0) : null
        const scale = Math.max(athleteVal, normVal !== null ? normVal : 0, 1)
        return {
          name: tt.name,
          athletePct: (athleteVal / scale) * 100,
          normPct: normVal !== null ? (normVal / scale) * 100 : null,
        }
      }).filter(Boolean) as { name: string; athletePct: number; normPct: number | null }[]

      const radarCount = radarData.length

      // Helper: compute polygon points string from percentage values
      const polyPoints = (values: number[], cx: number, cy: number, radius: number): string => {
        return values.map((v, i) => {
          const angle = (2 * Math.PI * i / values.length) - Math.PI / 2
          const r = (v / 100) * radius
          return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`
        }).join(' ')
      }

      // Test results table rows
      const testRows = effectiveIdsArray.map((id) => {
        const tt = testTypes.find((t) => t.id === id)
        const result = latestResults.get(id)
        if (!tt || !result) return null
        const val = Number(result.value)
        const norm = athlete?.gender === "M" ? Number(tt.normMale ?? 0) : athlete?.gender === "F" ? Number(tt.normFemale ?? 0) : null
        const beatsNorm = norm !== null
          ? tt.higherIsBetter ? val >= norm : val <= norm
          : null
        const beatColor = beatsNorm === true ? '#16a34a' : beatsNorm === false ? '#dc2626' : '#333'
        const valLeft = result.valueLeft != null ? Number(result.valueLeft) : null
        const valRight = result.valueRight != null ? Number(result.valueRight) : null
        const isUnilateral = tt.isUnilateral && valLeft != null && valRight != null
        const asymPct = isUnilateral && (valLeft! + valRight!) > 0
          ? Math.abs(valLeft! - valRight!) / ((valLeft! + valRight!) / 2) * 100
          : null
        return (
          <View key={id}>
            <View style={styles.testRow}>
              <Text style={styles.testName}>{tt.name}</Text>
              <Text style={{ ...styles.testValue, color: beatColor }}>
                {isUnilateral
                  ? `G: ${valLeft!.toFixed(1)} | D: ${valRight!.toFixed(1)}`
                  : `${val.toFixed(1)} ${tt.unit}`}
              </Text>
              <Text style={styles.testAsym}>{asymPct !== null ? `${asymPct.toFixed(1)}%` : ""}</Text>
              <Text style={styles.testNorm}>{norm !== null ? `${norm.toFixed(1)} ${tt.unit}` : "—"}</Text>
            </View>
            {bilan?.config?.testComments?.[id] && (
              <Text style={styles.testComment}>{bilan.config.testComments[id]}</Text>
            )}
            <View style={styles.testSeparator} />
          </View>
        )
      }).filter(Boolean)

      const today = new Date().toLocaleDateString("fr-FR")
      const athleteAge = athlete?.birthDate ? calculateAge(athlete.birthDate) : null
      const teamName = athlete?.teams?.[0]?.team?.name ?? "—"

      const PdfDoc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <View style={styles.header}>
              {user?.logoUrl && (
                <Image src={user.logoUrl} style={{ position: 'absolute', top: 20, right: 40, width: 60, height: 60 }} />
              )}
              <Text style={styles.title}>Bilan du {new Date(bilan?.createdAt || Date.now()).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</Text>
              {bilan?.config?.subtitle && (
                <Text style={styles.subtitle}>{bilan.config.subtitle}</Text>
              )}
              <Text style={styles.athleteInfo}>
                {athlete?.lastName?.toUpperCase()} {athlete?.firstName}
                {athleteAge ? ` — ${athleteAge} ans` : ""} — {teamName}
              </Text>
            </View>

            {/* Radar section (first) — SVG polygon chart */}
            {radarCount >= 3 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Radar des performances</Text>
              <View style={{ alignItems: 'center', marginTop: 4 }}>
                <Svg width={480} height={480}>
                  {[25, 50, 75, 100].map((pct) => (
                    <Polygon
                      key={pct}
                      points={polyPoints(Array(radarCount).fill(pct), 240, 240, 140)}
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth={1}
                    />
                  ))}
                  {Array.from({ length: radarCount }, (_, i) => {
                    const angle = (2 * Math.PI * i / radarCount) - Math.PI / 2
                    const x = 240 + 140 * Math.cos(angle)
                    const y = 240 + 140 * Math.sin(angle)
                    return <Line key={i} x1={240} y1={240} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />
                  })}
                  {radarData.some(d => d.normPct !== null) && (
                    <Polygon
                      points={polyPoints(radarData.map(d => d.normPct ?? 0), 240, 240, 140)}
                      fill="#06b6d4"
                      fillOpacity={0.15}
                      stroke="#06b6d4"
                      strokeWidth={1.5}
                      strokeDasharray="4,3"
                    />
                  )}
                  <Polygon
                    points={polyPoints(radarData.map(d => d.athletePct), 240, 240, 140)}
                    fill="#2563eb"
                    fillOpacity={0.2}
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                  {radarData.map((d, i) => {
                    const angle = (2 * Math.PI * i / radarCount) - Math.PI / 2
                    const labelR = 220
                    const x = 240 + labelR * Math.cos(angle)
                    const y = 240 + labelR * Math.sin(angle)
                    const textAnchor = angle > Math.PI / 2 || angle < -Math.PI / 2 ? 'end' : angle === -Math.PI / 2 || angle === Math.PI / 2 ? 'middle' : 'start'
                    return (
                      <Text key={i} x={x} y={y} style={{ fontSize: 8, fill: '#374151', fontFamily: 'Helvetica' }} textAnchor={textAnchor}>
                        {d.name}
                      </Text>
                    )
                  })}
                </Svg>
                <View style={{ flexDirection: 'row', gap: 20, marginTop: 6, fontSize: 10, color: '#666' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Svg width={14} height={14}>
                      <Rect width={14} height={14} fill="#2563eb" fillOpacity={0.4} rx={2} />
                    </Svg>
                    <Text style={{ marginLeft: 4 }}>Athlète</Text>
                  </View>
                  {radarData.some(d => d.normPct !== null) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Svg width={14} height={14}>
                        <Rect width={14} height={14} fill="#06b6d4" fillOpacity={0.4} rx={2} />
                      </Svg>
                      <Text style={{ marginLeft: 4 }}>Norme</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            )}

            {bilan?.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Analyse</Text>
                <Text style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>{bilan.description}</Text>
              </View>
            )}

            <Text style={styles.footer}>PP Tracker — Bilan physique généré automatiquement</Text>
          </Page>
          <Page size="A4" style={styles.page}>
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>Résultats des tests</Text>
                <View style={{ flexDirection: 'row', gap: 12, fontSize: 9, color: '#999' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Svg width={10} height={10}><Circle cx="5" cy="5" r="4" fill="#22c55e" /></Svg>
                    <Text style={{ marginLeft: 3, fontSize: 9, color: '#999' }}>Norme atteinte</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Svg width={10} height={10}><Circle cx="5" cy="5" r="4" fill="#ef4444" /></Svg>
                    <Text style={{ marginLeft: 3, fontSize: 9, color: '#999' }}>Sous la norme</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Svg width={10} height={10}><Circle cx="5" cy="5" r="4" fill="#9ca3af" /></Svg>
                    <Text style={{ marginLeft: 3, fontSize: 9, color: '#999' }}>Pas de norme</Text>
                  </View>
                </View>
              </View>
              <View style={styles.headerRow}>
                <Text style={{ width: '40%' }}>Test</Text>
                <Text style={{ width: '25%', textAlign: 'center' }}>Valeur</Text>
                <Text style={{ width: '15%', textAlign: 'center' }}>Asym</Text>
                <Text style={{ width: '20%', textAlign: 'center' }}>Norme</Text>
              </View>
              {testRows}
            </View>
            <Text style={styles.footer}>PP Tracker — Bilan physique généré automatiquement</Text>
          </Page>
        </Document>
      )

      const blob = await pdf(PdfDoc).toBlob()

      // Convert blob to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string)
      })
      reader.readAsDataURL(blob)
      const base64 = await base64Promise

      // Send via API
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailAddr.trim(),
          subject: `Bilan physique — ${athlete?.lastName?.toUpperCase()} ${athlete?.firstName}`,
          html: `
            <h2>${bilan?.title ?? "Bilan physique"}</h2>
            <p>Bonjour,</p>
            <p>Veuillez trouver ci-joint le bilan physique de <strong>${athlete?.lastName?.toUpperCase()} ${athlete?.firstName}</strong>.</p>
            <p>Ce bilan a été généré depuis PP Tracker le ${today}.</p>
            <br/>
            <p style="color:#999;font-size:12px;">PP Tracker — Préparation Physique</p>
          `,
          attachment: {
            filename: `bilan_${athlete?.lastName?.toLowerCase()}_${athlete?.firstName?.toLowerCase()}.pdf`,
            content: base64.split(",")[1],
          },
        }),
      })

      if (!res.ok) throw new Error("Erreur d'envoi")
      setEmailSent(true)
    } catch (err) {
      console.error("Email error:", err)
      alert("Erreur lors de l'envoi de l'email")
    } finally {
      setSendingEmail(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>
  if (!bilan) return <div className="p-6 text-center text-muted-foreground">Bilan introuvable</div>

  const isViewMode = !editing
  const teamName = athlete?.teams?.[0]?.team?.name ?? "—"
  const athleteAge = athlete?.birthDate ? calculateAge(athlete.birthDate) : null

  const allTestTypes = testTypes
  const testTypesWithResults = allTestTypes.filter((tt) => latestResults.has(tt.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="subtle" size="compact-sm" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          {editing ? (
            <TextInput
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-2xl font-bold h-12 border-blue-300"
            />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight truncate">{bilan.title}</h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); fetchBilan() }}>
                <X className="mr-1 h-4 w-4" /> Annuler
              </Button>
              <Button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white" onClick={handleSave} disabled={saving}>
                <Save className="mr-1 h-4 w-4" /> {saving ? "..." : "Sauvegarder"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit3 className="mr-1 h-4 w-4" /> Modifier
              </Button>
              <Button variant="outline" onClick={generatePdf}>
                <Printer className="mr-1 h-4 w-4" /> PDF
              </Button>
              <Button variant="outline" onClick={() => {
                setEmailAddr(athlete?.email ?? "")
                setEmailSent(false)
                setEmailDialogOpen(true)
              }}>
                <Send className="mr-1 h-4 w-4" /> Envoyer
              </Button>
              <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Athlete info card */}
      <Card withBorder className="max-w-none">
        <div className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-sm font-bold">
              {athlete?.firstName?.[0]}{athlete?.lastName?.[0]}
            </div>
            <div>
              <p className="font-semibold">{athlete?.lastName?.toUpperCase()} {athlete?.firstName}</p>
              <p className="text-xs text-muted-foreground">
                {athleteAge !== null ? `${athleteAge} ans` : ""} — {teamName}
                {athlete?.gender === "M" ? " ♂" : athlete?.gender === "F" ? " ♀" : ""}
              </p>
            </div>
            {bilan.description && !editing && (
              <p className="text-sm text-muted-foreground ml-auto max-w-md truncate">{bilan.description}</p>
            )}
          </div>
        </div>
      </Card>

      {editing && (
        <Card withBorder className="max-w-none">
          <div className="px-6 pt-6 pb-3"><h2 className="text-lg font-semibold">Description</h2></div>
          <div className="px-6 pb-6 space-y-3">
            <TextInput
              label="Sous-titre (optionnel)"
              value={editSubtitle}
              onChange={(e) => setEditSubtitle(e.target.value)}
              placeholder="Ex: Bilan de mi-saison"
            />
            <Textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Description ou commentaire..."
              rows={3}
            />
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Radar */}
        <Card withBorder className="lg:col-span-2 max-w-none">
          <div className="px-6 pt-6 pb-3 bg-gradient-to-r from-indigo-50 to-transparent rounded-t-xl">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-indigo-500">📊</span>
              Radar des performances
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {effectiveShowNorms ? "Comparaison avec les normes" : "Valeurs normalisées"} — {effectiveIdsArray.length} test{effectiveIdsArray.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="px-6 pb-6">
            {radarData.length < 3 ? (
              <p className="text-center text-muted-foreground py-8">
                Sélectionnez au moins 3 tests pour afficher le radar
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e0d4f5" />
                  <PolarAngleAxis dataKey="name" fontSize={12} tick={{ fill: '#6b5b8c' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} tick={{ fill: '#6b5b8c' }} />
                  <Radar name="Athlète" dataKey="Valeur" stroke="#7c5cbf" fill="#7c5cbf" fillOpacity={0.25} strokeWidth={2} />
                  {effectiveShowNorms && radarData.some((d: any) => d.Norme) && (
                    <Radar name="Norme" dataKey="Norme" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} strokeWidth={2} strokeDasharray="8 4" />
                  )}
                  <Legend formatter={(value: string) => <span style={{ color: '#4a3f5c', fontWeight: 500 }}>{value}</span>} />
                  <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ borderRadius: '12px', border: '1px solid #e0d4f5' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Config sidebar */}
        <div className="space-y-6">
          {editing && (
            <Card withBorder className="max-w-none">
              <div className="px-6 pt-6 pb-3"><h2 className="text-lg font-semibold">Configuration radar</h2></div>
              <div className="px-6 pb-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tests visibles</span>
                    <span className="text-lg font-bold text-blue-600">{editRadarCount}</span>
                  </div>
                  <input
                    type="range"
                    value={editRadarCount}
                    onChange={(e) => setEditRadarCount(Number(e.target.value))}
                    min={3}
                    max={Math.max(editSelectedIds.size, 8)}
                    step={1}
                    className="mt-2 w-full"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="edit-norms" className="text-sm cursor-pointer">Afficher les normes</label>
                  <Switch id="edit-norms" checked={editShowNorms} onChange={(e) => setEditShowNorms(e.currentTarget.checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="edit-team" className="text-sm cursor-pointer">Comparaison équipe</label>
                  <Switch id="edit-team" checked={editShowTeam} onChange={(e) => setEditShowTeam(e.currentTarget.checked)} />
                </div>
              </div>
            </Card>
          )}

          {/* Test selection (in edit mode) */}
          {editing && (
            <Card withBorder className="max-w-none">
              <div className="px-6 pt-6 pb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  Tests
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {editSelectedIds.size} sélectionné{editSelectedIds.size > 1 ? "s" : ""}
                </p>
              </div>
              <div className="px-6 pb-6 max-h-[400px] overflow-y-auto space-y-2">
                {testTypesWithResults.map((tt) => {
                  const result = latestResults.get(tt.id)!
                  const isSelected = editSelectedIds.has(tt.id)
                  return (
                    <label
                      key={tt.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        isSelected ? "border-blue-300 bg-blue-50/50" : "border-border hover:border-blue-200"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {
                          setEditSelectedIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(tt.id)) next.delete(tt.id)
                            else next.add(tt.id)
                            return next
                          })
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{tt.name}</p>
                        <p className="text-xs text-muted-foreground">{Number(result.value).toFixed(1)} {tt.unit}</p>
                        {isSelected && (
                          <TextInput
                            size="xs"
                            placeholder="Commentaire..."
                            value={testComments[tt.id] ?? ""}
                            onChange={(e) => setTestComments((prev) => ({ ...prev, [tt.id]: e.target.value }))}
                            mt={4}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Stats summary */}
          <Card withBorder className="max-w-none">
            <div className="px-6 pt-6 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Résumé</p>
            </div>
            <div className="px-6 pb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tests inclus</span>
                <span className="font-medium">{effectiveIdsArray.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Radar visible</span>
                <span className="font-medium">{Math.min(effectiveRadarCount, effectiveIdsArray.length)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Normes</span>
                <span className="font-medium">{effectiveShowNorms ? "Oui" : "Non"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Créé le</span>
                <span className="font-medium">{new Date(bilan.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Detailed results table */}
      <Card withBorder className="max-w-none">
        <div className="px-6 pt-6 pb-3 bg-gradient-to-r from-blue-50 to-transparent rounded-t-xl">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Résultats détaillés
          </h2>
        </div>
        <div className="px-6 pb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Test</th>
                <th className="pb-3 font-medium text-right">Valeur</th>
                <th className="pb-3 font-medium text-right">Norme</th>
                <th className="pb-3 font-medium text-right">Écart</th>
                <th className="pb-3 font-medium text-right">Statut</th>
              </tr>
            </thead>
            <tbody>
              {effectiveIdsArray.map((id) => {
                const tt = testTypes.find((t) => t.id === id)
                const result = latestResults.get(id)
                if (!tt || !result) return null
                const val = Number(result.value)
                const norm = athlete?.gender === "M" ? Number(tt.normMale ?? 0) : athlete?.gender === "F" ? Number(tt.normFemale ?? 0) : null
                const beatsNorm = norm !== null && norm > 0
                  ? tt.higherIsBetter ? val >= norm : val <= norm
                  : null
                const diff = norm !== null && norm > 0
                  ? ((val - norm) / norm * 100).toFixed(1)
                  : null

                return (
                  <tr key={id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-medium">{tt.name}</td>
                    <td className="py-3 text-right font-semibold">
                      {val.toFixed(1)} <span className="text-muted-foreground font-normal">{tt.unit}</span>
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {norm !== null ? `${norm.toFixed(1)} ${tt.unit}` : "—"}
                    </td>
                    <td className="py-3 text-right">
                      {diff !== null ? (
                        <span className={Number(diff) >= 0 ? "text-green-600" : "text-red-500"}>
                          {Number(diff) >= 0 ? "+" : ""}{diff}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 text-right">
                      {beatsNorm === true ? (
                        <Badge color="green" size="sm">✓ Norme</Badge>
                      ) : beatsNorm === false ? (
                        <Badge color="orange" size="sm">Sous norme</Badge>
                      ) : (
                        <Badge color="gray" size="sm">—</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {effectiveIdsArray.length === 0 && (
            <p className="text-center text-muted-foreground py-6">Aucun test sélectionné</p>
          )}
        </div>
      </Card>

      {/* PDF Preview Dialog */}
      <Modal opened={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} title="Aperçu PDF" size="xl">
        <div className="h-[70vh] bg-muted/30 rounded-lg overflow-hidden">
          {pdfUrl && (
            <iframe src={pdfUrl} className="w-full h-full rounded-lg" title="PDF Preview" />
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>Fermer</Button>
          {pdfUrl && (
            <Button
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              onClick={() => {
                const a = document.createElement("a")
                a.href = pdfUrl
                a.download = `bilan_${athlete?.lastName?.toLowerCase()}_${athlete?.firstName?.toLowerCase()}.pdf`
                a.click()
              }}
            >
              <Download className="mr-1 h-4 w-4" /> Télécharger
            </Button>
          )}
        </div>
      </Modal>

      {/* Email Dialog */}
      <Modal opened={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} title="Envoyer le bilan par email" size="md">
        <p className="text-sm text-muted-foreground mb-3">
          Un PDF du bilan sera généré et envoyé en pièce jointe
        </p>
        <div className="space-y-3">
          <TextInput
            label="Adresse email"
            type="email"
            placeholder="email@exemple.com"
            value={emailAddr}
            onChange={(e) => setEmailAddr(e.target.value)}
          />
          {emailSent && (
            <p className="text-sm text-green-600 font-medium">✓ Email envoyé avec succès !</p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={sendingEmail}>Fermer</Button>
          <Button
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
            onClick={handleEmail}
            disabled={sendingEmail || !emailAddr.trim()}
          >
            <Send className="mr-1 h-4 w-4" />
            {sendingEmail ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}