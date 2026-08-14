"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Pencil, Trash2, Mail, Phone, MapPin } from "lucide-react"

import { Button, Card, Badge, Group, Text, Modal } from "@mantine/core"

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

export default function DirigeantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const dirigeantId = params.id as string

  const [dirigeant, setDirigeant] = useState<Dirigeant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = userRole === "admin"

  useEffect(() => {
    async function fetchData() {
      try {
        const [dirigeantRes, meRes] = await Promise.all([
          fetch(`/api/dirigeants/${dirigeantId}`),
          fetch("/api/auth/me"),
        ])
        if (!dirigeantRes.ok) throw new Error("Dirigeant introuvable")
        setDirigeant(await dirigeantRes.json())
        if (meRes.ok) {
          const meData = await meRes.json()
          setUserRole(meData.user?.role ?? null)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [dirigeantId])

  async function handleDelete() {
    if (!dirigeant) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/dirigeants/${dirigeantId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de la suppression")
      }
      router.push("/dirigeants")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>
  if (!dirigeant) return <div className="p-6 text-center text-gray-500">Dirigeant introuvable</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/dirigeants")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {dirigeant.lastName?.toUpperCase()} {dirigeant.firstName}
        </h1>
        {isAdmin && (
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dirigeants/${dirigeantId}/edit`)}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              color="red"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        )}
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder className="max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Text fw={700} size="xl">{dirigeant.lastName?.toUpperCase()}</Text>
            <Text fw={600} size="xl">{dirigeant.firstName}</Text>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <Text>{dirigeant.address || "Non renseignée"}</Text>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <Text>{dirigeant.phone || "Non renseigné"}</Text>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <Text>{dirigeant.email || "Non renseigné"}</Text>
            </div>
          </div>

          <div>
            <Text fw={500} size="sm" mb="xs">Rôles</Text>
            <Group gap="xs">
              {(dirigeant.roles ?? []).length > 0 ? (
                (dirigeant.roles ?? []).map((r) => (
                  <Badge key={r.role.id} variant="light" color="grape" size="lg">
                    {r.role.name}
                  </Badge>
                ))
              ) : (
                <Text c="dimmed" size="sm">Aucun rôle</Text>
              )}
            </Group>
          </div>
        </div>
      </Card>

      {/* Delete confirmation */}
      <Modal
        opened={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer le dirigeant"
        centered
      >
        <Text size="sm" mb="lg">
          Êtes-vous sûr de vouloir supprimer <strong>{dirigeant?.firstName} {dirigeant?.lastName}</strong> ?<br />
          Cette action est irréversible.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Annuler
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleting}>
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </Group>
      </Modal>
    </div>
  )
}