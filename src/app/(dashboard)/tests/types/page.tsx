"use client"

import { useEffect, useState } from "react"
import { Pencil, Plus, Check, X } from "lucide-react"

import { Button, Card, Table, Badge, TextInput, Modal } from "@mantine/core"

interface TestType {
  id: string
  name: string
  category: string
  unit: string
  higherIsBetter: boolean
  normMale: number | null
  normFemale: number | null
}

const CATEGORY_LABELS: Record<string, string> = {
  field: "Terrain",
  force_plate: "Plateforme de force",
  dynamometer: "Dynamomètre",
  anthropometric: "Anthropométrique",
}

export default function TestTypesPage() {
  const [testTypes, setTestTypes] = useState<TestType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newType, setNewType] = useState({
    name: "",
    category: "field",
    unit: "",
    higherIsBetter: true,
    normMale: "",
    normFemale: "",
  })
  const [creating, setCreating] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    unit: "",
    higherIsBetter: true,
    normMale: "",
    normFemale: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTestTypes()
  }, [])

  async function fetchTestTypes() {
    try {
      const res = await fetch("/api/tests/types")
      if (!res.ok) throw new Error("Erreur lors du chargement")
      const data = await res.json()
      setTestTypes(Array.isArray(data) ? data : data.types ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newType.name.trim() || !newType.unit.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/tests/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newType.name,
          category: newType.category,
          unit: newType.unit,
          higherIsBetter: newType.higherIsBetter,
          normMale: newType.normMale || null,
          normFemale: newType.normFemale || null,
        }),
      })
      if (!res.ok) throw new Error("Erreur lors de la création")
      setCreateOpen(false)
      setNewType({ name: "", category: "field", unit: "", higherIsBetter: true, normMale: "", normFemale: "" })
      await fetchTestTypes()
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  function startEdit(t: TestType) {
    setEditingId(t.id)
    setEditForm({
      name: t.name,
      category: t.category,
      unit: t.unit,
      higherIsBetter: t.higherIsBetter,
      normMale: t.normMale !== null ? String(t.normMale) : "",
      normFemale: t.normFemale !== null ? String(t.normFemale) : "",
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleSave(id: string) {
    if (!editForm.name.trim() || !editForm.unit.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tests/types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          category: editForm.category,
          unit: editForm.unit,
          higherIsBetter: editForm.higherIsBetter,
          normMale: editForm.normMale || null,
          normFemale: editForm.normFemale || null,
        }),
      })
      if (!res.ok) throw new Error("Erreur lors de la modification")
      setEditingId(null)
      await fetchTestTypes()
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Types de données</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau type
        </Button>
      </div>

      <Card withBorder className="max-w-none">
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-semibold">Gestion des types de tests</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Définissez les types de tests utilisés pour évaluer les athlètes.
          </p>
        </div>
        <div className="px-6 pb-6 overflow-x-auto">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom</Table.Th>
                <Table.Th>Catégorie</Table.Th>
                <Table.Th>Unité</Table.Th>
                <Table.Th>Supérieur = Meilleur</Table.Th>
                <Table.Th className="text-right">Norme H</Table.Th>
                <Table.Th className="text-right">Norme F</Table.Th>
                <Table.Th className="text-right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {testTypes.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7} className="text-center text-muted-foreground">
                    Aucun type de test défini
                  </Table.Td>
                </Table.Tr>
              ) : (
                testTypes.map((t) => (
                  <Table.Tr key={t.id}>
                    <Table.Td className="font-medium">
                      {editingId === t.id ? (
                        <TextInput
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          className="h-8"
                        />
                      ) : (
                        t.name
                      )}
                    </Table.Td>
                    <Table.Td>
                      {editingId === t.id ? (
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="field">Terrain</option>
                          <option value="force_plate">Plateforme de force</option>
                          <option value="dynamometer">Dynamomètre</option>
                          <option value="anthropometric">Anthropométrique</option>
                        </select>
                      ) : (
                        CATEGORY_LABELS[t.category] ?? t.category
                      )}
                    </Table.Td>
                    <Table.Td>
                      {editingId === t.id ? (
                        <TextInput
                          value={editForm.unit}
                          onChange={(e) => setEditForm((p) => ({ ...p, unit: e.target.value }))}
                          className="h-8 w-20"
                        />
                      ) : (
                        t.unit
                      )}
                    </Table.Td>
                    <Table.Td>
                      {editingId === t.id ? (
                        <select
                          value={editForm.higherIsBetter ? "true" : "false"}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, higherIsBetter: e.target.value === "true" }))
                          }
                          className="flex h-8 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="true">Oui</option>
                          <option value="false">Non</option>
                        </select>
                      ) : (
                        <Badge color={t.higherIsBetter ? "blue" : "gray"}>
                          {t.higherIsBetter ? "Oui" : "Non"}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td className="text-right">
                      {editingId === t.id ? (
                        <TextInput
                          type="number"
                          step="0.01"
                          value={editForm.normMale}
                          onChange={(e) => setEditForm((p) => ({ ...p, normMale: e.target.value }))}
                          placeholder="Ex: 4.5"
                          className="h-8 w-24 ml-auto"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {t.normMale !== null ? t.normMale : "—"}
                        </span>
                      )}
                    </Table.Td>
                    <Table.Td className="text-right">
                      {editingId === t.id ? (
                        <TextInput
                          type="number"
                          step="0.01"
                          value={editForm.normFemale}
                          onChange={(e) => setEditForm((p) => ({ ...p, normFemale: e.target.value }))}
                          placeholder="Ex: 5.2"
                          className="h-8 w-24 ml-auto"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {t.normFemale !== null ? t.normFemale : "—"}
                        </span>
                      )}
                    </Table.Td>
                    <Table.Td className="text-right">
                      {editingId === t.id ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="subtle"
                            size="compact-sm"
                            onClick={() => handleSave(t.id)}
                            disabled={saving}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button variant="subtle" size="compact-sm" onClick={cancelEdit}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="compact-sm" onClick={() => startEdit(t)}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Modifier
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau type de test" size="md">
        <p className="text-sm text-muted-foreground mb-4">
          Créez un nouveau type de test pour les évaluations.
        </p>
        <div className="space-y-4">
          <TextInput
            label="Nom"
            id="new-name"
            value={newType.name}
            onChange={(e) => setNewType((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex: Sprint 30m"
          />
          <TextInput
            label="Catégorie"
            id="new-category"
            component="select"
            value={newType.category}
            onChange={(e) => setNewType((p) => ({ ...p, category: e.target.value }))}
          >
            <option value="field">Terrain</option>
            <option value="force_plate">Plateforme de force</option>
            <option value="dynamometer">Dynamomètre</option>
            <option value="anthropometric">Anthropométrique</option>
          </TextInput>
          <TextInput
            label="Unité"
            id="new-unit"
            value={newType.unit}
            onChange={(e) => setNewType((p) => ({ ...p, unit: e.target.value }))}
            placeholder="Ex: secondes, cm, kg..."
          />
          <TextInput
            label="Supérieur = Meilleur"
            id="new-higher"
            component="select"
            value={newType.higherIsBetter ? "true" : "false"}
            onChange={(e) =>
              setNewType((p) => ({ ...p, higherIsBetter: e.target.value === "true" }))
            }
          >
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </TextInput>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Norme Hommes"
              id="new-norm-male"
              type="number"
              step="0.01"
              value={newType.normMale}
              onChange={(e) => setNewType((p) => ({ ...p, normMale: e.target.value }))}
              placeholder="Ex: 4.5"
            />
            <TextInput
              label="Norme Femmes"
              id="new-norm-female"
              type="number"
              step="0.01"
              value={newType.normFemale}
              onChange={(e) => setNewType((p) => ({ ...p, normFemale: e.target.value }))}
              placeholder="Ex: 5.2"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? "Création..." : "Créer"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}