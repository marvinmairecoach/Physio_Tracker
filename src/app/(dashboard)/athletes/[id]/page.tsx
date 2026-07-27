"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, User, Phone, Mail, Calendar, Pencil, Trash2, Target, Search, Ruler, Weight, Loader2, Trash2 as TrashIcon, Check, X } from "lucide-react"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

import { Button, Card, Table, Badge, Modal, TextInput } from "@mantine/core"

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
  const [teamSize, setTeamSize] = useState(0)
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
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null)
  const [testHistory, setTestHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

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
          setTeamSize(compData.teamSize ?? 0)
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

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>
  if (!athlete) return <div className="p-6 text-center text-gray-500">Athlète introuvable</div>

  const teamName = (athlete.teams ?? [])[0]?.team?.name || "Individuel"
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

  // Filter comparison to only items where athlete has an actual value
  const comparisonWithValues = comparison.filter(
    (c) => (c.athleteValue ?? c.athleteLatestValue) != null
  )

  // Format comparison data for radar chart
  const comparisonChartData = comparisonWithValues.map((c) => {
    const athleteVal = c.athleteValue ?? c.athleteLatestValue!
    const teamAvg = c.teamAverage ?? 0
    const higherIsBetter = c.testType?.higherIsBetter ?? true
    const normValue =
      athlete.gender === "M"
        ? c.testType?.normMale
        : athlete.gender === "F"
          ? c.testType?.normFemale
          : undefined

    let normalizedAthlete = 100
    let normalizedNorm: number | undefined = undefined

    if (teamSize > 1 && teamAvg > 0) {
      normalizedAthlete = (athleteVal / teamAvg) * 100
      if (!higherIsBetter) {
        normalizedAthlete = (teamAvg / athleteVal) * 100
      }
    }

    if (normValue !== undefined && normValue !== null && athleteVal > 0) {
      if (teamSize > 1 && teamAvg > 0) {
        normalizedNorm = (normValue / teamAvg) * 100
        if (!higherIsBetter) {
          normalizedNorm = (teamAvg / normValue) * 100
        }
      } else if (teamSize <= 1) {
        normalizedNorm = (normValue / athleteVal) * 100
        if (!higherIsBetter) {
          normalizedNorm = (athleteVal / normValue) * 100
        }
      }
    }

    return {
      name: c.testTypeName || c.testType?.name || "Test",
      Athlète: Math.round(normalizedAthlete),
      ...(teamSize > 1 ? { "Moyenne équipe": 100 } : {}),
      ...(normalizedNorm !== undefined ? { Norme: Math.round(normalizedNorm) } : {}),
      _rawAthlete: athleteVal.toFixed(1),
      _rawTeam: teamAvg.toFixed(1),
      _rawNorm: normValue !== undefined && normValue !== null ? Number(normValue).toFixed(1) : null,
      _unit: c.testType?.unit || "",
      _testType: c.testType,
      _higherIsBetter: higherIsBetter,
      _athleteVal: athleteVal,
      _teamAvg: teamAvg,
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

  /** Compress an image to a max width/height and quality before base64 */
  function compressImage(file: File, maxDim = 800, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new window.Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          let { width, height } = img
          if (width > height && width > maxDim) {
            height = Math.round((height / width) * maxDim)
            width = maxDim
          } else if (height > maxDim) {
            width = Math.round((width / height) * maxDim)
            height = maxDim
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")!
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL("image/jpeg", quality))
        }
        img.onerror = reject
        img.src = reader.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const b64 = await compressImage(file)
      const res = await fetch(`/api/athletes/${athleteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: b64 }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur serveur")
      }
      const updated = await res.json()
      setAthlete(updated)
    } catch (err) {
      console.error("Photo upload error:", err)
      alert("Erreur lors de l'upload de la photo : " + (err instanceof Error ? err.message : "Erreur inconnue"))
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleTestClick(testName: string) {
    if (expandedTestId === testName) {
      setExpandedTestId(null)
      setTestHistory([])
      return
    }
    setExpandedTestId(testName)
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/athletes/${athleteId}/tests`)
      if (res.ok) {
        const data = await res.json()
        const results = Array.isArray(data) ? data : data.results ?? data ?? []
        // Filter by test type name match
        const filtered = results.filter((r: any) => r.testType?.name === testName)
        // Sort by date ascending
        filtered.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        setTestHistory(filtered)
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header: NOM Prénom ♂ — Equipe */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" onClick={() => router.push("/athletes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-sm font-bold shadow-sm">
            {athlete.firstName?.[0]}{athlete.lastName?.[0]}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {athlete.lastName?.toUpperCase()} {athlete.firstName}{" "}
            {genderIcon && <span className="text-lg text-gray-400">{genderIcon}</span>}
          </h1>
        </div>
        <Badge color="blue" variant="light">{teamName}</Badge>
        <Badge color={athlete.isActive ? "green" : "gray"}>
          {athlete.isActive ? "Actif" : "Inactif"}
        </Badge>
        {isAdmin && (
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/athletes/${athleteId}/bilans`)}
            >
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
              color="red"
              onClick={() => setDeleteOpen(true)}
            >
              <TrashIcon className="mr-1 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Carte infos: 3 colonnes — Photo (40%) | Personnel | Physique */}
      <Card shadow="sm" radius="md" withBorder>
        <div className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Photo — cliquer pour uploader */}
            <div className="relative shrink-0 w-full lg:w-[40%] max-w-[280px]">
              <label className={`flex cursor-pointer items-center justify-center aspect-square rounded-xl overflow-hidden border-2 border-dashed transition-colors ${
                uploadingPhoto ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-300 hover:bg-blue-50/50"
              }`}>
                {athlete.photoUrl ? (
                  <img src={athlete.photoUrl} alt="Photo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400">
                    <User className="h-10 w-10" />
                    <span className="text-xs">Ajouter une photo</span>
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

            {/* Column 2: Personal info (naissance, téléphone, email) */}
            <div className="flex-1 space-y-5">
              <div>
                <p className="flex items-center gap-1 text-xs text-gray-400 uppercase tracking-wider">
                  <Calendar className="h-3 w-3" /> Date de naissance
                </p>
                <p className="font-medium text-base">
                  {athlete.birthDate
                    ? `${new Date(athlete.birthDate).toLocaleDateString("fr-FR")} (${calculateAge(athlete.birthDate)} ans)`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-gray-400 uppercase tracking-wider">
                  <Phone className="h-3 w-3" /> Téléphone
                </p>
                <p className="font-medium text-base">{athlete.phone ?? "—"}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-gray-400 uppercase tracking-wider">
                  <Mail className="h-3 w-3" /> Mail
                </p>
                <p className="font-medium text-base truncate">{athlete.email ?? "—"}</p>
              </div>
            </div>

            {/* Column 3: Physical info (taille, poids, IMC) */}
            <div className="flex-1 space-y-5">
              <div>
                <p className="flex items-center gap-1 text-xs text-gray-400 uppercase tracking-wider">
                  <Ruler className="h-3 w-3" /> Taille
                </p>
                <p className="font-medium text-base">
                  {heightValue !== null
                    ? `${heightValue.toFixed(1)} cm`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-gray-400 uppercase tracking-wider">
                  <Weight className="h-3 w-3" /> Poids
                </p>
                <p className="font-medium text-base">
                  {weightValue !== null
                    ? `${weightValue.toFixed(1)} kg`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-gray-400 uppercase tracking-wider">
                  <span className="text-sm">📊</span> IMC
                </p>
                <p className="font-medium text-base">
                  {bmiValue !== null ? (
                    <>
                      <span className={bmiClass}>{bmiValue.toFixed(1)}</span>
                      <span className="text-xs text-gray-400 ml-2">{bmiLabel}</span>
                    </>
                  ) : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Convocations: Entraînement | Match */}
      {isPresentSomeData && (
        <Card shadow="sm" radius="md" withBorder>
          <div className="bg-gradient-to-r from-blue-50 to-transparent rounded-t-xl px-4 pt-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-blue-500">📋</span>
              Convocations
            </h2>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-400">
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
          </div>
        </Card>
      )}

      {/* Tests physique — Radar */}
      {comparisonWithValues.length >= 3 && (
        <Card shadow="sm" radius="md" withBorder>
          <div className="bg-gradient-to-r from-indigo-50 to-transparent rounded-t-xl px-4 pt-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-indigo-500">📊</span>
              Profil physique
            </h2>
            <p className="text-sm text-gray-500">
              Comparaison avec la moyenne de l'équipe — les valeurs sont normalisées (100 % = moyenne équipe)
            </p>
          </div>
          <div className="p-4">
            {comparisonChartData.length >= 3 ? (
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
                {teamSize > 1 && (
                  <Radar
                    name="Moyenne équipe"
                    dataKey="Moyenne équipe"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.15}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                )}
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
                          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
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
          ) : comparisonChartData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {comparisonChartData.map((d, idx) => (
                <Card key={idx} shadow="sm" radius="md" withBorder className="p-4">
                  <div className="text-sm font-semibold text-gray-700 mb-1">{d.name}</div>
                  <div className="text-3xl font-bold text-blue-700">
                    {d._athleteVal.toFixed(1)}
                    <span className="text-sm font-normal text-gray-400 ml-1">{d._unit}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-sm bg-amber-400" />
                      Équipe: <strong>{d._teamAvg.toFixed(1)}</strong>
                    </span>
                    {d._rawNorm && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-sm bg-cyan-400" />
                        Norme: <strong>{d._rawNorm}</strong>
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">Aucune donnée de test disponible</p>
          )}
        </div>
      </Card>
      )}

      {/* Résultats détaillés des tests */}
      {comparison.length > 0 && (
        <Card shadow="sm" radius="md" withBorder>
          <div className="bg-gradient-to-r from-blue-50 to-transparent rounded-t-xl px-4 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-blue-500">🎯</span>
                Résultats par test
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search filter */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filtrer..."
                    value={searchFilter}
                    onChange={(e) => { setSearchFilter(e.target.value); setShowAllTests(false) }}
                    className="h-8 w-36 rounded-md border border-gray-300 bg-white pl-8 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {/* Sort selector */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "name" | "value" | "norm")}
                  className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Nom</option>
                  <option value="value">Valeur</option>
                  <option value="norm">Écart norme</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-5">
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
              const visible = showAllTests ? sorted : sorted.slice(0, 6)
              const totalCount = sorted.length

              return (
                <>
                  {sorted.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">
                      {searchFilter.trim() ? "Aucun test ne correspond à votre recherche" : "Aucune donnée de test disponible"}
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400 mb-4">
                        {totalCount} test{totalCount > 1 ? "s" : ""}
                        {!showAllTests && totalCount > 6 && ` — affichage des 6 premiers`}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visible.map((i, idx) => {
                          const pctDiff = i.teamAvg > 0
                            ? ((i.athleteVal - i.teamAvg) / i.teamAvg * 100).toFixed(1)
                            : null
                          const isAboveAvg = pctDiff !== null && Number(pctDiff) >= 0
                          const isAboveAvgStrict = pctDiff !== null && Number(pctDiff) > 0
                          const beatsNormVal = i.normValue !== undefined && i.normValue !== null
                            ? i.higherIsBetter ? i.athleteVal >= i.normValue : i.athleteVal <= i.normValue
                            : null
                          // Previous value delta if both athleteValue and athleteLatestValue exist
                          const prevValue = i.c.athleteValue
                          const currValue = i.c.athleteLatestValue
                          const hasDelta = prevValue !== undefined && prevValue !== null && currValue !== undefined && currValue !== null && prevValue !== currValue
                          const delta = hasDelta ? currValue! - prevValue! : null

                          // Color based on test name hash
                          const colors = ["#7c5cbf", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"]
                          const colorIdx = i.testName.length % colors.length
                          const dotColor = colors[colorIdx]

                          return (
                            <div key={idx} className="space-y-0">
                              <Card
                                shadow="sm"
                                radius="md"
                                withBorder
                                className={`p-4 cursor-pointer transition-all hover:shadow-md ${expandedTestId === i.testName ? 'ring-2 ring-blue-300' : ''}`}
                                onClick={() => handleTestClick(i.testName)}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: dotColor }} />
                                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">{i.testName}</span>
                                </div>
                                <div className="text-3xl font-bold text-gray-900 mb-2">
                                  {i.athleteVal.toFixed(1)}
                                  <span className="text-sm font-normal text-gray-400 ml-1">{i.unit}</span>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Équipe:</span>
                                    <span className="font-medium text-gray-700">{i.teamAvg.toFixed(1)}
                                      {pctDiff !== null && (
                                        <span className={`ml-1.5 font-medium ${
                                          isAboveAvg ? "text-green-600" : "text-red-500"
                                        }`}>
                                          {isAboveAvgStrict ? "+" : ""}{pctDiff}%
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  {i.normValue !== undefined && i.normValue !== null && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-400">Norme:</span>
                                      <span className="font-medium text-gray-700">
                                        {Number(i.normValue).toFixed(1)}
                                        {beatsNormVal !== null && (
                                          <span className={`ml-1.5 ${
                                            beatsNormVal ? "text-green-600" : "text-red-500"
                                          }`}>
                                            {beatsNormVal ? "✓" : "✗"}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {delta !== null && (
                                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                      <span className="text-gray-400">Évol:</span>
                                      <span className={`font-medium ${delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                                        {delta >= 0 ? "↑" : "↓"}{Math.abs(delta).toFixed(1)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </Card>
                              {expandedTestId === i.testName && historyLoading && (
                                <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 rounded-lg border border-gray-200 -mt-2 mb-2">
                                  <Loader2 className="inline-block h-4 w-4 animate-spin mr-1" />
                                  Chargement...
                                </div>
                              )}
                              {expandedTestId === i.testName && !historyLoading && testHistory.length > 1 && (
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 -mt-2 mb-2">
                                  <p className="text-xs font-medium text-gray-500 mb-2">Évolution</p>
                                  <ResponsiveContainer width="100%" height={180}>
                                    <LineChart data={testHistory.map((r, j) => ({
                                      index: j + 1,
                                      value: Number(r.value),
                                      date: new Date(r.date).toLocaleDateString("fr-FR"),
                                    }))}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                      <XAxis dataKey="date" fontSize={10} tick={{ fill: '#9ca3af' }} />
                                      <YAxis fontSize={10} tick={{ fill: '#9ca3af' }} />
                                      <Tooltip />
                                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                              {expandedTestId === i.testName && !historyLoading && testHistory.length <= 1 && (
                                <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 rounded-lg border border-gray-200 -mt-2 mb-2">
                                  Pas assez de données pour afficher l'évolution
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {totalCount > 6 && (
                        <button
                          onClick={() => setShowAllTests(!showAllTests)}
                          className="w-full mt-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 rounded-lg transition-colors"
                        >
                          {showAllTests
                            ? `Afficher moins (6)`
                            : `Voir tous les tests (${totalCount})`
                          }
                        </button>
                      )}
                    </>
                  )}
                </>
              )
            })()}
          </div>
        </Card>
      )}

      {/* Historique des blessures */}
      {injuries.length > 0 && (
        <Card shadow="sm" radius="md" withBorder>
          <Card.Section withBorder inheritPadding py="sm">
            <div className="flex items-center gap-2 text-amber-700">
              <span>🩹</span>
              <h2 className="text-xl font-semibold">Historique des blessures</h2>
            </div>
          </Card.Section>
          <div className="p-4 overflow-x-auto">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Blessure</Table.Th>
                  <Table.Th className="whitespace-nowrap">Date</Table.Th>
                  <Table.Th className="whitespace-nowrap">Guérison</Table.Th>
                  <Table.Th>Suivi</Table.Th>
                  <Table.Th>Équipe</Table.Th>
                  {isAdmin && <Table.Th className="text-right w-[100px]">Actions</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {injuries.map((inj: any) => {
                  const isEditing = editingInjuryId === inj.id
                  return (
                    <Table.Tr key={inj.id} className={!inj.recoveryDate ? "bg-amber-50/30" : ""}>
                      <Table.Td className="font-medium">
                        <div className="flex items-center gap-2">
                          {!inj.recoveryDate && <span className="text-amber-500 text-xs">🩹</span>}
                          {isEditing ? (
                            <TextInput
                              value={editInjuryForm.injury}
                              onChange={(e) => setEditInjuryForm((p) => ({ ...p, injury: e.target.value }))}
                              size="xs"
                              className="w-36"
                            />
                          ) : (
                            inj.injury
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td className="whitespace-nowrap text-sm">
                        {isEditing ? (
                          <TextInput
                            type="date"
                            value={editInjuryForm.injuryDate}
                            onChange={(e) => setEditInjuryForm((p) => ({ ...p, injuryDate: e.target.value }))}
                            size="xs"
                            className="w-32"
                          />
                        ) : (
                          new Date(inj.injuryDate).toLocaleDateString("fr-FR")
                        )}
                      </Table.Td>
                      <Table.Td className="whitespace-nowrap text-sm">
                        {isEditing ? (
                          <TextInput
                            type="date"
                            value={editInjuryForm.recoveryDate}
                            onChange={(e) => setEditInjuryForm((p) => ({ ...p, recoveryDate: e.target.value }))}
                            size="xs"
                            className="w-32"
                          />
                        ) : inj.recoveryDate ? (
                          <span className="text-green-600 font-medium">
                            {new Date(inj.recoveryDate).toLocaleDateString("fr-FR")}
                          </span>
                        ) : (
                          <span className="text-amber-500 font-medium">En cours</span>
                        )}
                      </Table.Td>
                      <Table.Td className="text-sm text-gray-400 max-w-[200px]">
                        {isEditing ? (
                          <textarea
                            value={editInjuryForm.injuryNotes}
                            onChange={(e) => setEditInjuryForm((p) => ({ ...p, injuryNotes: e.target.value }))}
                            rows={2}
                            className="flex w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                          />
                        ) : (
                          <span className="line-clamp-2">{inj.injuryNotes || "—"}</span>
                        )}
                      </Table.Td>
                      <Table.Td className="text-sm text-gray-400">
                        {inj.athleteTeam?.team?.name || "—"}
                      </Table.Td>
                      {isAdmin && (
                        <Table.Td className="text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => saveInjuryEdit(inj.id)}
                                disabled={savingInjury}
                                className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingInjuryId(null)}
                                className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startInjuryEdit(inj)}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700 rounded"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteInjury(inj.id)}
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </Table.Td>
                      )}
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* Delete confirmation */}
      <Modal
        opened={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer l'athlète"
        size="md"
      >
        <p className="text-sm text-gray-600 mb-6">
          Êtes-vous sûr de vouloir supprimer <strong>{athlete.firstName} {athlete.lastName}</strong> ?
          Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Annuler
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleting}>
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </Modal>
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