"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"

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

interface Team {
  id: string
  name: string
}

export default function CreateAthletePage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    email: "",
    gender: "",
    teamId: "",
    heightCm: "",
    weightKg: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch("/api/teams")
        if (res.ok) {
          const data = await res.json()
          setTeams(Array.isArray(data) ? data : data.teams ?? [])
        }
      } catch {
        // Silently fail
      }
    }
    fetchTeams()
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("Le prénom et le nom sont requis")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthDate: formData.birthDate || null,
        phone: formData.phone || null,
        email: formData.email || null,
        gender: formData.gender || null,
        teamId: formData.teamId || null,
        heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
        weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
        notes: formData.notes || null,
      }

      const res = await fetch("/api/athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Erreur lors de la création")
      }
      router.push("/athletes")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Créer un athlète</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Nouvel athlète</CardTitle>
          <CardDescription>
            Remplissez les informations ci-dessous pour enregistrer un nouvel athlète.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  Prénom <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Prénom"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Nom <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Nom"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Date de naissance</Label>
                <Input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Genre</Label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="M"
                      checked={formData.gender === "M"}
                      onChange={handleChange}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-medium">Masculin</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="F"
                      checked={formData.gender === "F"}
                      onChange={handleChange}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-medium">Féminin</span>
                  </label>
                  {formData.gender && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, gender: "" }))}
                      className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+33612345678"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="heightCm">Taille (cm)</Label>
                <Input
                  id="heightCm"
                  name="heightCm"
                  type="number"
                  step="0.1"
                  value={formData.heightCm}
                  onChange={handleChange}
                  placeholder="175"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weightKg">Poids (kg)</Label>
                <Input
                  id="weightKg"
                  name="weightKg"
                  type="number"
                  step="0.1"
                  value={formData.weightKg}
                  onChange={handleChange}
                  placeholder="70"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamId">Équipe (optionnel)</Label>
                <select
                  id="teamId"
                  name="teamId"
                  value={formData.teamId}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Aucune équipe</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Notes optionnelles..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Enregistrement..." : "Créer l'athlète"}
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