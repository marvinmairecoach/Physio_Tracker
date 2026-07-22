"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, Search, X, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function EditTeamPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string

  const [formData, setFormData] = useState({
    name: "",
    sport: "",
    gender: "",
    notes: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Coach management
  const [currentCoaches, setCurrentCoaches] = useState<{ id: string; firstName: string; lastName: string }[]>([])
  const [availableCoaches, setAvailableCoaches] = useState<{ id: string; firstName: string; lastName: string }[]>([])
  const [coachSearch, setCoachSearch] = useState("")
  const [addingCoach, setAddingCoach] = useState(false)

  useEffect(() => {
    async function loadTeam() {
      try {
        const [teamRes, usersRes] = await Promise.all([
          fetch(`/api/teams/${teamId}`),
          fetch("/api/users"),
        ])
        if (!teamRes.ok) throw new Error("Impossible de charger l'équipe")
        const team = await teamRes.json()
        setFormData({
          name: team.name ?? "",
          sport: team.sport ?? "",
          gender: team.gender ?? "",
          notes: team.notes ?? "",
        })
        setCurrentCoaches(team.coaches ?? [])

        // Load available coaches/admins
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          const allUsers = usersData.users ?? []
          const alreadyInTeam = new Set((team.coaches ?? []).map((c: {id:string}) => c.id))
          setAvailableCoaches(
            allUsers.filter((u: {id:string; role:string}) =>
              (u.role === "coach" || u.role === "admin") && !alreadyInTeam.has(u.id)
            )
          )
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    loadTeam()
  }, [teamId])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError("Le nom de l'équipe est requis")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de la modification")
      }
      router.push("/teams")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  async function handleAddCoach(userId: string) {
    setAddingCoach(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/coaches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error("Erreur")
      const addedCoach = await res.json()
      setCurrentCoaches((prev) => [...prev, addedCoach])
      setAvailableCoaches((prev) => prev.filter((c) => c.id !== userId))
      setCoachSearch("")
    } catch (err) {
      console.error(err)
    } finally {
      setAddingCoach(false)
    }
  }

  async function handleRemoveCoach(userId: string) {
    try {
      const res = await fetch(`/api/teams/${teamId}/coaches`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error("Erreur")
      setCurrentCoaches((prev) => prev.filter((c) => c.id !== userId))
      // Put the coach back in available list
      const removed = currentCoaches.find((c) => c.id === userId)
      if (removed) setAvailableCoaches((prev) => [...prev, removed].sort((a, b) => a.lastName.localeCompare(b.lastName)))
    } catch (err) {
      console.error(err)
    }
  }

  const filteredAvailable = useMemo(
    () =>
      availableCoaches.filter((c) => {
        const q = coachSearch.toLowerCase()
        return (
          !q ||
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
        )
      }),
    [availableCoaches, coachSearch]
  )

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Modifier l&apos;équipe</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Modifier {formData.name || "l'équipe"}</CardTitle>
          <CardDescription>
            Modifie les informations de l&apos;équipe ci-dessous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nom de l'équipe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <Input
                id="sport"
                name="sport"
                value={formData.sport}
                onChange={handleChange}
                placeholder="Ex: Football, Basketball..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Genre</Label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Non spécifié</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>

            {/* Coachs */}
            <div className="space-y-2">
              <Label>Coachs</Label>
              {currentCoaches.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-2">
                  {currentCoaches.map((c) => (
                    <div
                      key={c.id}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-3 py-1 text-sm"
                    >
                      <span className="text-xs text-blue-500">👤</span>
                      <span className="font-medium text-blue-700">
                        {c.firstName} {c.lastName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoach(c.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                        title="Retirer le coach"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-2">Aucun coach rattaché</p>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un coach à ajouter..."
                  value={coachSearch}
                  onChange={(e) => setCoachSearch(e.target.value)}
                  className="pl-9"
                />
                {coachSearch && (
                  <button
                    type="button"
                    onClick={() => setCoachSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {coachSearch && filteredAvailable.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border p-1 mt-1">
                  {filteredAvailable.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={addingCoach}
                      onClick={() => handleAddCoach(c.id)}
                      className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted flex items-center justify-between"
                    >
                      <span>
                        {c.firstName} {c.lastName}
                      </span>
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
              {coachSearch && filteredAvailable.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">Aucun coach disponible</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Notes optionnelles..."
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}