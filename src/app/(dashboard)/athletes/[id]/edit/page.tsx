"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"

import { Button, Card, TextInput, Textarea, NativeSelect, Radio } from "@mantine/core"

interface Team {
  id: string
  name: string
}

export default function EditAthletePage() {
  const router = useRouter()
  const params = useParams()
  const athleteId = params.id as string

  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
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
    async function loadData() {
      try {
        const [athleteRes, teamsRes] = await Promise.all([
          fetch(`/api/athletes/${athleteId}`),
          fetch("/api/teams"),
        ])
        if (!athleteRes.ok) throw new Error("Impossible de charger l'athlète")
        if (teamsRes.ok) {
          const data = await teamsRes.json()
          setTeams(Array.isArray(data) ? data : data.teams ?? [])
        }
        const athlete = await athleteRes.json()
        setFormData({
          firstName: athlete.firstName ?? "",
          lastName: athlete.lastName ?? "",
          birthDate: athlete.birthDate ? athlete.birthDate.split("T")[0] : "",
          phone: athlete.phone ?? "",
          email: athlete.email ?? "",
          gender: athlete.gender ?? "",
          teamId: athlete.teams?.[0]?.team?.id ?? "",
          heightCm: athlete.heightCm?.toString() ?? "",
          weightKg: athlete.weightKg?.toString() ?? "",
          notes: athlete.notes ?? "",
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [athleteId])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
        heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
        weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
        notes: formData.notes || null,
      }

      const res = await fetch(`/api/athletes/${athleteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de la modification")
      }
      router.push(`/athletes/${athleteId}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          Modifier {formData.firstName} {formData.lastName}
        </h1>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder className="max-w-2xl">
        <Card.Section withBorder inheritPadding py="sm">
          <h2 className="text-xl font-semibold">Modifier l&apos;athlète</h2>
          <p className="text-sm text-gray-500">
            Modifie les informations de l&apos;athlète ci-dessous.
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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