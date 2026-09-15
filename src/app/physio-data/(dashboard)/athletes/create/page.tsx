"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, AlertTriangle } from "lucide-react"

import { Button, Card, TextInput, Textarea, Radio, Modal, Text, Group } from "@mantine/core"

interface DuplicateAthlete {
  id: string
  firstName: string
  lastName: string
  birthDate: string | null
  email: string | null
  isArchived: boolean
}

export default function CreateAthletePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    email: "",
    gender: "",
    heightCm: "",
    weightKg: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Duplicate check state
  const [duplicates, setDuplicates] = useState<DuplicateAthlete[]>([])
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function checkForDuplicates(
    firstName: string,
    lastName: string,
  ): Promise<DuplicateAthlete[]> {
    try {
      const res = await fetch(
        `/physio-data/api/athletes/check-duplicate?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`,
      )
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data.duplicates) ? data.duplicates : []
    } catch {
      return []
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("Le prénom et le nom sont requis")
      return
    }

    // Normalize case
    const normalizedFirstName = formData.firstName.charAt(0).toUpperCase() + formData.firstName.slice(1).toLowerCase()
    const normalizedLastName = formData.lastName.charAt(0).toUpperCase() + formData.lastName.slice(1).toLowerCase()

    // Check for duplicates
    setCheckingDuplicates(true)
    setError(null)
    const found = await checkForDuplicates(normalizedFirstName, normalizedLastName)
    setCheckingDuplicates(false)

    if (found.length > 0) {
      setDuplicates(found)
      setDuplicateModalOpen(true)
      return // Wait for user decision
    }

    // No duplicates — create directly
    await createAthlete(normalizedFirstName, normalizedLastName)
  }

  async function createAthlete(firstName: string, lastName: string) {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        firstName,
        lastName,
        birthDate: formData.birthDate || null,
        phone: formData.phone || null,
        email: formData.email || null,
        gender: formData.gender || null,
        heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
        weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
        notes: formData.notes || null,
      }

      const res = await fetch("/physio-data/api/athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Erreur lors de la création")
      }
      router.push("/physio-data/athletes")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  const handleForceCreate = async () => {
    setDuplicateModalOpen(false)
    const normalizedFirstName = formData.firstName.charAt(0).toUpperCase() + formData.firstName.slice(1).toLowerCase()
    const normalizedLastName = formData.lastName.charAt(0).toUpperCase() + formData.lastName.slice(1).toLowerCase()
    await createAthlete(normalizedFirstName, normalizedLastName)
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
            <Button type="submit" loading={checkingDuplicates || saving}>
              <Save className="mr-2 h-4 w-4" />
              {checkingDuplicates
                ? "Vérification..."
                : saving
                  ? "Enregistrement..."
                  : "Créer l'athlète"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>

      {/* Duplicate warning modal */}
      <Modal
        opened={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        title="Profil similaire existant"
        trapFocus={false}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <Text size="sm" c="dimmed" mb="xs">
                Un ou plusieurs profils avec le même nom existent déjà dans la base de données :
              </Text>
              {duplicates.map((dup) => (
                <div
                  key={dup.id}
                  className="rounded border p-2 mb-2 text-sm"
                >
                  <Text fw={500}>
                    {dup.firstName} {dup.lastName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {dup.birthDate && `Né(e) le ${new Date(dup.birthDate).toLocaleDateString("fr-FR")}`}
                    {dup.email && ` — ${dup.email}`}
                  </Text>
                  <Group mt={4} gap="xs">
                    <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                      {dup.isArchived ? "Archivé" : "Actif"}
                    </span>
                  </Group>
                </div>
              ))}
            </div>
          </div>

          <Text size="sm" ta="center">
            Voulez-vous quand même créer ce nouveau profil ?
          </Text>

          <Group justify="center" mt="sm">
            <Button variant="default" onClick={() => setDuplicateModalOpen(false)}>
              Modifier les informations
            </Button>
            <Button color="orange" onClick={handleForceCreate}>
              Créer quand même
            </Button>
          </Group>
        </div>
      </Modal>
    </div>
  )
}