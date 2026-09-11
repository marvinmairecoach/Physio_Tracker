"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Search, X, UserPlus } from "lucide-react"

import { Button, Card, TextInput, Textarea, NativeSelect } from "@mantine/core"

export default function CreateTeamPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    sport: "",
    gender: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Coach selection
  const [allCoaches, setAllCoaches] = useState<{ id: string; firstName: string; lastName: string }[]>([])
  const [selectedCoaches, setSelectedCoaches] = useState<{ id: string; firstName: string; lastName: string }[]>([])
  const [coachSearch, setCoachSearch] = useState("")
  const [loadingCoaches, setLoadingCoaches] = useState(false)

  useEffect(() => {
    loadCoaches()
  }, [])

  async function loadCoaches() {
    setLoadingCoaches(true)
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        const users = data.users ?? []
        setAllCoaches(
          users.filter((u: {id:string; role:string}) =>
            u.role === "coach" || u.role === "admin"
          )
        )
      }
    } catch {
      // ignore
    } finally {
      setLoadingCoaches(false)
    }
  }

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
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Erreur lors de la création")
      }
      const newTeam = await res.json()

      // Attach selected coaches
      if (selectedCoaches.length > 0) {
        await Promise.all(
          selectedCoaches.map((c) =>
            fetch(`/api/teams/${newTeam.id}/coaches`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: c.id }),
            })
          )
        )
      }

      router.push("/teams")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  function addCoach(c: { id: string; firstName: string; lastName: string }) {
    setSelectedCoaches((prev) => [...prev, c])
    setCoachSearch("")
  }

  function removeCoach(id: string) {
    setSelectedCoaches((prev) => prev.filter((c) => c.id !== id))
  }

  const filteredCoaches = useMemo(
    () =>
      allCoaches
        .filter((c) => !selectedCoaches.some((s) => s.id === c.id))
        .filter((c) => {
          const q = coachSearch.toLowerCase()
          return (
            !q ||
            c.firstName.toLowerCase().includes(q) ||
            c.lastName.toLowerCase().includes(q) ||
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
          )
        }),
    [allCoaches, selectedCoaches, coachSearch]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Créer une équipe</h1>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder className="max-w-2xl">
        <Card.Section withBorder inheritPadding py="sm">
          <h2 className="text-xl font-semibold">Nouvelle équipe</h2>
          <p className="text-sm text-gray-500">
            Remplissez les informations ci-dessous pour créer une nouvelle équipe.
          </p>
        </Card.Section>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <TextInput
            label="Nom"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Nom de l'équipe"
            required
            withAsterisk
          />

          <TextInput
            label="Sport"
            name="sport"
            value={formData.sport}
            onChange={handleChange}
            placeholder="Ex: Football, Basketball..."
          />

          <NativeSelect
            label="Genre"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            data={[
              { value: "", label: "Non spécifié" },
              { value: "M", label: "Masculin" },
              { value: "F", label: "Féminin" },
            ]}
          />

          {/* Coachs */}
          <div>
            <label className="block text-sm font-medium mb-1">Coachs</label>
            {selectedCoaches.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedCoaches.map((c) => (
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
                      onClick={() => removeCoach(c.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Retirer le coach"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-2">Aucun coach sélectionné</p>
            )}

            {loadingCoaches ? (
              <p className="text-sm text-gray-500">Chargement...</p>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <TextInput
                    placeholder="Rechercher un coach à ajouter..."
                    value={coachSearch}
                    onChange={(e) => setCoachSearch(e.target.value)}
                    className="pl-9"
                  />
                  {coachSearch && (
                    <button
                      type="button"
                      onClick={() => setCoachSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {coachSearch && filteredCoaches.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border p-1 mt-1">
                    {filteredCoaches.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => addCoach(c)}
                        className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 flex items-center justify-between"
                      >
                        <span>
                          {c.firstName} {c.lastName}
                        </span>
                        <UserPlus className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
                {coachSearch && filteredCoaches.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">Aucun coach disponible</p>
                )}
              </>
            )}
          </div>

          <Textarea
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Notes optionnelles..."
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Enregistrement..." : "Créer l'équipe"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}