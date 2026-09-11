"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, ArrowUpDown, ArrowUp, ArrowDown, FolderKanban, Trash2, X } from "lucide-react"

import { Button, Card, Table, Badge, TextInput, Modal } from "@mantine/core"

interface TestType {
  id: string
  name: string
  category: string
  unit: string
  higherIsBetter: boolean
  normMale: number | null
  normFemale: number | null
  isUnilateral: boolean
  isCalculated?: boolean
  formula?: string | null
  formulaInputs?: { testTypeId: string; alias: string }[] | null
}

interface Category {
  id: string
  name: string
}

type SortField = "name" | "category" | "unit"
type SortDir = "asc" | "desc"

interface FormulaInputEntry {
  testTypeId: string
  alias: string
}

const BUILTIN_VARS = [
  { name: "age", label: "Âge de l'athlète", description: "Calculé depuis la date de naissance" },
  { name: "poids", label: "Poids (kg)", description: "Poids actuel de l'athlète" },
  { name: "taille", label: "Taille (cm)", description: "Taille de l'athlète" },
  { name: "genre", label: "Genre (M=1, F=2)", description: "1 pour homme, 2 pour femme" },
]

/** Simple toggle switch using native checkbox */
function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  id: string
}) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      {label && <span className="text-sm">{label}</span>}
    </label>
  )
}

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField
  sortField: SortField | null
  sortDir: SortDir
}) {
  if (sortField !== field) {
    return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-muted-foreground/40" />
  }
  return sortDir === "asc" ? (
    <ArrowUp className="ml-1 inline h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
  )
}

/** Render the formula configuration section (shared between create and edit) */
function FormulaConfigSection({
  inputs,
  formula,
  onFormulaChange,
  onAddInput,
  onRemoveInput,
  onUpdateAlias,
  getTestTypeName,
}: {
  inputs: FormulaInputEntry[]
  formula: string
  onFormulaChange: (v: string) => void
  onAddInput: () => void
  onRemoveInput: (testTypeId: string) => void
  onUpdateAlias: (testTypeId: string, alias: string) => void
  getTestTypeName: (id: string) => string
}) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-3">
      <p className="text-xs font-medium text-blue-700">Configuration du test calculé</p>

      {/* Formula inputs: selected test types */}
      <div>
        <label className="block text-xs font-medium text-blue-600 mb-1">
          Types de test en entrée
        </label>
        {inputs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic mb-2">
            Aucun type de test source sélectionné
          </p>
        ) : (
          <div className="space-y-1.5 mb-2">
            {inputs.map((input) => (
              <div key={input.testTypeId} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 min-w-[120px] truncate">
                  {getTestTypeName(input.testTypeId)}
                </span>
                <span className="text-xs text-gray-400">→</span>
                <TextInput
                  size="xs"
                  placeholder="alias"
                  value={input.alias}
                  onChange={(e) => onUpdateAlias(input.testTypeId, e.target.value)}
                  className="flex-1"
                  styles={{ input: { fontSize: "0.75rem" } }}
                />
                <button
                  type="button"
                  onClick={() => onRemoveInput(input.testTypeId)}
                  className="p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="compact-xs" onClick={onAddInput}>
          <Plus className="mr-1 h-3 w-3" />
          Ajouter un type de test
        </Button>
      </div>

      {/* Built-in variables */}
      <div>
        <label className="block text-xs font-medium text-blue-600 mb-1">
          Variables prédéfinies disponibles
        </label>
        <div className="flex flex-wrap gap-1.5">
          {BUILTIN_VARS.map((v) => (
            <span
              key={v.name}
              className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
              title={v.description}
            >
              <code>{`{${v.name}}`}</code>
            </span>
          ))}
        </div>
      </div>

      {/* Formula */}
      <div>
        <label className="block text-xs font-medium text-blue-600 mb-1">
          Formule <span className="text-gray-400 font-normal">(ex: {`{vitesse} / {temps} * 3.6`})</span>
        </label>
        <TextInput
          size="xs"
          value={formula}
          onChange={(e) => onFormulaChange(e.target.value)}
          placeholder={'Ex: {distance} / {temps} * 3.6'}
        />
      </div>
    </div>
  )
}

/** Picker modal for selecting a test type as formula input */
function FormulaInputPickerModal({
  opened,
  available,
  onClose,
  onSelect,
}: {
  opened: boolean
  available: TestType[]
  onClose: () => void
  onSelect: (tt: TestType) => void
}) {
  const [inputSearch, setInputSearch] = useState("")

  useEffect(() => {
    if (!opened) setInputSearch("")
  }, [opened])

  const filtered = available.filter(
    (t) =>
      !inputSearch ||
      t.name.toLowerCase().includes(inputSearch.toLowerCase()) ||
      t.category?.toLowerCase().includes(inputSearch.toLowerCase())
  )

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Ajouter un type de test source"
      size="sm"
      trapFocus={false}
      returnFocus={false}
    >
      <TextInput
        placeholder="Rechercher un type de test..."
        value={inputSearch}
        onChange={(e) => setInputSearch(e.target.value)}
        size="xs"
        className="mb-2"
      />
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {available.length === 0
            ? "Tous les types de test sont déjà utilisés comme entrée."
            : "Aucun résultat trouvé."}
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-blue-50 transition-colors"
            >
              <span className="font-medium">{t.name}</span>
              <span className="text-xs text-muted-foreground ml-2">({t.category})</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

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
    isUnilateral: false,
    isCalculated: false,
    formula: "",
    formulaInputs: [] as FormulaInputEntry[],
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
    isUnilateral: false,
    isCalculated: false,
    formula: "",
    formulaInputs: [] as FormulaInputEntry[],
  })
  const [saving, setSaving] = useState(false)

  // New category modal
  const [newCatModalOpen, setNewCatModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<TestType | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Pick formula input test type
  const [pickInputOpen, setPickInputOpen] = useState<"create" | "edit" | null>(null)

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
      if (createOpen) {
        setNewType((p) => ({ ...p, category: createdName }))
      }
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

  /** Get non-calculated test types excluding already-selected ones */
  function getAvailableInputTypes(currentInputs: FormulaInputEntry[]): TestType[] {
    const selectedIds = new Set(currentInputs.map((i) => i.testTypeId))
    return testTypes.filter(
      (t) => !t.isCalculated && !selectedIds.has(t.id)
    )
  }

  function addFormulaInput(target: "create" | "edit", testType: TestType, alias: string) {
    const entry: FormulaInputEntry = { testTypeId: testType.id, alias }
    if (target === "create") {
      setNewType((p) => ({ ...p, formulaInputs: [...p.formulaInputs, entry] }))
    } else {
      setEditForm((p) => ({ ...p, formulaInputs: [...p.formulaInputs, entry] }))
    }
    setPickInputOpen(null)
  }

  function removeFormulaInput(target: "create" | "edit", testTypeId: string) {
    if (target === "create") {
      setNewType((p) => ({
        ...p,
        formulaInputs: p.formulaInputs.filter((i) => i.testTypeId !== testTypeId),
      }))
    } else {
      setEditForm((p) => ({
        ...p,
        formulaInputs: p.formulaInputs.filter((i) => i.testTypeId !== testTypeId),
      }))
    }
  }

  function updateAlias(target: "create" | "edit", testTypeId: string, alias: string) {
    const updater = (inputs: FormulaInputEntry[]) =>
      inputs.map((i) => (i.testTypeId === testTypeId ? { ...i, alias } : i))
    if (target === "create") {
      setNewType((p) => ({ ...p, formulaInputs: updater(p.formulaInputs) }))
    } else {
      setEditForm((p) => ({ ...p, formulaInputs: updater(p.formulaInputs) }))
    }
  }

  function getTestTypeName(id: string): string {
    return testTypes.find((t) => t.id === id)?.name ?? id
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
          isUnilateral: newType.isUnilateral,
          isCalculated: newType.isCalculated,
          formula: newType.isCalculated ? newType.formula : null,
          formulaInputs: newType.isCalculated ? newType.formulaInputs : undefined,
        }),
      })
      if (!res.ok) throw new Error("Erreur lors de la création")
      setCreateOpen(false)
      setNewType({ name: "", category: "", unit: "", higherIsBetter: true, normMale: "", normFemale: "", isUnilateral: false, isCalculated: false, formula: "", formulaInputs: [] })
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
      isUnilateral: t.isUnilateral,
      isCalculated: t.isCalculated ?? false,
      formula: t.formula ?? "",
      formulaInputs: (t.formulaInputs as FormulaInputEntry[]) ?? [],
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
          isUnilateral: editForm.isUnilateral,
          isCalculated: editForm.isCalculated,
          formula: editForm.isCalculated ? editForm.formula : null,
          formulaInputs: editForm.isCalculated ? editForm.formulaInputs : undefined,
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

  async function handleToggleIsUnilateral(testType: TestType) {
    try {
      const res = await fetch(`/api/tests/types/${testType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUnilateral: !testType.isUnilateral }),
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
                    <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                  </button>
                </Table.Th>
                <Table.Th>
                  <button onClick={() => handleSort("category")} className="inline-flex items-center gap-0 bg-transparent border-none cursor-pointer font-inherit text-inherit p-0 hover:underline">
                    Catégorie
                    <SortIcon field="category" sortField={sortField} sortDir={sortDir} />
                  </button>
                </Table.Th>
                <Table.Th>
                  <button onClick={() => handleSort("unit")} className="inline-flex items-center gap-0 bg-transparent border-none cursor-pointer font-inherit text-inherit p-0 hover:underline">
                    Unité
                    <SortIcon field="unit" sortField={sortField} sortDir={sortDir} />
                  </button>
                </Table.Th>
                <Table.Th ta="center">Supérieur = Meilleur</Table.Th>
                <Table.Th ta="center">Norme H</Table.Th>
                <Table.Th ta="center">Norme F</Table.Th>
                <Table.Th ta="center">Unilatéral</Table.Th>
                <Table.Th ta="center">Calculé</Table.Th>
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
                    <Table.Td>{t.category}</Table.Td>
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
                      <Toggle
                        id={`uni-${t.id}`}
                        checked={t.isUnilateral}
                        onChange={() => handleToggleIsUnilateral(t)}
                        label=""
                      />
                    </Table.Td>
                    <Table.Td ta="center">
                      {t.isCalculated ? (
                        <Badge color="violet">Oui</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
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
      <Modal opened={editModalOpen} onClose={closeEditModal} title="Modifier le type de test" size="md" trapFocus={false} returnFocus={false} transitionProps={{ duration: 0, timingFunction: "ease" }} keepMounted={false}>
        <p className="text-sm text-muted-foreground mb-4">
          Modifiez les informations du type de test.
        </p>
        <div className="space-y-4">
          <TextInput
            label="Nom"
            value={editForm.name}
            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex: Sprint 30m"
          />
          <div>
            <label className="block text-sm font-medium mb-1">Catégorie</label>
            <div className="flex items-center gap-1">
              <select
                value={editForm.category}
                onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Sélectionner une catégorie</option>
                {existingCategories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                {editForm.category && !existingCategories.some((c) => c.name === editForm.category) && (
                  <option value={editForm.category}>{editForm.category}</option>
                )}
              </select>
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
            value={editForm.unit}
            onChange={(e) => setEditForm((p) => ({ ...p, unit: e.target.value }))}
            placeholder="Ex: secondes, cm, kg..."
          />
          <TextInput
            label="Supérieur = Meilleur"
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
            <Toggle
              id="edit-is-unilateral"
              checked={editForm.isUnilateral}
              onChange={(v) => setEditForm((p) => ({ ...p, isUnilateral: v }))}
              label="Test unilatéral"
            />
          </div>
          <div className="flex items-center gap-3 py-2">
            <Toggle
              id="edit-is-calculated"
              checked={editForm.isCalculated}
              onChange={(v) => setEditForm((p) => ({ ...p, isCalculated: v }))}
              label="Test calculé (formule)"
            />
          </div>
          <div style={{ display: editForm.isCalculated ? "block" : "none" }}>
            <FormulaConfigSection
              inputs={editForm.formulaInputs}
              formula={editForm.formula}
              onFormulaChange={(v) => setEditForm((p) => ({ ...p, formula: v }))}
              onAddInput={() => setPickInputOpen("edit")}
              onRemoveInput={(id) => removeFormulaInput("edit", id)}
              onUpdateAlias={(id, alias) => updateAlias("edit", id, alias)}
              getTestTypeName={getTestTypeName}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Norme Hommes"
              type="number"
              step="0.01"
              value={editForm.normMale}
              onChange={(e) => setEditForm((p) => ({ ...p, normMale: e.target.value }))}
              placeholder="Ex: 4.5"
            />
            <TextInput
              label="Norme Femmes"
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
      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau type de test" size="md" trapFocus={false} returnFocus={false} transitionProps={{ duration: 0, timingFunction: "ease" }} keepMounted={false}>
        <p className="text-sm text-muted-foreground mb-4">
          Créez un nouveau type de test pour les évaluations.
        </p>
        <div className="space-y-4">
          <TextInput
            label="Nom"
            value={newType.name}
            onChange={(e) => setNewType((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex: Sprint 30m"
          />
          <div>
            <label className="block text-sm font-medium mb-1">Catégorie</label>
            <div className="flex items-center gap-1">
              <select
                value={newType.category}
                onChange={(e) => setNewType((p) => ({ ...p, category: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Sélectionner une catégorie</option>
                {existingCategories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
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
            value={newType.unit}
            onChange={(e) => setNewType((p) => ({ ...p, unit: e.target.value }))}
            placeholder="Ex: secondes, cm, kg..."
          />
          <TextInput
            label="Supérieur = Meilleur"
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
            <Toggle
              id="new-is-unilateral"
              checked={newType.isUnilateral}
              onChange={(v) => setNewType((p) => ({ ...p, isUnilateral: v }))}
              label="Test unilatéral"
            />
          </div>
          <div className="flex items-center gap-3 py-2">
            <Toggle
              id="new-is-calculated"
              checked={newType.isCalculated}
              onChange={(v) => {
                setNewType((p) => ({ ...p, isCalculated: v, formula: "", formulaInputs: [] }))
              }}
              label="Test calculé (formule)"
            />
          </div>
          <div style={{ display: newType.isCalculated ? "block" : "none" }}>
            <FormulaConfigSection
              inputs={newType.formulaInputs}
              formula={newType.formula}
              onFormulaChange={(v) => setNewType((p) => ({ ...p, formula: v }))}
              onAddInput={() => setPickInputOpen("create")}
              onRemoveInput={(id) => removeFormulaInput("create", id)}
              onUpdateAlias={(id, alias) => updateAlias("create", id, alias)}
              getTestTypeName={getTestTypeName}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Norme Hommes"
              type="number"
              step="0.01"
              value={newType.normMale}
              onChange={(e) => setNewType((p) => ({ ...p, normMale: e.target.value }))}
              placeholder="Ex: 4.5"
            />
            <TextInput
              label="Norme Femmes"
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
            {creating ? "Création...": "Créer"}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmer la suppression" size="sm" transitionProps={{ duration: 0, timingFunction: "ease" }}>
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
      <Modal opened={newCatModalOpen} onClose={() => { setNewCatModalOpen(false); setNewCatName(""); }} title="Nouvelle catégorie" size="sm" transitionProps={{ duration: 0, timingFunction: "ease" }}>
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

      {/* Formula input picker */}
      <FormulaInputPickerModal
        opened={pickInputOpen !== null}
        available={getAvailableInputTypes(
          pickInputOpen === "create" ? newType.formulaInputs : editForm.formulaInputs
        )}
        onClose={() => setPickInputOpen(null)}
        onSelect={(tt) => {
          const target = pickInputOpen ?? "create"
          const defaultAlias = tt.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "")
          addFormulaInput(target, tt, defaultAlias)
        }}
      />
    </div>
  )
}