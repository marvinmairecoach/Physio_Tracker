"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react"

import { Button, Card, Table, TextInput, Modal } from "@mantine/core"

interface CategoryInfo {
  id: string
  name: string
  count: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  // Inline editing
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<CategoryInfo | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchCategories() {
    try {
      const res = await fetch("/api/tests/categories")
      if (!res.ok) throw new Error("Erreur lors du chargement")
      const data = await res.json()
      const raw: { id: string; name: string }[] = data.categories ?? []

      // Fetch test types to get counts
      const typesRes = await fetch("/api/tests/types")
      const typesData = await typesRes.json()
      const types: { category: string }[] = Array.isArray(typesData)
        ? typesData
        : typesData.types ?? []

      const countMap = new Map<string, number>()
      for (const t of types) {
        if (t.category) {
          countMap.set(t.category, (countMap.get(t.category) ?? 0) + 1)
        }
      }

      setCategories(
        raw.map((c) => ({
          id: c.id,
          name: c.name,
          count: countMap.get(c.name) ?? 0,
        }))
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/tests/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) throw new Error("Erreur lors de la création")
      setCreateOpen(false)
      setNewName("")
      await fetchCategories()
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  function startEdit(id: string, name: string) {
    setEditingName(id)
    setEditValue(name)
  }

  function cancelEdit() {
    setEditingName(null)
    setEditValue("")
  }

  async function handleRename(id: string) {
    if (!editValue.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tests/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editValue.trim() }),
      })
      if (!res.ok) throw new Error("Erreur lors du renommage")
      setEditingName(null)
      setEditValue("")
      await fetchCategories()
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
      const res = await fetch(
        `/api/tests/categories/${deleteTarget.id}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de la suppression")
      }
      setDeleteTarget(null)
      await fetchCategories()
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Management des catégories de test
        </h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      <Card withBorder className="max-w-none">
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-semibold">Catégories</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les catégories utilisées pour classer les types de tests.
          </p>
        </div>
        <div className="px-6 pb-6 overflow-x-auto">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom de la catégorie</Table.Th>
                <Table.Th ta="center">Types de test</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {categories.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={3} className="text-center text-muted-foreground">
                    Aucune catégorie trouvée
                  </Table.Td>
                </Table.Tr>
              ) : (
                categories.map((cat) => (
                  <Table.Tr key={cat.id}>
                    <Table.Td className="font-medium">
                      {editingName === cat.id ? (
                        <div className="flex items-center gap-2">
                          <TextInput
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1"
                            placeholder="Nouveau nom"
                          />
                          <Button
                            variant="subtle"
                            size="compact-sm"
                            onClick={() => handleRename(cat.id)}
                            disabled={saving}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="subtle"
                            size="compact-sm"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        cat.name
                      )}
                    </Table.Td>
                    <Table.Td ta="center">
                      <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        {cat.count}
                      </span>
                    </Table.Td>
                    <Table.Td ta="right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="compact-sm"
                          onClick={() => startEdit(cat.id, cat.name)}
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Renommer
                        </Button>
                        <Button
                          variant="outline"
                          size="compact-sm"
                          color="red"
                          onClick={() => setDeleteTarget(cat)}
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
        </div>
      </Card>

      {/* Create Modal */}
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvelle catégorie"
        size="sm"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Créez une nouvelle catégorie pour classer les types de tests.
        </p>
        <TextInput
          label="Nom de la catégorie"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ex: Vitesse, Force, Endurance..."
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

      {/* Delete Confirmation */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirmer la suppression"
        size="sm"
      >
        {deleteTarget && (
          <>
            <p className="text-sm text-muted-foreground mb-2">
              Êtes-vous sûr de vouloir supprimer la catégorie{" "}
              <strong>{deleteTarget.name}</strong> ?
            </p>
            {deleteTarget.count > 0 ? (
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
                <strong>Impossible de supprimer :</strong> {deleteTarget.count} type(s)
                de test utilisent encore cette catégorie. Veuillez d&apos;abord
                modifier ces types de test pour utiliser une autre catégorie.
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cette action est irréversible.
              </p>
            )}
          </>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Annuler
          </Button>
          <Button
            color="red"
            onClick={handleDelete}
            disabled={deleting || (deleteTarget?.count ?? 0) > 0}
          >
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}