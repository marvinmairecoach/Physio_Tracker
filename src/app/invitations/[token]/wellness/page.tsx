"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CheckCircle, Loader2, Timer } from "lucide-react"

import { Button, Card } from "@mantine/core"

interface InvitationData {
  athlete: { firstName: string; lastName: string }
  session: { title: string; date: string }
  alreadySubmitted: boolean
}

export default function WellnessPublicPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<InvitationData | null>(null)

  const [sleepQuality, setSleepQuality] = useState(5)
  const [physicalFeel, setPhysicalFeel] = useState(5)
  const [mentalFeel, setMentalFeel] = useState(5)
  const [wellnessNotes, setWellnessNotes] = useState("")

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Fetch invitation data on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/invitations/${token}`)
        if (res.status === 404) {
          setError("Lien invalide ou expiré")
          return
        }
        if (!res.ok) throw new Error("Erreur de chargement")
        const d = await res.json()
        if (d.alreadySubmitted) {
          setData(d)
          setSuccess(true)
          return
        }
        setData(d)
      } catch {
        setError("Impossible de charger les données")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/invitations/${token}/wellness`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sleepQuality,
          physicalFeel,
          mentalFeel,
          wellnessNotes: wellnessNotes || null,
        }),
      })

      const data2 = await res.json()

      if (res.status === 409 && data2.alreadySubmitted) {
        // Already submitted on another device
        setSuccess(true)
        return
      }

      if (!res.ok) throw new Error(data2.error || "Erreur")

      setSuccess(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue"
      )
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card withBorder className="max-w-md w-full mx-4 p-8 text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-xl font-bold mb-2">Oups !</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </div>
    )
  }

  // ── Success / Already submitted ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card withBorder className="max-w-md w-full mx-4 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold mb-2">Questionnaire enregistré !</h1>
          <p className="text-sm text-muted-foreground mb-1">
            Merci {data?.athlete.firstName} !
          </p>
          <p className="text-xs text-muted-foreground">
            {data?.session.title} —{" "}
            {data?.session.date
              ? new Date(data.session.date).toLocaleDateString("fr-FR")
              : ""}
          </p>
        </Card>
      </div>
    )
  }

  // ── Form ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card withBorder className="max-w-md w-full">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Timer className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h1 className="text-xl font-bold">
              Questionnaire bien-être
            </h1>
            {data && (
              <p className="text-sm text-muted-foreground mt-1">
                {data.athlete.firstName} {data.athlete.lastName} —{" "}
                {data.session.title}
                <br />
                {new Date(data.session.date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Sleep */}
            <div>
              <label className="block text-sm font-medium mb-2">
                😴 Qualité du sommeil
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={sleepQuality}
                  onChange={(e) => setSleepQuality(parseInt(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm font-bold w-8 text-center tabular-nums text-blue-700">
                  {sleepQuality}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Très mauvais</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Physical feel */}
            <div>
              <label className="block text-sm font-medium mb-2">
                💪 État de forme
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={physicalFeel}
                  onChange={(e) => setPhysicalFeel(parseInt(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm font-bold w-8 text-center tabular-nums text-blue-700">
                  {physicalFeel}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Très fatigué</span>
                <span>En pleine forme</span>
              </div>
            </div>

            {/* Mental */}
            <div>
              <label className="block text-sm font-medium mb-2">
                🧠 Moral du jour
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={mentalFeel}
                  onChange={(e) => setMentalFeel(parseInt(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-gray-200 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm font-bold w-8 text-center tabular-nums text-blue-700">
                  {mentalFeel}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Pas bien</span>
                <span>Super</span>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium mb-1">
                📝 Note (optionnelle)
              </label>
              <textarea
                value={wellnessNotes}
                onChange={(e) => setWellnessNotes(e.target.value)}
                placeholder="Un commentaire sur votre état du jour..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>

            <Button
              type="submit"
              fullWidth
              size="md"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Valider le questionnaire"
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}