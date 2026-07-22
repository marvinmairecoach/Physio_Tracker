"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, User, Phone, Mail, Calendar, Pencil, Trash2, TrendingUp, Award, Target, FileText, Search, ArrowUpDown, Ruler, Weight, Loader2 } from "lucide-react"
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

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Check, X } from "lucide-react"

interface Athlete {
  id: string
  firstName: string
  lastName: string
  birthDate: string | null
  phone: string | null
  email: string | null
  heightCm: number | null
  weightKg: number | null
  gender: string | null
  isActive: boolean
  photoUrl: string | null
  teams?: { team: { id: string; name: string } }[]
}

interface ComparisonItem {
  testTypeId?: string
  testTypeName?: string
  testType?: { name: string; unit: string; higherIsBetter: boolean; normMale?: number; normFemale?: number }
  athleteValue?: number
  athleteLatestValue?: number
  teamAverage: number
}

interface InvitationStatSet {
  total: number
  present: number
  absent: number
  maybe: number
  rate: number
}

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export default function AthleteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const athleteId = params.id as string

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [comparison, setComparison] = useState<ComparisonItem[]>([])
  const [invitationStats, setInvitationStats] = useState<{
    total: number
    present: number
    absent: number
    rate: number
    training: InvitationStatSet
    match: InvitationStatSet
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [injuries, setInjuries] = useState<any[]>([])
  const [editingInjuryId, setEditingInjuryId] = useState<string | null>(null)
  const [editInjuryForm, setEditInjuryForm] = useState({ injury: "", injuryDate: "", injuryNotes: "", recoveryDate: "" })
  const [savingInjury, setSavingInjury] = useState(false)
  const [searchFilter, setSearchFilter] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "value" | "norm">("name")
  const [showAllTests, setShowAllTests] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const isAdmin = userRole === "admin"

  useEffect(() => {
    async function fetchData() {
      try {
        const [athleteRes, comparisonRes, invitationRes, meRes, injuriesRes] = await Promise.all([
          fetch(`/api/athletes/${athleteId}`),
          fetch(`/api/athletes/${athleteId}/team-comparison`),
          fetch(`/api/athletes/${athleteId}/invitations`),
          fetch("/api/auth/me"),
          fetch(`/api/athletes/${athleteId}/injuries`),
        ])

        if (!athleteRes.ok) throw new Error("Athlète introuvable")

        setAthlete(await athleteRes.json())

        if (comparisonRes.ok) {
          const compData = await comparisonRes.json()
          setComparison(Array.isArray(compData) ? compData : compData.comparisons ?? [])
        }

        if (invitationRes.ok) {
          setInvitationStats(await invitationRes.json())
        }

        if (injuriesRes.ok) {
          const injData = await injuriesRes.json()
          setInjuries(injData.injuries ?? [])
        }

        if (meRes.ok) {
          const meData = await meRes.json()
          setUserRole(meData.user?.role ?? null)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [athleteId])

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>
  if (!athlete) return <div className="p-6 text-center text-muted-foreground">Athlète introuvable</div>

  const teamName = (athlete.teams ?? [])[0]?.team?.name || "Aucune"
  const genderIcon = athlete.gender === "M" ? "♂" : athlete.gender === "F" ? "♀" : ""

  // Height & weight: from test results first, then athlete model
  const tailleTest = comparison.find((c) => {
    const name = c.testTypeName || c.testType?.name || ""
    return name.toLowerCase().includes("taille")
  })
  const poidsTest = comparison.find((c) => {
    const name = c.testTypeName || c.testType?.name || ""
    return name.toLowerCase().includes("poids")
  })

  const heightValueRaw = tailleTest?.athleteLatestValue ?? athlete.heightCm ?? null
  const weightValueRaw = poidsTest?.athleteLatestValue ?? athlete.weightKg ?? null
  const heightValue = heightValueRaw !== null ? Number(heightValueRaw) : null
  const weightValue = weightValueRaw !== null ? Number(weightValueRaw) : null

  // BMI calculation
  const bmiValue = heightValue !== null && heightValue > 0 && weightValue !== null && weightValue > 0
    ? Number(weightValue) / Math.pow(Number(heightValue) / 100, 2)
    : null

  const bmiClass = bmiValue !== null
    ? bmiValue < 18.5
      ? "text-blue-500 font-bold"
      : bmiValue < 25
        ? "text-green-600 font-bold"
        : bmiValue < 30
          ? "text-amber-500 font-bold"
          : "text-red-500 font-bold"
    : ""

  const bmiLabel = bmiValue !== null
    ? bmiValue < 18.5
      ? "Insuffisance"
      : bmiValue < 25
        ? "Normal"
        : bmiValue < 30
          ? "Surpoids"
          : "Obésité"
    : ""

  // Format comparison data for radar chart
  const comparisonChartData = comparison.map((c) => {
    const athleteVal = c.athleteValue ?? c.athleteLatestValue ?? 0
    const teamAvg = c.teamAverage ?? 0
    const higherIsBetter = c.testType?.higherIsBetter ?? true
    const normValue =
      athlete.gender === "M"
        ? c.testType?.normMale
        : athlete.gender === "F"
          ? c.testType?.normFemale
          : undefined

    let normalizedAthlete = teamAvg > 0 ? (athleteVal / teamAvg) * 100 : 100
    let normalizedNorm: number | undefined = undefined

    if (!higherIsBetter && athleteVal > 0 && teamAvg > 0) {
      normalizedAthlete = (teamAvg / athleteVal) * 100
    }

    if (normValue !== undefined && normValue !== null && teamAvg > 0) {
      normalizedNorm = (normValue / teamAvg) * 100
      if (!higherIsBetter) {
        normalizedNorm = (teamAvg / normValue) * 100
      }
    }

    return {
      name: c.testTypeName || c.testType?.name || "Test",
      Athlète: Math.round(normalizedAthlete),
      "Moyenne équipe": 100,
      ...(normalizedNorm !== undefined ? { Norme: Math.round(normalizedNorm) } : {}),
      _rawAthlete: athleteVal.toFixed(1),
      _rawTeam: teamAvg.toFixed(1),
      _rawNorm: normValue !== undefined && normValue !== null ? Number(normValue).toFixed(1) : null,
      _unit: c.testType?.unit || "",
    }
  })

  const hasNorm = comparisonChartData.some((d) => "Norme" in d)

  const isPresentSomeData = invitationStats && (invitationStats.training.total > 0 || invitationStats.match.total > 0)

  // ── Photo upload ──
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const b64 = await fileToBase64(file)
      const res = await fetch(`/api/athletes/${athleteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: b64 }),
      })
      if (!res.ok) throw new Error("Erreur")
      const updated = await res.json()
      setAthlete(updated)
    } catch {
      // ignore
    } finally {
      setUploadingPhoto(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header: NOM Prénom ♂ — Equipe */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.push("/athletes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-sm font-bold shadow-sm">
            {athlete.firstName?.[0]}{athlete.lastName?.[0]}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {athlete.lastName?.toUpperCase()} {athlete.firstName}{" "}
            {genderIcon && <span className="text-lg text-muted-foreground">{genderIcon}</span>}
          </h1>
        </div>
        <Badge variant="outline" className="text-sm bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700">
          {teamName}
        </Badge>
        <Badge variant={athlete.isActive ? "default" : "secondary"}>
          {athlete.isActive ? "Actif" : "Inactif"}
        </Badge>
        {isAdmin && (
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/athletes/${athleteId}/bilans`)}
            >
              <FileText className="mr-1 h-4 w-4" />
              Bilans
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/athletes/${athleteId}/edit`)}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Carte infos: Photo + date naissance / téléphone / email */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Photo — cliquer pour uploader */}
            <div className="relative shrink-0">
              <label className={`flex cursor-pointer items-center justify-center h-32 w-32 rounded-xl overflow-hidden border-2 border-dashed transition-colors ${
                uploadingPhoto ? "border-blue-400 bg-blue-50" : "border-muted-foreground/20 hover:border-blue-300 hover:bg-blue-50/50"
              }`}>
                {athlete.photoUrl ? (
                  <img src={athlete.photoUrl} alt="Photo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <User className="h-8 w-8" />
                    <span className="text-[10px]">Ajouter une photo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
                {uploadingPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </label>
            </div>

            {/* Infos */}
            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-3">
                <div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> Date de naissance
                  </p>
                  <p className="font-medium">
                    {athlete.birthDate
                      ? `${new Date(athlete.birthDate).toLocaleDateString("fr-FR")} (${calculateAge(athlete.birthDate)} ans)`
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> Téléphone
                  </p>
                  <p className="font-medium">{athlete.phone ?? "—"}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" /> Mail
                  </p>
                  <p className="font-medium truncate">{athlete.email ?? "—"}</p>
                </div>
              </div>
            </div>

            {/* 2nd row: Taille — Poids — IMC */}
            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3 mt-4 pt-4 border-t border-blue-100">
              <div className="space-y-3">
                <div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Ruler className="h-3 w-3" /> Taille
                  </p>
                  <p className="font-medium">
                    {heightValue !== null
                      ? `${heightValue.toFixed(1)} cm`
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Weight className="h-3 w-3" /> Poids
                  </p>
                  <p className="font-medium">
                    {weightValue !== null
                      ? `${weightValue.toFixed(1)} kg`
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="text-sm">📊</span> IMC
                  </p>
                  <p className="font-medium">
                    {bmiValue !== null ? (
                      <>
                        <span className={bmiClass}>{bmiValue.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground ml-2">{bmiLabel}</span>
                      </>
                    ) : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Convocations: Entraînement | Match */}
      {isPresentSomeData && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <span className="text-blue-500">📋</span>
              Convocations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium"></th>
                    <th className="pb-3 font-medium text-right">Total</th>
                    <th className="pb-3 font-medium text-right">Présences</th>
                    <th className="pb-3 font-medium text-right">Absences</th>
                    <th className="pb-3 font-medium text-right">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b transition-colors hover:bg-green-50/50">
                    <td className="py-3 font-medium flex items-center gap-2">
                      <span className="text-green-500">🏋️</span>
                      Entraînement
                    </td>
                    <td className="py-3 text-right font-semibold">{invitationStats!.training.total}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-700">
                        {invitationStats!.training.present}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-medium text-red-600">
                        {invitationStats!.training.absent}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-semibold text-blue-700">
                        {invitationStats!.training.rate}%
                      </span>
                    </td>
                  </tr>
                  <tr className="transition-colors hover:bg-blue-50/50">
                    <td className="py-3 font-medium">
                      <span className="mr-2">🏆</span>
                      Match
                    </td>
                    <td className="py-3 text-right font-semibold">{invitationStats!.match.total}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-700">
                        {invitationStats!.match.present}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-medium text-red-600">
                        {invitationStats!.match.absent}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-semibold text-blue-700">
                        {invitationStats!.match.rate}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tests physique — Radar */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-transparent rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            <span className="text-indigo-500">📊</span>
            Tests physiques
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comparaison avec la moyenne de l&apos;équipe — les valeurs sont normalisées (100 % = moyenne équipe)
          </p>
        </CardHeader>
        <CardContent>
          {comparisonChartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune donnée de test disponible
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={420}>
              <RadarChart data={comparisonChartData}>
                <PolarGrid stroke="#e0d4f5" />
                <PolarAngleAxis dataKey="name" fontSize={12} tick={{ fill: '#6b5b8c' }} />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 200]}
                  tickFormatter={(v) => `${v}%`}
                  fontSize={11}
                  tick={{ fill: '#6b5b8c' }}
                />
                <Radar
                  name="Athlète"
                  dataKey="Athlète"
                  stroke="#7c5cbf"
                  fill="#7c5cbf"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                {hasNorm && (
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
                <Radar
                  name="Moyenne équipe"
                  dataKey="Moyenne équipe"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
                <Legend
                  formatter={(value: string) => (
                    <span style={{ color: '#4a3f5c', fontWeight: 500 }}>{value}</span>
                  )}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0]?.payload
                    return (
                      <div className="rounded-xl border bg-white px-4 py-3 shadow-lg text-sm">
                        <p className="font-semibold text-gray-800 mb-2">{data?.name}</p>
                        {payload.map((entry, i) => (
                          <div key={i} className="flex items-center justify-between gap-4 text-xs">
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                              {entry.name}
                            </span>
                            <span className="font-medium text-gray-700">
                              {entry.value}%
                            </span>
                          </div>
                        ))}
                        {data?._rawAthlete && (
                          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-muted-foreground">
                            <div>Athlète : <strong>{data._rawAthlete} {data._unit}</strong></div>
                            <div>Équipe : <strong>{data._rawTeam} {data._unit}</strong></div>
                            {data._rawNorm && <div>Norme : <strong>{data._rawNorm} {data._unit}</strong></div>}
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Résultats détaillés des tests */}
      {comparison.length > 0 && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent rounded-t-xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <span className="text-blue-500">🎯</span>
                Résultats par test
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search filter */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filtrer..."
                    value={searchFilter}
                    onChange={(e) => { setSearchFilter(e.target.value); setShowAllTests(false) }}
                    className="h-8 w-36 rounded-md border border-input bg-background pl-8 pr-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                {/* Sort selector */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "name" | "value" | "norm")}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="name">Nom</option>
                  <option value="value">Valeur</option>
                  <option value="norm">Écart norme</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {(() => {
              // Build enriched items
              const items = comparison
                .filter((c) => c.athleteLatestValue !== null)
                .map((c) => {
                  const athleteVal = c.athleteLatestValue!
                  const teamAvg = c.teamAverage ?? 0
                  const higherIsBetter = c.testType?.higherIsBetter ?? true
                  const unit = c.testType?.unit || ""
                  const testName = c.testTypeName || c.testType?.name || "Test"
                  const normValue =
                    athlete.gender === "M"
                      ? c.testType?.normMale
                      : athlete.gender === "F"
                        ? c.testType?.normFemale
                        : undefined
                  const beatsNorm = normValue !== undefined && normValue !== null
                    ? higherIsBetter ? athleteVal >= normValue : athleteVal <= normValue
                    : null
                  const normDiff = normValue !== undefined && normValue !== null && normValue > 0
                    ? Math.abs((athleteVal - normValue) / normValue * 100)
                    : null

                  return { athleteVal, teamAvg, higherIsBetter, unit, testName, normValue, beatsNorm, normDiff, c, athleteVsAvg: (() => {
                    if (teamAvg <= 0) return null
                    return higherIsBetter
                      ? ((athleteVal - teamAvg) / teamAvg * 100).toFixed(1)
                      : ((teamAvg - athleteVal) / teamAvg * 100).toFixed(1)
                  })() }
                })

              // Filter by search
              const filtered = searchFilter.trim()
                ? items.filter((i) => i.testName.toLowerCase().includes(searchFilter.toLowerCase()))
                : items

              // Sort
              const sorted = [...filtered].sort((a, b) => {
                if (sortBy === "value") return b.athleteVal - a.athleteVal
                if (sortBy === "norm") return (b.normDiff ?? 999) - (a.normDiff ?? 999)
                return a.testName.localeCompare(b.testName)
              })

              // Limit
              const visible = showAllTests ? sorted : sorted.slice(0, 5)
              const totalCount = sorted.length
              const vsNorm = (normValue: number | undefined | null, athleteVal: number, higherIsBetter: boolean) => {
                if (normValue === undefined || normValue === null || normValue <= 0) return null
                return higherIsBetter
                  ? ((athleteVal - normValue) / normValue * 100).toFixed(1)
                  : ((normValue - athleteVal) / normValue * 100).toFixed(1)
              }
              const beatsNormCheck = (normValue: number | undefined | null, athleteVal: number, higherIsBetter: boolean) => {
                if (normValue === undefined || normValue === null) return null
                return higherIsBetter ? athleteVal >= normValue : athleteVal <= normValue
              }

              return (
                <>
                  {sorted.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      {searchFilter.trim() ? "Aucun test ne correspond à votre recherche" : "Aucune donnée de test disponible"}
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {totalCount} test{totalCount > 1 ? "s" : ""}
                        {!showAllTests && totalCount > 5 && ` — affichage des 5 premiers`}
                      </p>
                      {visible.map((i, idx) => {
                        const maxRef = Math.max(i.athleteVal, i.teamAvg, i.normValue ?? 0, 1)
                        const athletePct = (i.athleteVal / maxRef) * 100
                        const teamAvgPct = (i.teamAvg / maxRef) * 100
                        const normPct = i.normValue ? (i.normValue / maxRef) * 100 : null
                        const vsNormVal = vsNorm(i.normValue, i.athleteVal, i.higherIsBetter)
                        const beatsNormVal = beatsNormCheck(i.normValue, i.athleteVal, i.higherIsBetter)

                        return (
                          <div key={idx} className="space-y-2 pb-4 border-b border-blue-100/50 last:border-b-0 last:pb-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-blue-100 text-sm shadow-sm">
                                  <Target className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm text-gray-800">{i.testName}</p>
                                  <p className="text-xs text-muted-foreground">{i.unit}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold tracking-tight text-blue-700">
                                  {i.athleteVal.toFixed(1)}
                                  <span className="text-sm font-normal text-muted-foreground ml-1">{i.unit}</span>
                                </p>
                              </div>
                            </div>

                            <div className="relative h-8">
                              <div
                                className="absolute bottom-0 h-full w-0.5 bg-amber-400 z-10 rounded-full"
                                style={{ left: `${Math.min(teamAvgPct, 95)}%` }}
                                title="Moyenne équipe"
                              />
                              {normPct !== null && (
                                <div
                                  className="absolute bottom-0 h-full w-0.5 bg-cyan-400 z-10 rounded-full"
                                  style={{ left: `${Math.min(normPct, 95)}%` }}
                                  title="Norme"
                                />
                              )}
                              <div className="absolute bottom-0 left-0 h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500"
                                style={{ width: `${Math.min(athletePct, 100)}%` }}
                              />
                              <div className="absolute bottom-0 left-0 h-3 w-full rounded-full bg-muted/50" />
                            </div>

                            <div className="flex items-center justify-between text-xs flex-wrap gap-x-4 gap-y-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />
                                  Équipe: <strong className="text-foreground">{i.teamAvg.toFixed(1)}</strong>
                                  {i.athleteVsAvg !== null && (
                                    <span className={`text-[11px] font-medium ${
                                      Number(i.athleteVsAvg) >= 0 ? "text-green-600" : "text-red-500"
                                    }`}>
                                      ({Number(i.athleteVsAvg) >= 0 ? "+" : ""}{i.athleteVsAvg}%)
                                    </span>
                                  )}
                                </span>
                                {i.normValue !== undefined && i.normValue !== null && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-cyan-400" />
                                    Norme: <strong className="text-foreground">{Number(i.normValue).toFixed(1)}</strong>
                                    {beatsNormVal !== null && (
                                      <span className={`text-[11px] font-medium ${
                                        beatsNormVal ? "text-cyan-600" : "text-orange-500"
                                      }`}>
                                        {beatsNormVal ? "(✓)" : "(✗)"}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {totalCount > 5 && (
                        <button
                          onClick={() => setShowAllTests(!showAllTests)}
                          className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 rounded-lg transition-colors"
                        >
                          {showAllTests
                            ? `Afficher moins (5)`
                            : `Voir tous les tests (${totalCount})`
                          }
                        </button>
                      )}
                    </>
                  )}
                </>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Historique des blessures */}
      {injuries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <span>🩹</span>
              Historique des blessures
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blessure</TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Guérison</TableHead>
                  <TableHead>Suivi</TableHead>
                  <TableHead>Équipe</TableHead>
                  {isAdmin && <TableHead className="text-right w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {injuries.map((inj: any) => {
                  const isEditing = editingInjuryId === inj.id
                  return (
                    <TableRow key={inj.id} className={!inj.recoveryDate ? "bg-amber-50/30" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {!inj.recoveryDate && <span className="text-amber-500 text-xs">🩹</span>}
                          {isEditing ? (
                            <Input
                              value={editInjuryForm.injury}
                              onChange={(e) => setEditInjuryForm((p) => ({ ...p, injury: e.target.value }))}
                              className="h-8 text-sm w-36"
                            />
                          ) : (
                            inj.injury
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editInjuryForm.injuryDate}
                            onChange={(e) => setEditInjuryForm((p) => ({ ...p, injuryDate: e.target.value }))}
                            className="h-8 text-sm w-32"
                          />
                        ) : (
                          new Date(inj.injuryDate).toLocaleDateString("fr-FR")
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editInjuryForm.recoveryDate}
                            onChange={(e) => setEditInjuryForm((p) => ({ ...p, recoveryDate: e.target.value }))}
                            className="h-8 text-sm w-32"
                          />
                        ) : inj.recoveryDate ? (
                          <span className="text-green-600 font-medium">
                            {new Date(inj.recoveryDate).toLocaleDateString("fr-FR")}
                          </span>
                        ) : (
                          <span className="text-amber-500 font-medium">En cours</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                        {isEditing ? (
                          <textarea
                            value={editInjuryForm.injuryNotes}
                            onChange={(e) => setEditInjuryForm((p) => ({ ...p, injuryNotes: e.target.value }))}
                            rows={2}
                            className="flex w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                          />
                        ) : (
                          <span className="line-clamp-2">{inj.injuryNotes || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inj.athleteTeam?.team?.name || "—"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveInjuryEdit(inj.id)}
                                disabled={savingInjury}
                                className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingInjuryId(null)}
                                className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startInjuryEdit(inj)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteInjury(inj.id)}
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;athlète</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{athlete.firstName} {athlete.lastName}</strong> ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/athletes/${athleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erreur")
      router.push("/athletes")
      router.refresh()
    } catch {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  function startInjuryEdit(inj: any) {
    setEditingInjuryId(inj.id)
    setEditInjuryForm({
      injury: inj.injury ?? "",
      injuryDate: inj.injuryDate ? inj.injuryDate.split("T")[0] : "",
      recoveryDate: inj.recoveryDate ? inj.recoveryDate.split("T")[0] : "",
      injuryNotes: inj.injuryNotes ?? "",
    })
  }

  async function saveInjuryEdit(injuryId: string) {
    setSavingInjury(true)
    try {
      const res = await fetch(`/api/athletes/${athleteId}/injuries/${injuryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          injury: editInjuryForm.injury.trim(),
          injuryDate: editInjuryForm.injuryDate,
          recoveryDate: editInjuryForm.recoveryDate || null,
          injuryNotes: editInjuryForm.injuryNotes.trim() || null,
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      setInjuries((prev) =>
        prev.map((p: any) => (p.id === injuryId ? data.injury : p))
      )
      setEditingInjuryId(null)
    } catch {
      // ignore
    } finally {
      setSavingInjury(false)
    }
  }

  async function deleteInjury(injuryId: string) {
    if (!confirm("Supprimer cette blessure ?")) return
    try {
      const res = await fetch(`/api/athletes/${athleteId}/injuries/${injuryId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Erreur")
      setInjuries((prev) => prev.filter((p: any) => p.id !== injuryId))
    } catch {
      // ignore
    }
  }
}