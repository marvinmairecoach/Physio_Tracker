"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, Search, X, UserPlus } from "lucide-react"

import { Button, Card, TextInput, Textarea, NativeSelect } from "@mantine/core"

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

  // Test type visibility
  const [allTestTypes, setAllTestTypes] = useState<{ id: string; name: string; category: string; unit: string }[]>([])
  const [visibleTestTypeIds, setVisibleTestTypeIds] = useState<Set<string>>(new Set())
  const [testTypesLoaded, setTestTypesLoaded] = useState(false)

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

        // Load test types and team visibility
        const [testTypesRes, teamTestTypesRes] = await Promise.all([
          fetch("/api/tests/types"),
          fetch(`/api/teams/${teamId}/test-types`),
        ])
        if (testTypesRes.ok) {
          const ttData = await testTypesRes.json()
          setAllTestTypes(Array.isArray(ttData) ? ttData : ttData.testTypes ?? [])
        }
        if (teamTestTypesRes.ok) {
          const ttData = await teamTestTypesRes.json()
          const visibleIds = new Set<string>()
          for (const tt of (ttData.testTypes ?? [])) {
            if (tt.visible) visibleIds.add(tt.id)
          }
          setVisibleTestTypeIds(visibleIds)
        }
        setTestTypesLoaded(true)
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

      // Save test type visibility
      const testTypesRes = await fetch(`/api/teams/${teamId}/test-types`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testTypeIds: Array.from(visibleTestTypeIds) }),
      })
      if (!testTypesRes.ok) {
        const errData = await testTypesRes.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de la sauvegarde des types de test")
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

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Modifier l&apos;équipe</h1>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder className="max-w-2xl">
        <Card.Section withBorder inheritPadding py="sm">
          <h2 className="text-xl font-semibold">Modifier {formData.name || "l'équipe"}</h2>
          <p className="text-sm text-gray-500">
            Modifie les informations de l'équipe ci-dessous.
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
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Retirer le coach"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-2">Aucun coach rattaché</p>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <TextInput
                placeholder="Rechercher un coach à ajouter..."
                value={coachSearch}
                onChange={(e) => setCoachSearch(e.target.value)}
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
            {coachSearch && filteredAvailable.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border p-1 mt-1">
                {filteredAvailable.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={addingCoach}
                    onClick={() => handleAddCoach(c.id)}
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
            {coachSearch && filteredAvailable.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">Aucun coach disponible</p>
            )}
          </div>

          {/* Types de test visibles */}
          <div>
            <label className="block text-sm font-medium mb-1">Types de test visibles</label>
            {!testTypesLoaded ? (
              <p className="text-sm text-gray-500">Chargement...</p>
            ) : allTestTypes.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun type de test disponible</p>
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-1">
                {allTestTypes.map((tt) => (
                  <label
                    key={tt.id}
                    className="flex items-center gap-2 cursor-pointer py-0.5 text-sm hover:text-blue-700 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={visibleTestTypeIds.has(tt.id)}
                      onChange={(e) => {
                        const next = new Set(visibleTestTypeIds)
                        if (e.target.checked) {
                          next.add(tt.id)
                        } else {
                          next.delete(tt.id)
                        }
                        setVisibleTestTypeIds(next)
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{tt.name}</span>
                    <span className="text-xs text-gray-400">({tt.category} - {tt.unit})</span>
                  </label>
                ))}
              </div>
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
              {saving ? "Enregistrement..." : "Enregistrer les modifications"}
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