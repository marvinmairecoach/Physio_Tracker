"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface InjuredAthlete {
  id: string
  injury: string
  injuryDate: string
  injuryNotes: string | null
  athlete: {
    id: string
    firstName: string
    lastName: string
    gender: string | null
  }
  athleteTeam: {
    team: { id: string; name: string }
  }
}

export default function InfirmeriePage() {
  const router = useRouter()
  const [injured, setInjured] = useState<InjuredAthlete[]>([])
  const [loading, setLoading] = useState(true)
  const [recoveryTarget, setRecoveryTarget] = useState<InjuredAthlete | null>(null)
  const [recovering, setRecovering] = useState(false)

  // Local draft values per row (key = injury id)
  const [drafts, setDrafts] = useState<Record<string, { injury: string; injuryDate: string; injuryNotes: string }>>({})
  // Track which rows are currently saving
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set())
  // Debounce timers per row per field
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    fetchInjured()
  }, [])

  useEffect(() => {
    return () => {
      // Cleanup all timers on unmount
      Object.values(timers.current).forEach(clearTimeout)
    }
  }, [])

  async function fetchInjured() {
    try {
      const res = await fetch("/api/athletes/injured")
      if (res.ok) {
        const data = await res.json()
        const list: InjuredAthlete[] = data.injured ?? []
        setInjured(list)
        // Initialise drafts from server data
        setDrafts((prev) => {
          const next = { ...prev }
          for (const item of list) {
            if (!next[item.id]) {
              next[item.id] = {
                injury: item.injury ?? "",
                injuryDate: item.injuryDate ? item.injuryDate.split("T")[0] : "",
                injuryNotes: item.injuryNotes ?? "",
              }
            }
          }
          return next
        })
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // Update draft for a row and schedule auto-save
  const updateDraft = useCallback(
    (injuryId: string, field: "injury" | "injuryDate" | "injuryNotes", value: string) => {
      setDrafts((prev) => ({
        ...prev,
        [injuryId]: { ...prev[injuryId], [field]: value },
      }))
      scheduleSave(injuryId)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  function scheduleSave(injuryId: string) {
    // Clear any existing timer for this row
    if (timers.current[injuryId]) {
      clearTimeout(timers.current[injuryId])
    }
    // Schedule save after 600ms of inactivity
    timers.current[injuryId] = setTimeout(() => {
      autoSave(injuryId)
    }, 600)
  }

  async function autoSave(injuryId: string) {
    const draft = drafts[injuryId]
    if (!draft) return

    setSavingRows((prev) => new Set(prev).add(injuryId))
    try {
      const res = await fetch("/api/athletes/injured", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: injuryId,
          injury: draft.injury.trim() || null,
          injuryDate: draft.injuryDate || null,
          injuryNotes: draft.injuryNotes.trim() || null,
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      // Update local state with new values
      setInjured((prev) =>
        prev.map((p) =>
          p.id === injuryId
            ? {
                ...p,
                injury: draft.injury.trim(),
                injuryDate: draft.injuryDate || p.injuryDate,
                injuryNotes: draft.injuryNotes.trim() || null,
              }
            : p
        )
      )
    } catch {
      // ignore
    } finally {
      setSavingRows((prev) => {
        const next = new Set(prev)
        next.delete(injuryId)
        return next
      })
    }
  }

  async function handleRecovery() {
    if (!recoveryTarget) return
    setRecovering(true)
    try {
      const res = await fetch("/api/athletes/injured", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: recoveryTarget.id,
          recoveryDate: new Date().toISOString().split("T")[0],
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      setInjured((prev) => prev.filter((p) => p.id !== recoveryTarget.id))
      setRecoveryTarget(null)
    } catch {
      // ignore
    } finally {
      setRecovering(false)
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return ""
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR")
    } catch {
      return dateStr
    }
  }

  function getDraft(id: string) {
    return drafts[id] ?? { injury: "", injuryDate: "", injuryNotes: "" }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Infirmerie</h1>
          <p className="text-muted-foreground mt-1">
            {injured.length} joueur(s) actuellement blessé(s)
          </p>
        </div>
      </div>

      {injured.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-700 mb-1">Aucun blessé</h3>
            <p className="text-sm text-muted-foreground">
              Tous les joueurs sont en bonne santé. L&apos;infirmerie est vide !
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-amber-500">🩹</span>
              Joueurs blessés
            </CardTitle>
            <CardDescription>
              Modifie les champs directement — les modifications sont sauvegardées automatiquement.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap min-w-[140px]">Joueur</TableHead>
                  <TableHead className="whitespace-nowrap w-[180px]">Blessure</TableHead>
                  <TableHead className="whitespace-nowrap w-[120px]">Date blessure</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[220px]">Suivi</TableHead>
                  <TableHead className="whitespace-nowrap text-right w-[90px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {injured.map((item) => {
                  const draft = getDraft(item.id)
                  const saving = savingRows.has(item.id)

                  return (
                    <TableRow key={item.id} className="hover:bg-amber-50/50">
                      <TableCell className="font-medium whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/athletes/${item.athlete.id}`)}
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold shrink-0">
                            {item.athlete.firstName?.[0]}{item.athlete.lastName?.[0]}
                          </div>
                          <div className="text-sm leading-tight text-left">
                            <div>{item.athlete.firstName} {item.athlete.lastName}</div>
                            <div className="text-xs text-muted-foreground">{item.athleteTeam.team.name}</div>
                          </div>
                        </button>
                      </TableCell>

                      {/* Blessure — inline editable */}
                      <TableCell>
                        <div className="relative">
                          <Input
                            value={draft.injury}
                            onChange={(e) => updateDraft(item.id, "injury", e.target.value)}
                            placeholder="Ex: Entorse cheville"
                            className="h-8 text-sm pr-6"
                          />
                          {saving && (
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
                              <svg className="h-3.5 w-3.5 animate-spin text-muted-foreground" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Date blessure — inline editable */}
                      <TableCell>
                        <Input
                          type="date"
                          value={draft.injuryDate}
                          onChange={(e) => updateDraft(item.id, "injuryDate", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>

                      {/* Suivi — inline editable */}
                      <TableCell>
                        <textarea
                          value={draft.injuryNotes}
                          onChange={(e) => updateDraft(item.id, "injuryNotes", e.target.value)}
                          placeholder="Suivi, évolution..."
                          rows={2}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none"
                        />
                      </TableCell>

                      {/* Actions : Guérison uniquement */}
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecoveryTarget(item)}
                          className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                        >
                          <Heart className="mr-1 h-3 w-3" />
                          Guérison
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recovery confirmation */}
      <Dialog open={!!recoveryTarget} onOpenChange={(o) => !o && setRecoveryTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer la guérison</DialogTitle>
            <DialogDescription>
              <strong>{recoveryTarget?.athlete.firstName} {recoveryTarget?.athlete.lastName}</strong> est guéri de <strong>{recoveryTarget?.injury}</strong> ?
              La date de guérison sera enregistrée et son statut repassera à &laquo; Actif &raquo;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecoveryTarget(null)}>
              Annuler
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleRecovery}
              disabled={recovering}
            >
              {recovering ? "..." : "✅ Guéri !"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
