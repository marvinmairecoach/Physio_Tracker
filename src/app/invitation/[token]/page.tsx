"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CheckCircle, XCircle, Clock, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface Session {
  id: string
  title: string
  type: "TRAINING" | "MATCH"
  date: string
  startTime: string | null
  endTime: string | null
  location: string | null
  description: string
}

interface Athlete {
  id: string
  firstName: string
  lastName: string
}

export default function InvitationPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [session, setSession] = useState<Session | null>(null)
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [alreadyResponded, setAlreadyResponded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Form state
  const [availability, setAvailability] = useState<string>("")
  const [physicalFeel, setPhysicalFeel] = useState<string>("")
  const [mentalFeel, setMentalFeel] = useState<string>("")
  const [sleepQuality, setSleepQuality] = useState<string>("")

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/invitations/${token}`)
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Lien invalide")
        }
        const data = await res.json()
        setSession(data.session)
        setAthlete(data.athlete)
        if (data.alreadyResponded) {
          setAlreadyResponded(true)
          setAvailability(data.invitation.availability)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    fetchInvitation()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!availability) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availability,
          physicalFeel: physicalFeel || null,
          mentalFeel: mentalFeel || null,
          sleepQuality: sleepQuality || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erreur lors de l'envoi")
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <p className="text-lg font-medium text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted || alreadyResponded) {
    const responseLabels: Record<string, string> = {
      PRESENT: "Présent(e)",
      ABSENT: "Absent(e)",
      MAYBE: "Peut-être",
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <h2 className="mb-2 text-xl font-bold">Merci !</h2>
            <p className="text-muted-foreground">
              Ta réponse a bien été prise en compte.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Disponibilité : <strong>{responseLabels[availability] || availability}</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const typeLabel = session?.type === "MATCH" ? "🏆 Match" : "🏋️ Entraînement"
  const dateStr = session
    ? new Date(session.date).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : ""

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Bouton retour */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </button>

        {/* En-tête */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{session?.title}</CardTitle>
            <CardDescription>
              {typeLabel} — {dateStr}
              {session?.startTime && (
                <span>
                  {" "}
                  à{" "}
                  {new Date(session.startTime).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {session?.location && <span> — {session.location}</span>}
            </CardDescription>
          </CardHeader>
          {session?.description && (
            <CardContent>
              <div
                className="prose prose-sm max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: session.description }}
              />
            </CardContent>
          )}
          {athlete && (
            <CardContent className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Bonjour <strong>{athlete.firstName} {athlete.lastName}</strong>,
                merci de confirmer ta disponibilité.
              </p>
            </CardContent>
          )}
        </Card>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Disponibilité */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Disponibilité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setAvailability("PRESENT")}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                    availability === "PRESENT"
                      ? "border-green-500 bg-green-50 ring-2 ring-green-500/20"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    availability === "PRESENT" ? "border-green-500 bg-green-500" : "border-muted-foreground"
                  }`}>
                    {availability === "PRESENT" && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="font-medium">Présent(e)</p>
                    <p className="text-sm text-muted-foreground">Je serai là</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAvailability("ABSENT")}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                    availability === "ABSENT"
                      ? "border-red-500 bg-red-50 ring-2 ring-red-500/20"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    availability === "ABSENT" ? "border-red-500 bg-red-500" : "border-muted-foreground"
                  }`}>
                    {availability === "ABSENT" && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="font-medium">Absent(e)</p>
                    <p className="text-sm text-muted-foreground">Je ne pourrai pas venir</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAvailability("MAYBE")}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                    availability === "MAYBE"
                      ? "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-500/20"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    availability === "MAYBE" ? "border-yellow-500 bg-yellow-500" : "border-muted-foreground"
                  }`}>
                    {availability === "MAYBE" && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="font-medium">Peut-être</p>
                    <p className="text-sm text-muted-foreground">Je ne sais pas encore</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Bien-être */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comment te sens-tu aujourd'hui ?</CardTitle>
              <CardDescription>Note chaque question de 1 à 10</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block">
                  Comment te sens-tu <strong>physiquement</strong> ?
                </Label>
                <div className="flex gap-1 justify-between">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPhysicalFeel(String(n))}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                        physicalFeel === String(n)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Très fatigué</span>
                  <span>Plein d'énergie</span>
                </div>
              </div>

              <div>
                <Label className="mb-3 block">
                  Comment te sens-tu <strong>moralement</strong> ?
                </Label>
                <div className="flex gap-1 justify-between">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMentalFeel(String(n))}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                        mentalFeel === String(n)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Pas bien</span>
                  <span>Très bien</span>
                </div>
              </div>

              <div>
                <Label className="mb-3 block">
                  Comment as-tu <strong>dormi</strong> la nuit dernière ?
                </Label>
                <div className="flex gap-1 justify-between">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSleepQuality(String(n))}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                        sleepQuality === String(n)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Très mal</span>
                  <span>Parfaitement</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={submitting || !availability}>
            {submitting ? "Envoi en cours..." : "Confirmer ma réponse"}
          </Button>
        </form>
      </div>
    </div>
  )
}