"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"

import { Button, Card, TextInput, Textarea, NativeSelect, Radio } from "@mantine/core"

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
    // Normalize case for first and last name
    const normalizedFirstName = formData.firstName.charAt(0).toUpperCase() + formData.firstName.slice(1).toLowerCase()
    const normalizedLastName = formData.lastName.charAt(0).toUpperCase() + formData.lastName.slice(1).toLowerCase()
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
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
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Créer un athlète</h1>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder className="max-w-2xl">
        <Card.Section withBorder inheritPadding py="sm">
          <h2 className="text-xl font-semibold">Nouvel athlète</h2>
          <p className="text-sm text-gray-500">
            Remplissez les informations ci-dessous pour enregistrer un nouvel athlète.
          </p>
        </Card.Section>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Prénom"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Prénom"
              required
              withAsterisk
            />
            <TextInput
              label="Nom"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Nom"
              required
              withAsterisk
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Date de naissance"
              name="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={handleChange}
            />
            <div>
              <label className="block text-sm font-medium mb-1">Genre</label>
              <Radio.Group
                name="gender"
                value={formData.gender}
                onChange={(val) => setFormData((prev) => ({ ...prev, gender: val }))}
              >
                <div className="flex gap-4">
                  <Radio value="M" label="Masculin" />
                  <Radio value="F" label="Féminin" />
                  {formData.gender && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, gender: "" }))}
                      className="text-xs text-gray-400 hover:text-gray-700 underline ml-2"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </Radio.Group>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
            />
            <TextInput
              label="Téléphone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+336****5678"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextInput
              label="Taille (cm)"
              name="heightCm"
              type="number"
              step="0.1"
              value={formData.heightCm}
              onChange={handleChange}
              placeholder="175"
            />
            <TextInput
              label="Poids (kg)"
              name="weightKg"
              type="number"
              step="0.1"
              value={formData.weightKg}
              onChange={handleChange}
              placeholder="70"
            />
            <NativeSelect
              label="Équipe (optionnel)"
              name="teamId"
              value={formData.teamId}
              onChange={handleChange}
              data={[
                { value: "", label: "Aucune équipe" },
                ...teams.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
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
              {saving ? "Enregistrement..." : "Créer l'athlète"}
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