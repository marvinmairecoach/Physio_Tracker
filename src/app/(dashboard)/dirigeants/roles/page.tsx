"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react"

import { Button, Card, Table, TextInput, Modal, Text } from "@mantine/core"

interface Role {
  id: string
  name: string
}

export default function DirigeantRolesPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  // Edit modal
  const [editTarget, setEditTarget] = useState<Role | null>(null)
  const [editName, setEditName] = useState("")
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchRoles() {
    try {
      const res = await fetch("/api/dirigeants/roles")
      if (!res.ok) throw new Error("Erreur lors du chargement")
      const data = await res.json()
      setRoles(Array.isArray(data) ? data : data.roles ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/dirigeants/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) throw new Error("Erreur lors de la création")
      setCreateOpen(false)
      setNewName("")
      await fetchRoles()
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  function openEdit(role: Role) {
    setEditTarget(role)
    setEditName(role.name)
  }

  async function handleEdit() {
    if (!editTarget || !editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/dirigeants/roles/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) throw new Error("Erreur lors de la modification")
      setEditTarget(null)
      setEditName("")
      await fetchRoles()
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/dirigeants/roles/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de la suppression")
      }
      setDeleteTarget(null)
      await fetchRoles()
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des rôles dirigeants</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/dirigeants")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau rôle
          </Button>
        </div>
      </div>

      <Card withBorder padding="lg">
        <Text fw={600} size="lg" mb="md">Rôles</Text>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nom</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {roles.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={2}>
                  <Text c="dimmed" ta="center">Aucun rôle trouvé</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              roles.map((role) => (
                <Table.Tr key={role.id}>
                  <Table.Td>
                    <Text fw={500}>{role.name}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="compact-sm"
                        onClick={() => openEdit(role)}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="compact-sm"
                        color="red"
                        onClick={() => setDeleteTarget(role)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Supprimer
                      </Button>
                    </div>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Create Modal */}
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouveau rôle"
        size="sm"
      >
        <TextInput
          label="Nom du rôle"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ex: Président, Trésorier..."
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? "Création..." : "Créer"}
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Modifier le rôle"
        size="sm"
      >
        <TextInput
          label="Nom du rôle"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Nom du rôle"
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setEditTarget(null)}>
            Annuler
          </Button>
          <Button onClick={handleEdit} disabled={saving || !editName.trim()}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirmer la suppression"
        size="sm"
      >
        {deleteTarget && (
          <>
            <Text size="sm" mb="lg">
              Êtes-vous sûr de vouloir supprimer le rôle <strong>{deleteTarget.name}</strong> ?<br />
              Cette action est irréversible.
            </Text>
          </>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Annuler
          </Button>
          <Button color="red" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}