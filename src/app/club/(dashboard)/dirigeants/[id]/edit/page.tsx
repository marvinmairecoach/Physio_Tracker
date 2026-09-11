"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"

import { Button, Card, TextInput, Checkbox, Text, Group } from "@mantine/core"

interface Role {
  id: string
  name: string
}

interface DirigeantRole {
  role: {
    id: string
    name: string
  }
}

interface Dirigeant {
  id: string
  firstName: string
  lastName: string
  address: string | null
  phone: string | null
  email: string | null
  roles: DirigeantRole[]
}

export default function EditDirigeantPage() {
  const router = useRouter()
  const params = useParams()
  const dirigeantId = params.id as string

  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
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
    async function loadData() {
      try {
        const [dirigeantRes, rolesRes] = await Promise.all([
          fetch(`/api/dirigeants/${dirigeantId}`),
          fetch("/api/dirigeants/roles"),
        ])
        if (!dirigeantRes.ok) throw new Error("Impossible de charger le dirigeant")
        const dirigeant: Dirigeant = await dirigeantRes.json()
        setFormData({
          firstName: dirigeant.firstName ?? "",
          lastName: dirigeant.lastName ?? "",
          address: dirigeant.address ?? "",
          phone: dirigeant.phone ?? "",
          email: dirigeant.email ?? "",
        })
        setSelectedRoleIds(
          (dirigeant.roles ?? []).map((r) => r.role.id).filter(Boolean)
        )
        if (rolesRes.ok) {
          const data = await rolesRes.json()
          setRoles(Array.isArray(data) ? data : data.roles ?? [])
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [dirigeantId])

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
      const res = await fetch(`/api/dirigeants/${dirigeantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de la modification")
      }
      router.push(`/dirigeants/${dirigeantId}`)
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
        <Button variant="outline" onClick={() => router.push(`/dirigeants/${dirigeantId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          Modifier {formData.firstName} {formData.lastName}
        </h1>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder className="max-w-2xl">
        <Card.Section withBorder inheritPadding py="sm">
          <h2 className="text-xl font-semibold">Modifier le dirigeant</h2>
          <p className="text-sm text-gray-500">
            Modifiez les informations du dirigeant ci-dessous.
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
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(`/dirigeants/${dirigeantId}`)}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}