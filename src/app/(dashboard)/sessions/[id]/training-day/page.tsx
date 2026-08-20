"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Dumbbell,
  Save,
  CheckCircle,
  Lock,
  X,
  RotateCcw,
  ClipboardCheck,
  Loader2,
  ArrowLeft,
} from "lucide-react"

import { Button, Card } from "@mantine/core"

// ── Types ──────────────────────────────────────────

interface Athlete {
  id: string
  firstName: string
  lastName: string
}

interface Invitation {
  athleteId: string
  sleepQuality: number | null
  physicalFeel: number | null
  mentalFeel: number | null
  wellnessNotes: string | null
  wellnessFilledBy: "coach" | "athlete" | null
  respondedAt: string | null
  rpe: number | null
  rpeNotes: string | null
  rpeFilledBy: "coach" | "athlete" | null
  athlete: Athlete
}

interface SessionData {
  id: string
  title: string
  date: string
  type: string
  dataCollectionStatus: "pending" | "closed" | "completed"
  startTime: string | null
  endTime: string | null
  location: string | null
  team?: { id: string; name: string } | null
  assignments: { id: string; teamId: string | null; athleteId: string | null }[]
  invitations: Invitation[]
}

// ── Helpers ────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  TRAINING: { label: "Entraînement", color: "bg-blue-100 text-blue-700 border-blue-200" },
  MATCH: { label: "Match", color: "bg-green-100 text-green-700 border-green-200" },
  CLUB_EVENT: { label: "Événement club", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  REATHLETISATION: { label: "Réathlétisation", color: "bg-amber-100 text-amber-700 border-amber-200" },
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// ── Page ───────────────────────────────────────────

export default function TrainingDayPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  // ── Core state ──
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Wellness state ──
  const [wellnessValues, setWellnessValues] = useState<
    Record<string, { sleepQuality: string; physicalFeel: string; mentalFeel: string; wellnessNotes: string }>
  >({})
  const [wellnessSaving, setWellnessSaving] = useState<Record<string, boolean>>({})
  const [closingWellness, setClosingWellness] = useState(false)

  // Per-athlete debounce refs (NOT global — each athlete saves independently)
  const wellnessDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({})

  // ── RPE state ──
  const [rpeValues, setRpeValues] = useState<Record<string, { rpe: string; rpeNotes: string }>>({})
  const [savingRpe, setSavingRpe] = useState(false)
  const [rpeSaved, setRpeSaved] = useState(false)

  // ── Toast state ──
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // ── Derived ──
  const status = session?.dataCollectionStatus ?? "pending"
  const showWellness = status === "pending"
  const showRpe = status === "closed" || status === "completed"
  const invitations = session?.invitations ?? []
  const typeCfg = TYPE_CONFIG[session?.type ?? ""] ?? {
    label: session?.type ?? "",
    color: "bg-gray-100 text-gray-700 border-gray-200",
  }

  // Whether at least one wellness field has been filled (server-side or locally)
  const hasFilledWellness =
    invitations.some(
      (inv) => inv.sleepQuality !== null || inv.physicalFeel !== null || inv.mentalFeel !== null
    ) ||
    Object.values(wellnessValues).some((v) => v.sleepQuality !== "" || v.physicalFeel !== "" || v.mentalFeel !== "")

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/training-day`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors du chargement")
      }
      const data: SessionData = await res.json()
      setSession(data)

      // Initialise les formulaires depuis les données existantes
      const initialWellness: Record<string, { sleepQuality: string; physicalFeel: string; mentalFeel: string; wellnessNotes: string }> = {}
      const initialRpe: Record<string, { rpe: string; rpeNotes: string }> = {}
      for (const inv of data.invitations ?? []) {
        initialWellness[inv.athleteId] = {
          sleepQuality: inv.sleepQuality !== null ? String(inv.sleepQuality) : "",
          physicalFeel: inv.physicalFeel !== null ? String(inv.physicalFeel) : "",
          mentalFeel: inv.mentalFeel !== null ? String(inv.mentalFeel) : "",
          wellnessNotes: inv.wellnessNotes ?? "",
        }
        initialRpe[inv.athleteId] = {
          rpe: inv.rpe !== null ? String(inv.rpe) : "",
          rpeNotes: inv.rpeNotes ?? "",
        }
      }
      setWellnessValues(initialWellness)
      setRpeValues(initialRpe)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Cleanup all debounce timers on unmount
  useEffect(() => {
    return () => {
      for (const key of Object.keys(wellnessDebounceRefs.current)) {
        const t = wellnessDebounceRefs.current[key]
        if (t) clearTimeout(t)
      }
    }
  }, [])

  // ── Wellness change with per-athlete debounce ──
  const handleWellnessChange = useCallback(
    (athleteId: string, field: "sleepQuality" | "physicalFeel" | "mentalFeel" | "wellnessNotes", value: string) => {
      setWellnessValues((prev) => ({
        ...prev,
        [athleteId]: {
          ...(prev[athleteId] ?? {
            sleepQuality: "",
            physicalFeel: "",
            mentalFeel: "",
            wellnessNotes: "",
          }),
          [field]: value,
        },
      }))

      // Clear previous debounce for this athlete (per-athlete, not global)
      const existing = wellnessDebounceRefs.current[athleteId]
      if (existing) clearTimeout(existing)

      // Set new debounce for this athlete only
      wellnessDebounceRefs.current[athleteId] = setTimeout(async () => {
        setWellnessSaving((prev) => ({ ...prev, [athleteId]: true }))
        try {
          // Read current state directly — the closure captures the render's wellnessValues
          // which already includes previous changes from earlier renders
          const sleepQuality =
            field === "sleepQuality"
              ? value
                ? parseInt(value, 10)
                : null
              : wellnessValues[athleteId]?.sleepQuality
                ? parseInt(wellnessValues[athleteId].sleepQuality, 10)
                : null
          const physicalFeel =
            field === "physicalFeel"
              ? value
                ? parseInt(value, 10)
                : null
              : wellnessValues[athleteId]?.physicalFeel
                ? parseInt(wellnessValues[athleteId].physicalFeel, 10)
                : null
          const mentalFeel =
            field === "mentalFeel"
              ? value
                ? parseInt(value, 10)
                : null
              : wellnessValues[athleteId]?.mentalFeel
                ? parseInt(wellnessValues[athleteId].mentalFeel, 10)
                : null
          const wellnessNotes =
            field === "wellnessNotes" ? value : wellnessValues[athleteId]?.wellnessNotes ?? ""

          const payload = {
            athleteId,
            sleepQuality,
            physicalFeel,
            mentalFeel,
            wellnessNotes,
          }

          const res = await fetch(`/api/sessions/${sessionId}/wellness`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            throw new Error(errData.error || "Erreur de sauvegarde")
          }

          // Sync server data back into session state
          setSession((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              invitations: prev.invitations.map((inv) =>
                inv.athleteId === athleteId
                  ? {
                      ...inv,
                      sleepQuality: payload.sleepQuality,
                      physicalFeel: payload.physicalFeel,
                      mentalFeel: payload.mentalFeel,
                      wellnessNotes: payload.wellnessNotes,
                      respondedAt: new Date().toISOString(),
                      wellnessFilledBy: "coach" as const,
                    }
                  : inv
              ),
            }
          })
        } catch (err: unknown) {
          console.error("Wellness save error:", err)
        } finally {
          setWellnessSaving((prev) => ({ ...prev, [athleteId]: false }))
        }
      }, 600)
    },
    [sessionId, wellnessValues]
  )

  // ── Close wellness questionnaire ──
  const handleCloseWellness = async () => {
    setClosingWellness(true)
    setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/wellness/close`, {
        method: "POST",
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de la clôture")
      }
      setSuccessMessage("Questionnaire de bien-être clôturé avec succès")
      await fetchData()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setClosingWellness(false)
    }
  }

  // ── RPE change ──
  const handleRpeChange = useCallback(
    (athleteId: string, field: "rpe" | "rpeNotes", value: string) => {
      setRpeValues((prev) => ({
        ...prev,
        [athleteId]: {
          ...(prev[athleteId] ?? { rpe: "", rpeNotes: "" }),
          [field]: value,
        },
      }))
      setRpeSaved(false)
    },
    []
  )

  // ── Save RPE bulk ──
  const handleSaveRpe = async () => {
    setSavingRpe(true)
    setError(null)
    setRpeSaved(false)

    try {
      const results: { athleteId: string; rpe: number | null; rpeNotes: string | null }[] = []
      for (const inv of invitations) {
        const val = rpeValues[inv.athleteId]
        if (val && val.rpe !== "") {
          results.push({
            athleteId: inv.athleteId,
            rpe: parseInt(val.rpe, 10),
            rpeNotes: val.rpeNotes || null,
          })
        }
      }

      if (results.length === 0) {
        setError("Aucune RPE saisie")
        return
      }

      const res = await fetch(`/api/sessions/${sessionId}/rpe/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de l'enregistrement des RPE")
      }

      setRpeSaved(true)
      setSuccessMessage("RPE enregistrées avec succès")

      // Update session state to reflect saved values
      setSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          invitations: prev.invitations.map((inv) => {
            const saved = results.find((r) => r.athleteId === inv.athleteId)
            if (saved) {
              return {
                ...inv,
                rpe: saved.rpe,
                rpeNotes: saved.rpeNotes,
                rpeFilledBy: "coach" as const,
              }
            }
            return inv
          }),
        }
      })

      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSavingRpe(false)
    }
  }

  // ── Count filled RPE entries ──
  const filledRpeCount = Object.values(rpeValues).filter((v) => v.rpe !== "").length

  // ══════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-[#228be6]" />
          <p className="text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  // ── Error (no data at all) ──
  if (error && !session) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="subtle" size="compact-sm" onClick={() => router.push(`/sessions/${sessionId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Jour d&apos;entraînement</h1>
        </div>
        <Card withBorder className="max-w-none">
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <X className="mb-4 h-12 w-12 text-red-400" />
            <p className="text-lg font-medium mb-1 text-red-500">Erreur</p>
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="compact-sm" className="mt-4" onClick={fetchData}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ── Not found ──
  if (!session) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="subtle" size="compact-sm" onClick={() => router.push("/sessions")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Jour d&apos;entraînement</h1>
        </div>
        <Card withBorder className="max-w-none">
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardCheck className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium mb-1">Session introuvable</p>
            <p className="text-sm">Impossible de charger les données de cette session.</p>
          </div>
        </Card>
      </div>
    )
  }

  // ── No athletes ──
  if (invitations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="subtle" size="compact-sm" onClick={() => router.push(`/sessions/${sessionId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Dumbbell className="h-7 w-7 text-[#228be6]" />
            Jour d&apos;entraînement
          </h1>
        </div>
        <Card withBorder className="max-w-none">
          <div className="p-6">
            <h2 className="text-xl font-semibold">{session.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-muted-foreground">{formatDate(session.date)}</p>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeCfg.color}`}
              >
                {typeCfg.label}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-t">
            <ClipboardCheck className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium mb-1">Aucun athlète</p>
            <p className="text-sm">Cette séance n&apos;a pas encore d&apos;athlètes invités.</p>
          </div>
        </Card>
      </div>
    )
  }

  // ══════════════════════════════════════════════════
  //  MAIN RENDER
  // ══════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="subtle" size="compact-sm" onClick={() => router.push(`/sessions/${sessionId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Dumbbell className="h-7 w-7 text-[#228be6]" />
              Jour d&apos;entraînement
            </h1>
            <p className="text-muted-foreground mt-1">Saisie du bien-être et de la RPE des athlètes</p>
          </div>
        </div>
      </div>

      {/* ── Session info card ── */}
      <Card withBorder className="max-w-none">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{session.title}</h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <p className="text-sm text-muted-foreground">{formatDate(session.date)}</p>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeCfg.color}`}
                >
                  {typeCfg.label}
                </span>
                {session.team && (
                  <span className="text-sm text-muted-foreground">· {session.team.name}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showWellness && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700">
                  <CheckCircle className="h-3 w-3" />
                  Questionnaire bien-être
                </span>
              )}
              {showRpe && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700">
                  <Dumbbell className="h-3 w-3" />
                  RPE
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Toast notifications ── */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          <X className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto p-1 rounded hover:bg-red-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* PHASE 1 — WELLNESS (dataCollectionStatus = "pending") */}
      {/* ══════════════════════════════════════════════ */}
      {showWellness && (
        <Card withBorder className="max-w-none">
          <div className="px-6 pt-6 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-[#228be6]" />
                  Bien-être des athlètes
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Renseigne le sommeil, la forme et le moral de chaque athlète (0-10).
                  Sauvegarde automatique.
                </p>
              </div>
              {hasFilledWellness && (
                <Button onClick={handleCloseWellness} loading={closingWellness} color="blue">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Clôturer le questionnaire
                </Button>
              )}
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 pr-3 text-left font-medium text-muted-foreground">Athlète</th>
                    <th className="pb-2 pr-3 text-center font-medium text-muted-foreground w-24">Sommeil</th>
                    <th className="pb-2 pr-3 text-center font-medium text-muted-foreground w-24">Forme</th>
                    <th className="pb-2 pr-3 text-center font-medium text-muted-foreground w-24">Moral</th>
                    <th className="pb-2 pr-3 text-center font-medium text-muted-foreground w-10">État</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => {
                    const vals = wellnessValues[inv.athleteId] ?? {
                      sleepQuality: "",
                      physicalFeel: "",
                      mentalFeel: "",
                      wellnessNotes: "",
                    }
                    const isFilled =
                      inv.respondedAt !== null &&
                      (inv.sleepQuality !== null || inv.physicalFeel !== null || inv.mentalFeel !== null)
                    const isSaving = wellnessSaving[inv.athleteId] ?? false
                    const filledBy = inv.wellnessFilledBy

                    return (
                      <tr
                        key={inv.athleteId}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        {/* Athlete name */}
                        <td className="py-2.5 pr-3 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#228be6]/10 text-[#228be6] text-xs font-bold shrink-0">
                              {inv.athlete.firstName?.[0]}
                              {inv.athlete.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {inv.athlete.firstName} {inv.athlete.lastName}
                              </p>
                              {filledBy && (
                                <p className="text-[10px] text-muted-foreground">
                                  par {filledBy === "coach" ? "coach" : "athlète"}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Sleep quality */}
                        <td className="py-2.5 pr-3 align-middle">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="1"
                            value={vals.sleepQuality}
                            onChange={(e) => handleWellnessChange(inv.athleteId, "sleepQuality", e.target.value)}
                            placeholder="0-10"
                            className={`h-9 w-20 text-sm text-center rounded-md border border-input bg-background px-2 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#228be6] focus-visible:ring-offset-2 ${
                              vals.sleepQuality !== "" ? "border-[#228be6]/30 bg-blue-50/30" : ""
                            }`}
                          />
                        </td>

                        {/* Physical feel */}
                        <td className="py-2.5 pr-3 align-middle">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="1"
                            value={vals.physicalFeel}
                            onChange={(e) => handleWellnessChange(inv.athleteId, "physicalFeel", e.target.value)}
                            placeholder="0-10"
                            className={`h-9 w-20 text-sm text-center rounded-md border border-input bg-background px-2 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#228be6] focus-visible:ring-offset-2 ${
                              vals.physicalFeel !== "" ? "border-[#228be6]/30 bg-blue-50/30" : ""
                            }`}
                          />
                        </td>

                        {/* Mental feel */}
                        <td className="py-2.5 pr-3 align-middle">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="1"
                            value={vals.mentalFeel}
                            onChange={(e) => handleWellnessChange(inv.athleteId, "mentalFeel", e.target.value)}
                            placeholder="0-10"
                            className={`h-9 w-20 text-sm text-center rounded-md border border-input bg-background px-2 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#228be6] focus-visible:ring-offset-2 ${
                              vals.mentalFeel !== "" ? "border-[#228be6]/30 bg-blue-50/30" : ""
                            }`}
                          />
                        </td>

                        {/* Status */}
                        <td className="py-2.5 pr-3 align-middle text-center">
                          <div className="flex items-center justify-center">
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : isFilled ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </div>
                        </td>

                        {/* Wellness note */}
                        <td className="py-2.5 align-middle">
                          <input
                            type="text"
                            value={vals.wellnessNotes}
                            onChange={(e) => handleWellnessChange(inv.athleteId, "wellnessNotes", e.target.value)}
                            placeholder="Note..."
                            className="h-9 w-full text-sm rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#228be6] focus-visible:ring-offset-2"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Wellness footer */}
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {invitations.filter(
                  (inv) => inv.sleepQuality !== null || inv.physicalFeel !== null || inv.mentalFeel !== null
                ).length}{" "}
                / {invitations.length} athlète{invitations.length > 1 ? "s" : ""} renseigné
                {invitations.length > 1 ? "s" : ""}
              </p>
              {hasFilledWellness && (
                <Button onClick={handleCloseWellness} loading={closingWellness} color="blue" size="compact-sm">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Clôturer le questionnaire
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* PHASE 2 — RPE (dataCollectionStatus = "closed" or "completed") */}
      {/* ══════════════════════════════════════════════ */}
      {showRpe && (
        <Card withBorder className="max-w-none">
          <div className="px-6 pt-6 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-[#228be6]" />
                  RPE de la séance
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Saisis la RPE (0-10) et les notes pour chaque athlète
                </p>
              </div>
              <Button
                onClick={handleSaveRpe}
                loading={savingRpe}
                disabled={filledRpeCount === 0}
                color="blue"
              >
                <Save className="mr-2 h-4 w-4" />
                {savingRpe ? "Enregistrement..." : "Enregistrer les RPE"}
              </Button>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 pr-3 text-left font-medium text-muted-foreground">Athlète</th>
                    <th className="pb-2 pr-3 text-center font-medium text-muted-foreground w-28">RPE (0-10)</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">Notes</th>
                    <th className="pb-2 text-center font-medium text-muted-foreground w-12">État</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => {
                    const vals = rpeValues[inv.athleteId] ?? { rpe: "", rpeNotes: "" }
                    const isLocked = inv.rpe !== null

                    return (
                      <tr
                        key={inv.athleteId}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        {/* Athlete name */}
                        <td className="py-2.5 pr-3 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#228be6]/10 text-[#228be6] text-xs font-bold shrink-0">
                              {inv.athlete.firstName?.[0]}
                              {inv.athlete.lastName?.[0]}
                            </div>
                            <p className="font-medium text-sm">
                              {inv.athlete.firstName} {inv.athlete.lastName}
                            </p>
                          </div>
                        </td>

                        {/* RPE input */}
                        <td className="py-2.5 pr-3 align-middle">
                          {isLocked ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="text-sm font-bold text-[#228be6]">{inv.rpe}</span>
                              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="1"
                              value={vals.rpe}
                              onChange={(e) => handleRpeChange(inv.athleteId, "rpe", e.target.value)}
                              placeholder="0-10"
                              className={`h-9 w-20 text-sm text-center rounded-md border border-input bg-background px-2 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#228be6] focus-visible:ring-offset-2 ${
                                vals.rpe !== "" ? "border-[#228be6]/30 bg-blue-50/30" : ""
                              }`}
                            />
                          )}
                        </td>

                        {/* Notes input */}
                        <td className="py-2.5 pr-3 align-middle">
                          {isLocked ? (
                            <span className="text-sm text-muted-foreground">{inv.rpeNotes || "—"}</span>
                          ) : (
                            <input
                              type="text"
                              value={vals.rpeNotes}
                              onChange={(e) => handleRpeChange(inv.athleteId, "rpeNotes", e.target.value)}
                              placeholder="Notes..."
                              className="h-9 w-full text-sm rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#228be6] focus-visible:ring-offset-2"
                            />
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 align-middle text-center">
                          {isLocked ? (
                            <Lock className="h-4 w-4 text-muted-foreground mx-auto" />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* RPE footer */}
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {filledRpeCount} / {invitations.length} RPE renseignée
                {filledRpeCount > 1 ? "s" : ""}
              </p>
              <Button
                onClick={handleSaveRpe}
                loading={savingRpe}
                disabled={filledRpeCount === 0}
                color="blue"
                size="compact-sm"
              >
                <Save className="mr-2 h-4 w-4" />
                {savingRpe ? "Enregistrement..." : "Enregistrer les RPE"}
              </Button>
            </div>

            {/* RPE save success */}
            {rpeSaved && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>RPE enregistrées avec succès</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Final fallback (unexpected status) ── */}
      {!showWellness && !showRpe && (
        <Card withBorder className="max-w-none">
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardCheck className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium mb-1">Collecte terminée</p>
            <p className="text-sm">Toutes les données ont déjà été collectées pour cette séance.</p>
          </div>
        </Card>
      )}
    </div>
  )
}