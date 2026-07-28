"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, ArrowUpDown, ArrowUp, ArrowDown, FolderKanban, Trash2 } from "lucide-react"

import { Button, Card, Table, Badge, TextInput, Modal, Switch, NativeSelect } from "@mantine/core"

interface TestType {
  id: string
  name: string
  category: string
  unit: string
  higherIsBetter: boolean
  normMale: number | null
  normFemale: number | null
  showOnTeamPage: boolean
  isUnilateral: boolean
}

interface Category {
  id: string
  name: string
}

type SortField = "name" | "category" | "unit"
type SortDir = "asc" | "desc"

// Fallback — categories now come from the API as [{id, name}]
// The category value is the name string directly (e.g., "Vitesse")
const CATEGORY_LABELS: Record<string, string> = {}

export default function TestTypesPage() {
  const router = useRouter()
  const [testTypes, setTestTypes] = useState<TestType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [existingCategories, setExistingCategories] = useState<Category[]>([])

  // Sort state
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newType, setNewType] = useState({
    name: "",
    category: "",
    unit: "",
    higherIsBetter: true,
    normMale: "",
    normFemale: "",
    showOnTeamPage: true,
    isUnilateral: false,
  })
  const [creating, setCreating] = useState(false)

  // Edit modal state
  const [editTarget, setEditTarget] = useState<TestType | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    unit: "",
    higherIsBetter: true,
    normMale: "",
    normFemale: "",
    showOnTeamPage: true,
    isUnilateral: false,
  })
  const [saving, setSaving] = useState(false)

  // New category modal
  const [newCatModalOpen, setNewCatModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<TestType | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchTestTypes()
    fetchCategories()
  }, [])

  async function fetchCategories() {
    try {
      const res = await fetch("/api/tests/categories")
      if (res.ok) {
        const data = await res.json()
        setExistingCategories(data.categories ?? [])
      }
    } catch {
      // Silent fail
    }
  }

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

  async function handleCreateCategory() {
    if (!newCatName.trim()) return
    setCreatingCategory(true)
    try {
      const res = await fetch("/api/tests/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim() }),
      })
      if (!res.ok) throw new Error("Erreur lors de la création de la catégorie")
      await fetchCategories()
      const createdName = newCatName.trim()
      // If the create modal is open, select the new category
      if (createOpen) {
        setNewType((p) => ({ ...p, category: createdName }))
      }
      // If the edit modal is open, select the new category
      if (editModalOpen) {
        setEditForm((p) => ({ ...p, category: createdName }))
      }
      setNewCatModalOpen(false)
      setNewCatName("")
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setCreatingCategory(false)
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
          showOnTeamPage: newType.showOnTeamPage,
          isUnilateral: newType.isUnilateral,
        }),
      })
      if (!res.ok) throw new Error("Erreur lors de la création")
      setCreateOpen(false)
      setNewType({ name: "", category: "", unit: "", higherIsBetter: true, normMale: "", normFemale: "", showOnTeamPage: true, isUnilateral: false })
      await fetchTestTypes()
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  function openEditModal(t: TestType) {
    setEditTarget(t)
    setEditForm({
      name: t.name,
      category: t.category,
      unit: t.unit,
      higherIsBetter: t.higherIsBetter,
      normMale: t.normMale !== null ? String(t.normMale) : "",
      normFemale: t.normFemale !== null ? String(t.normFemale) : "",
      showOnTeamPage: t.showOnTeamPage,
      isUnilateral: t.isUnilateral,
    })
    setEditModalOpen(true)
  }

  function closeEditModal() {
    setEditModalOpen(false)
    setEditTarget(null)
  }

  async function handleSave() {
    if (!editTarget || !editForm.name.trim() || !editForm.unit.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tests/types/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          category: editForm.category,
          unit: editForm.unit,
          higherIsBetter: editForm.higherIsBetter,
          normMale: editForm.normMale || null,
          normFemale: editForm.normFemale || null,
          showOnTeamPage: editForm.showOnTeamPage,
          isUnilateral: editForm.isUnilateral,
        }),
      })
      if (!res.ok) throw new Error("Erreur lors de la modification")
      closeEditModal()
      await fetchTestTypes()
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleShowOnTeamPage(testType: TestType) {
    try {
      const res = await fetch(`/api/tests/types/${testType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showOnTeamPage: !testType.showOnTeamPage,
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      await fetchTestTypes()
    } catch (err: unknown) {
      console.error(err)
    }
  }

  async function handleToggleIsUnilateral(testType: TestType) {
    try {
      const res = await fetch(`/api/tests/types/${testType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isUnilateral: !testType.isUnilateral,
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      await fetchTestTypes()
    } catch (err: unknown) {
      console.error(err)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tests/types/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erreur lors de la suppression")
      setDeleteTarget(null)
      await fetchTestTypes()
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-muted-foreground/40" />
    }
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
    )
  }

  const sortedTestTypes = useMemo(() => {
    if (!sortField) return testTypes
    return [...testTypes].sort((a, b) => {
      const aVal = (a[sortField] ?? "").toLowerCase()
      const bVal = (b[sortField] ?? "").toLowerCase()
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1
      return 0
    })
  }, [testTypes, sortField, sortDir])

  const categorySelectData = [
    { value: "", label: "Sélectionner une catégorie" },
    ...existingCategories.map((c) => ({ value: c.name, label: c.name })),
  ]

  function getEditCategoryData() {
    const names = existingCategories.map((c) => c.name)
    const data = [
      { value: "", label: "Sélectionner une catégorie" },
      ...existingCategories.map((c) => ({ value: c.name, label: c.name })),
    ]
    if (editForm.category && !names.includes(editForm.category)) {
      data.push({ value: editForm.category, label: editForm.category })
    }
    return data
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Types de données</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/categories")}>
            <FolderKanban className="mr-2 h-4 w-4" />
            Gérer les catégories
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau type
          </Button>
        </div>
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
                <Table.Th>
                  <button onClick={() => handleSort("name")} className="inline-flex items-center gap-0 bg-transparent border-none cursor-pointer font-inherit text-inherit p-0 hover:underline">
                    Nom
                    <SortIcon field="name" />
                  </button>
                </Table.Th>
                <Table.Th>
                  <button onClick={() => handleSort("category")} className="inline-flex items-center gap-0 bg-transparent border-none cursor-pointer font-inherit text-inherit p-0 hover:underline">
                    Catégorie
                    <SortIcon field="category" />
                  </button>
                </Table.Th>
                <Table.Th>
                  <button onClick={() => handleSort("unit")} className="inline-flex items-center gap-0 bg-transparent border-none cursor-pointer font-inherit text-inherit p-0 hover:underline">
                    Unité
                    <SortIcon field="unit" />
                  </button>
                </Table.Th>
                <Table.Th ta="center">Supérieur = Meilleur</Table.Th>
                <Table.Th ta="center">Norme H</Table.Th>
                <Table.Th ta="center">Norme F</Table.Th>
                <Table.Th ta="center">Afficher équipe</Table.Th>
                <Table.Th ta="center">Test unilatéral</Table.Th>
                <Table.Th ta="center">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedTestTypes.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={9} className="text-center text-muted-foreground">
                    Aucun type de test défini
                  </Table.Td>
                </Table.Tr>
              ) : (
                sortedTestTypes.map((t) => (
                  <Table.Tr key={t.id}>
                    <Table.Td className="font-medium">{t.name}</Table.Td>
                    <Table.Td>{CATEGORY_LABELS[t.category] ?? t.category}</Table.Td>
                    <Table.Td>{t.unit}</Table.Td>
                    <Table.Td ta="center">
                      <Badge color={t.higherIsBetter ? "blue" : "gray"}>
                        {t.higherIsBetter ? "Oui" : "Non"}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="center">
                      <span className="text-sm font-medium">
                        {t.normMale !== null ? t.normMale : "—"}
                      </span>
                    </Table.Td>
                    <Table.Td ta="center">
                      <span className="text-sm font-medium">
                        {t.normFemale !== null ? t.normFemale : "—"}
                      </span>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Switch
                        checked={t.showOnTeamPage}
                        onChange={() => handleToggleShowOnTeamPage(t)}
                        size="sm"
                      />
                    </Table.Td>
                    <Table.Td ta="center">
                      <Switch
                        checked={t.isUnilateral}
                        onChange={() => handleToggleIsUnilateral(t)}
                        size="sm"
                      />
                    </Table.Td>
                    <Table.Td ta="center">
                      <div className="flex justify-center gap-1">
                        <Button variant="outline" size="compact-sm" onClick={() => openEditModal(t)}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Modifier
                        </Button>
                        <Button variant="outline" size="compact-sm" color="red" onClick={() => setDeleteTarget(t)}>
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

      {/* Edit Modal */}
      <Modal opened={editModalOpen} onClose={closeEditModal} title="Modifier le type de test" size="md">
        <p className="text-sm text-muted-foreground mb-4">
          Modifiez les informations du type de test.
        </p>
        <div className="space-y-4">
          <TextInput
            label="Nom"
            id="edit-name"
            value={editForm.name}
            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex: Sprint 30m"
          />
          <div>
            <label className="block text-sm font-medium mb-1">Catégorie</label>
            <div className="flex items-center gap-1">
              <NativeSelect
                data={getEditCategoryData()}
                value={editForm.category}
                onChange={(e) => setEditForm((p) => ({ ...p, category: e.currentTarget.value }))}
                className="flex-1"
                size="sm"
              />
              <Button
                variant="outline"
                size="compact-sm"
                onClick={() => setNewCatModalOpen(true)}
                title="Nouvelle catégorie"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <TextInput
            label="Unité"
            id="edit-unit"
            value={editForm.unit}
            onChange={(e) => setEditForm((p) => ({ ...p, unit: e.target.value }))}
            placeholder="Ex: secondes, cm, kg..."
          />
          <TextInput
            label="Supérieur = Meilleur"
            id="edit-higher"
            component="select"
            value={editForm.higherIsBetter ? "true" : "false"}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, higherIsBetter: e.target.value === "true" }))
            }
          >
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </TextInput>
          <div className="flex items-center gap-3 py-2">
            <Switch
              label="Afficher dans les résultats de l'équipe"
              id="edit-show-team"
              checked={editForm.showOnTeamPage}
              onChange={(e) => setEditForm((p) => ({ ...p, showOnTeamPage: e.currentTarget.checked }))}
            />
          </div>
          <div className="flex items-center gap-3 py-2">
            <Switch
              label="Test unilatéral"
              id="edit-is-unilateral"
              checked={editForm.isUnilateral}
              onChange={(e) => setEditForm((p) => ({ ...p, isUnilateral: e.currentTarget.checked }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Norme Hommes"
              id="edit-norm-male"
              type="number"
              step="0.01"
              value={editForm.normMale}
              onChange={(e) => setEditForm((p) => ({ ...p, normMale: e.target.value }))}
              placeholder="Ex: 4.5"
            />
            <TextInput
              label="Norme Femmes"
              id="edit-norm-female"
              type="number"
              step="0.01"
              value={editForm.normFemale}
              onChange={(e) => setEditForm((p) => ({ ...p, normFemale: e.target.value }))}
              placeholder="Ex: 5.2"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={closeEditModal}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </Modal>

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
          <div>
            <label className="block text-sm font-medium mb-1">Catégorie</label>
            <div className="flex items-center gap-1">
              <NativeSelect
                data={categorySelectData}
                value={newType.category}
                onChange={(e) => setNewType((p) => ({ ...p, category: e.currentTarget.value }))}
                className="flex-1"
                size="sm"
              />
              <Button
                variant="outline"
                size="compact-sm"
                onClick={() => setNewCatModalOpen(true)}
                title="Nouvelle catégorie"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
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
          <div className="flex items-center gap-3 py-2">
            <Switch
              label="Afficher dans les résultats de l'équipe"
              id="new-show-team"
              checked={newType.showOnTeamPage}
              onChange={(e) => setNewType((p) => ({ ...p, showOnTeamPage: e.currentTarget.checked }))}
            />
          </div>
          <div className="flex items-center gap-3 py-2">
            <Switch
              label="Test unilatéral"
              id="new-is-unilateral"
              checked={newType.isUnilateral}
              onChange={(e) => setNewType((p) => ({ ...p, isUnilateral: e.currentTarget.checked }))}
            />
          </div>
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

      {/* Delete Confirmation Modal */}
      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmer la suppression" size="sm">
        {deleteTarget && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Êtes-vous sûr de vouloir supprimer le type de test <strong>{deleteTarget.name}</strong> ?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
              <Button color="red" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* New Category Modal */}
      <Modal opened={newCatModalOpen} onClose={() => { setNewCatModalOpen(false); setNewCatName(""); }} title="Nouvelle catégorie" size="sm">
        <p className="text-sm text-muted-foreground mb-4">
          Créez une nouvelle catégorie de test.
        </p>
        <TextInput
          label="Nom de la catégorie"
          value={newCatName}
          onChange={(e) => setNewCatName(e.currentTarget.value)}
          placeholder="Ex: Vitesse, Force..."
          data-autofocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => { setNewCatModalOpen(false); setNewCatName(""); }}>
            Annuler
          </Button>
          <Button onClick={handleCreateCategory} disabled={creatingCategory || !newCatName.trim()}>
            {creatingCategory ? "Création..." : "Créer"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}