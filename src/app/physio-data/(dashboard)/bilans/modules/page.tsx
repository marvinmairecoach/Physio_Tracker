"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Trash2,
  Save,
  LayoutList,
  FileText,
  Loader2,
  Tags,
} from "lucide-react"
import { Button, Card, TextInput, Select, Autocomplete, Badge, Modal, Group, Text, ActionIcon } from "@mantine/core"
import { DragDropContext, Droppable } from "@hello-pangea/dnd"
import { ModuleListItem } from "@/components/physio-data/module-list-item"

const QUESTION_TYPES = [
  { value: "text", label: "Texte court" },
  { value: "long_text", label: "Texte long" },
  { value: "boolean", label: "Oui/Non" },
  { value: "single_choice", label: "Choix unique" },
  { value: "multiple_choice", label: "Choix multiples" },
  { value: "ratio_gd", label: "Ratio G-D (%)" },
] as const

type QuestionType = (typeof QUESTION_TYPES)[number]["value"]

interface Question {
  id: string
  type: QuestionType
  label: string
  options: string
}

export interface Module {
  id: string
  title: string
  categories: string[]
  questions: Question[]
  ordering: number
  isActive: boolean
  bilanId: string | null
}

const emptyQuestion = (): Question => ({
  id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  type: "text",
  label: "",
  options: "",
})

export default function ModulesPage() {
  const router = useRouter()
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<{
    id?: string
    title: string
    categories: string[]
    questions: Question[]
  }>({ title: "", categories: [], questions: [] })
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  // Categories management modal
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [renamingCat, setRenamingCat] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deletingCat, setDeletingCat] = useState<{ id: string; name: string } | null>(null)
  const [newCatValue, setNewCatValue] = useState("")
  const [creatingCat, setCreatingCat] = useState(false)
  const [allCategories, setAllCategories] = useState<{ id: string; name: string; count: number }[]>([])

  const categoryNames = useMemo(() => allCategories.map((c) => c.name), [allCategories])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/physio-data/api/bilans/categories")
      if (res.ok) {
        const data = await res.json()
        setAllCategories(data.categories ?? [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const fetchModules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/physio-data/api/bilans/modules")
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      setModules(data.modules ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModules()
    fetchCategories()
  }, [fetchModules, fetchCategories])

  const openCreate = () => {
    setEditingModule({ title: "", categories: [], questions: [] })
    setModalOpen(true)
  }

  const openEdit = (m: Module) => {
    setEditingModule({
      id: m.id,
      title: m.title,
      categories: m.categories ?? [],
      questions: m.questions ?? [],
    })
    setModalOpen(true)
  }

  const handleSeed = async () => {
    if (!confirm("Créer 5 modules de démonstration ?")) return
    setSeeding(true)
    try {
      const res = await fetch("/physio-data/api/seed", { method: "POST" })
      if (!res.ok) throw new Error("Erreur")
      fetchModules()
    } catch (e) {
      console.error(e)
      alert("Erreur lors du seed")
    } finally {
      setSeeding(false)
    }
  }

  const handleSave = async () => {
    if (!editingModule.title.trim()) {
      alert("Le titre est obligatoire")
      return
    }
    setSaving(true)
    try {
      if (editingModule.id) {
        await fetch(`/physio-data/api/bilans/modules/${editingModule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editingModule.title.trim(),
            categories: editingModule.categories,
            questions: editingModule.questions,
          }),
        })
      } else {
        await fetch("/physio-data/api/bilans/modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editingModule.title.trim(),
            categories: editingModule.categories,
            questions: editingModule.questions,
          }),
        })
      }
      setModalOpen(false)
      fetchModules()
    } catch (e) {
      console.error(e)
      alert("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Désactiver ce module ?")) return
    try {
      await fetch(`/physio-data/api/bilans/modules/${id}`, { method: "DELETE" })
      fetchModules()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return
    const items = Array.from(modules)
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)
    setModules(items)

    try {
      await Promise.all(
        items.map((m, i) =>
          fetch(`/physio-data/api/bilans/modules/${m.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ordering: i }),
          })
        )
      )
    } catch (e) {
      console.error(e)
      fetchModules()
    }
  }

  // --- Category CRUD ---
  const handleCreateCategory = async () => {
    const name = newCatValue.trim()
    if (!name) return
    setCreatingCat(true)
    try {
      const res = await fetch("/physio-data/api/bilans/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error("Erreur")
      setNewCatValue("")
      fetchCategories()
    } catch (e) {
      console.error(e)
      alert("Erreur lors de la création")
    } finally {
      setCreatingCat(false)
    }
  }

  const handleRenameCategory = async (cat: { id: string; name: string }) => {
    if (!renameValue.trim() || renameValue === cat.name) {
      setRenamingCat(null)
      setRenameValue("")
      return
    }
    try {
      const res = await fetch(
        `/physio-data/api/bilans/categories?id=${cat.id}&name=${encodeURIComponent(renameValue.trim())}`,
        { method: "PATCH" }
      )
      if (!res.ok) throw new Error("Erreur")
      setRenamingCat(null)
      setRenameValue("")
      fetchCategories()
      fetchModules()
    } catch (e) {
      console.error(e)
      alert("Erreur lors du renommage")
    }
  }

  const handleDeleteCategory = async (cat: { id: string; name: string }) => {
    try {
      const res = await fetch(`/physio-data/api/bilans/categories?id=${cat.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erreur")
      setDeletingCat(null)
      fetchCategories()
      fetchModules()
    } catch (e) {
      console.error(e)
      alert("Erreur lors de la suppression")
    }
  }

  // --- Questions management ---
  const addQuestion = () => {
    setEditingModule((prev) => ({
      ...prev,
      questions: [...prev.questions, emptyQuestion()],
    }))
  }

  const updateQuestion = (index: number, field: string, value: string) => {
    setEditingModule((prev) => {
      const qs = [...prev.questions]
      qs[index] = { ...qs[index], [field]: value }
      return { ...prev, questions: qs }
    })
  }

  const removeQuestion = (index: number) => {
    setEditingModule((prev) => {
      const qs = [...prev.questions]
      qs.splice(index, 1)
      return { ...prev, questions: qs }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutList className="h-6 w-6 text-blue-500" />
            Modules de bilan
          </h1>
          <p className="text-sm text-gray-500">
            Créez, modifiez et réorganisez les modèles de bilans
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="light" leftSection={<Tags className="h-4 w-4" />} onClick={() => setCatModalOpen(true)}>
            Gérer les catégories
          </Button>
          <Button variant="light" leftSection={<Loader2 className="h-4 w-4" />} onClick={handleSeed} loading={seeding}>
            Seed modules
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Nouveau module
          </Button>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : modules.length === 0 ? (
        <Card shadow="sm" radius="md" withBorder>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <LayoutList className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-500">
              Aucun module pour le moment
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Créez des modules de questions pour les bilans
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              Créer un module
            </Button>
          </div>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="modules-list">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3 max-w-3xl"
              >
                {modules.map((m, index) => (
                  <ModuleListItem
                    key={m.id}
                    module={m}
                    index={index}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Modal création/édition */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          <span className="text-lg font-semibold">
            {editingModule.id ? "Modifier le module" : "Nouveau module"}
          </span>
        }
        size="xl"
        closeOnClickOutside={false}
      >
        <div className="space-y-6 py-2">
          <TextInput
            label="Titre du module"
            placeholder="Ex: Bilan épaule, Anamnèse douleur..."
            value={editingModule.title}
            onChange={(e) =>
              setEditingModule((prev) => ({ ...prev, title: e.target.value }))
            }
          />

          {/* Category field: MultiSelect */}
          <div>
            <span className="text-sm font-medium block mb-1">Catégories</span>
            <Select
              label=" "
              placeholder="Rechercher des catégories..."
              value={editingModule.categories.length === 1 ? editingModule.categories[0] : null}
              onChange={(val) => {
                if (val) {
                  // Single select mode: set one category
                  setEditingModule((prev) => {
                    if (prev.categories.includes(val)) return prev
                    return { ...prev, categories: [...prev.categories, val] }
                  })
                }
              }}
              data={categoryNames}
              searchable
              nothingFoundMessage="Aucune catégorie trouvée"
              clearable={false}
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {editingModule.categories.map((cat, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                >
                  {cat}
                  <button
                    type="button"
                    className="ml-0.5 text-blue-400 hover:text-blue-700"
                    onClick={() =>
                      setEditingModule((prev) => ({
                        ...prev,
                        categories: prev.categories.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Questions</span>
              <Button variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="h-3 w-3 mr-1" />
                Ajouter une question
              </Button>
            </div>

            {editingModule.questions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                Aucune question ajoutée
              </div>
            ) : (
              <div className="space-y-3">
                {editingModule.questions.map((q, idx) => (
                  <Card key={q.id} withBorder className="relative bg-gray-50/50">
                    <div className="p-4 space-y-3">
                      <div className="absolute right-2 top-2">
                        <Button
                          variant="subtle"
                          size="sm"
                          color="red"
                          onClick={() => removeQuestion(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <TextInput
                            label="Libellé"
                            placeholder="Ex: Intensité de la douleur"
                            value={q.label}
                            onChange={(e) =>
                              updateQuestion(idx, "label", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Select
                            label="Type"
                            data={QUESTION_TYPES.map((t) => ({
                              value: t.value,
                              label: t.label,
                            }))}
                            value={q.type}
                            onChange={(val) =>
                              val && updateQuestion(idx, "type", val)
                            }
                          />
                        </div>
                      </div>
                      {(q.type === "single_choice" ||
                        q.type === "multiple_choice") && (
                        <TextInput
                          label="Options (séparées par des virgules)"
                          placeholder="Oui, Non, Peut-être"
                          value={q.options}
                          onChange={(e) =>
                            updateQuestion(idx, "options", e.target.value)
                          }
                        />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button onClick={handleSave} loading={saving}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? "Enregistrement..." : "Enregistrer le module"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Categories management modal ── */}
      <Modal
        opened={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={
          <span className="text-lg font-semibold flex items-center gap-2">
            <Tags className="h-5 w-5 text-blue-500" />
            Gestion des catégories
          </span>
        }
        size="lg"
      >
        <div className="py-2">
          {/* Create new category */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <TextInput
                placeholder="Nom de la nouvelle catégorie..."
                size="sm"
                className="flex-1"
                value={newCatValue}
                onChange={(e) => setNewCatValue(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleCreateCategory()
                  }
                }}
              />
              <Button size="sm" onClick={handleCreateCategory} disabled={!newCatValue.trim()} loading={creatingCat}>
                Créer
              </Button>
            </div>
          </div>
          {allCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Tags className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <Text size="sm">Aucune catégorie définie. Créez des catégories dans les modules.</Text>
            </div>
          ) : (
            <div className="space-y-2">
              {allCategories.map((cat: { id: string; name: string; count: number }) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    {renamingCat === cat.id ? (
                      <div className="flex items-center gap-2">
                        <TextInput
                          size="xs"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameCategory(cat)
                            if (e.key === "Escape") { setRenamingCat(null); setRenameValue("") }
                          }}
                          autoFocus
                          className="w-48"
                        />
                        <Button size="xs" onClick={() => handleRenameCategory(cat)}>OK</Button>
                        <Button size="xs" variant="default" onClick={() => { setRenamingCat(null); setRenameValue("") }}>Annuler</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="filled" color="blue" size="lg">
                          {cat.name}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {cat.count} module{cat.count > 1 ? "s" : ""}
                        </Text>
                      </div>
                    )}
                  </div>

                  {renamingCat !== cat.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="light"
                        size="xs"
                        onClick={() => {
                          setRenamingCat(cat.id)
                          setRenameValue(cat.name)
                        }}
                      >
                        Renommer
                      </Button>
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="sm"
                        onClick={() => setDeletingCat(cat)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </ActionIcon>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Delete category confirmation ── */}
      <Modal
        opened={!!deletingCat}
        onClose={() => setDeletingCat(null)}
        title="Supprimer une catégorie"
        size="sm"
      >
        <Text mb="md">
          Êtes-vous sûr de vouloir supprimer la catégorie <strong>{deletingCat?.name}</strong> de tous les modules ?
          Cette action est irréversible.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeletingCat(null)}>
            Annuler
          </Button>
          <Button color="red" onClick={() => deletingCat && handleDeleteCategory(deletingCat)}>
            Supprimer
          </Button>
        </Group>
      </Modal>
    </div>
  )
}