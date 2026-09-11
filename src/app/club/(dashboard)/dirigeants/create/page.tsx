"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"

import { Button, Card, TextInput, Checkbox, Group, Text } from "@mantine/core"

interface Role {
  id: string
  name: string
}

export default function CreateDirigeantPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    phone: "",
    email: "",
  })
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await fetch("/api/dirigeants/roles")
        if (res.ok) {
          const data = await res.json()
          setRoles(Array.isArray(data) ? data : data.roles ?? [])
        }
      } catch {
        // Silently fail
      }
    }
    fetchRoles()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function toggleRole(roleId: string) {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("Le prénom et le nom sont requis")
      return
    }
    const normalizedFirstName = formData.firstName.charAt(0).toUpperCase() + formData.firstName.slice(1).toLowerCase()
    const normalizedLastName = formData.lastName.charAt(0).toUpperCase() + formData.lastName.slice(1).toLowerCase()
    setSaving(true)
    setError(null)
    try {
      const body = {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        roleIds: selectedRoleIds,
      }
      const res = await fetch("/api/dirigeants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Erreur lors de la création")
      }
      const newDirigeant = await res.json()
      const newId = newDirigeant.id || newDirigeant.dirigeant?.id
      if (newId) {
        router.push(`/dirigeants/${newId}`)
      } else {
        router.push("/dirigeants")
      }
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
        <Button variant="outline" onClick={() => router.push("/dirigeants")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Créer un dirigeant</h1>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder className="max-w-2xl">
        <Card.Section withBorder inheritPadding py="sm">
          <h2 className="text-xl font-semibold">Nouveau dirigeant</h2>
          <p className="text-sm text-gray-500">
            Remplissez les informations ci-dessous pour enregistrer un nouveau dirigeant.
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

          <TextInput
            label="Adresse postale"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Adresse postale"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Téléphone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+336****5678"
            />
            <TextInput
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <Text fw={500} size="sm" mb="xs">Rôles</Text>
            {roles.length === 0 ? (
              <Text c="dimmed" size="sm">Aucun rôle disponible</Text>
            ) : (
              <div className="flex flex-wrap gap-3">
                {roles.map((role) => (
                  <Checkbox
                    key={role.id}
                    label={role.name}
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Création..." : "Créer"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/dirigeants")}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}