"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Check, X, Trash2, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface Exercise {
  id: string
  name: string
  category: string
  description: string | null
  imageUrl: string | null
}

const CATEGORIES = [
  { value: "PHYSIQUE", label: "Physique" },
  { value: "TECHNIQUE", label: "Technique" },
  { value: "TACTIQUE", label: "Tactique" },
]

function categoryLabel(category: string): string {
  switch (category) {
    case "PHYSIQUE": return "Physique"
    case "TECHNIQUE": return "Technique"
    case "TACTIQUE": return "Tactique"
    default: return category
  }
}

function categoryVariant(category: string): "default" | "secondary" | "outline" {
  switch (category) {
    case "PHYSIQUE": return "default"
    case "TECHNIQUE": return "secondary"
    case "TACTIQUE": return "outline"
    default: return "outline"
  }
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createCategory, setCreateCategory] = useState("PHYSIQUE")
  const [createDescription, setCreateDescription] = useState("")
  const [createImageUrl, setCreateImageUrl] = useState("")
  const [creating, setCreating] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editImageUrl, setEditImageUrl] = useState("")
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Image preview for inline editing
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null)

  useEffect(() => {
    async function fetchExercises() {
      try {
        const res = await fetch("/api/exercises")
        if (!res.ok) throw new Error("Erreur lors du chargement des exercices")
        const data = await res.json()
        setExercises(Array.isArray(data) ? data : data.exercises ?? [])
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    fetchExercises()
  }, [])

  // File → base64 helper
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleCreate() {
    if (!createName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          category: createCategory,
          description: createDescription.trim() || null,
          imageUrl: createImageUrl || null,
        }),
      })
      if (!res.ok) throw new Error("Erreur lors de la création")
      const created = await res.json()
      setExercises((prev) => [...prev, created])
      setCreateOpen(false)
      setCreateName("")
      setCreateCategory("PHYSIQUE")
      setCreateDescription("")
      setCreateImageUrl("")
      setCreateImagePreview(null)
    } catch {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  function startEdit(exercise: Exercise) {
    setEditingId(exercise.id)
    setEditName(exercise.name)
    setEditCategory(exercise.category)
    setEditDescription(exercise.description ?? "")
    setEditImageUrl(exercise.imageUrl ?? "")
    setEditImagePreview(exercise.imageUrl ?? null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName("")
    setEditCategory("")
    setEditDescription("")
    setEditImageUrl("")
    setEditImagePreview(null)
  }

  async function handleSave(exercise: Exercise) {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/exercises/${exercise.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory,
          description: editDescription.trim() || null,
          imageUrl: editImageUrl || null,
        }),
      })
      if (!res.ok) throw new Error("Erreur lors de la modification")
      const updated = await res.json()
      setExercises((prev) => prev.map((e) => (e.id === exercise.id ? updated : e)))
      cancelEdit()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/exercises/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erreur lors de la suppression")
      setExercises((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }

  async function handleCreateImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await fileToBase64(file)
    setCreateImageUrl(b64)
    setCreateImagePreview(b64)
  }

  async function handleEditImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await fileToBase64(file)
    setEditImageUrl(b64)
    setEditImagePreview(b64)
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Exercices</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Créer un exercice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des exercices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exercises.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aucun exercice trouvé
                  </TableCell>
                </TableRow>
              ) : (
                exercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    {editingId === exercise.id ? (
                      <>
                        <TableCell>
                          <div className="flex flex-col gap-2 items-start">
                            {editImagePreview && (
                              <img src={editImagePreview} alt="Aperçu" className="h-12 w-12 rounded object-cover border" />
                            )}
                            <label className="cursor-pointer text-xs text-primary hover:underline">
                              Choisir une image
                              <input type="file" accept="image/*" onChange={handleEditImageFile} className="hidden" />
                            </label>
                            {editImagePreview && (
                              <button
                                type="button"
                                onClick={() => { setEditImageUrl(""); setEditImagePreview(null) }}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nom" />
                        </TableCell>
                        <TableCell>
                          <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                            {CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Description" rows={2}
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleSave(exercise)}
                              disabled={saving || !editName.trim()}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          {exercise.imageUrl ? (
                            <img src={exercise.imageUrl} alt={exercise.name} className="h-12 w-12 rounded object-cover border" />
                          ) : (
                            <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{exercise.name}</TableCell>
                        <TableCell>
                          <Badge variant={categoryVariant(exercise.category)}>{categoryLabel(exercise.category)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate">{exercise.description ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => startEdit(exercise)}>
                              <Pencil className="mr-1 h-4 w-4" />
                              Modifier
                            </Button>
                            <Button variant="outline" size="sm"
                              className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
                              onClick={() => setDeleteTarget(exercise)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => !o && setCreateOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un exercice</DialogTitle>
            <DialogDescription>Remplissez les informations ci-dessous pour créer un nouvel exercice.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Nom de l'exercice" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <select id="category" value={createCategory} onChange={(e) => setCreateCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea id="description" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Description (optionnelle)" rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              {createImagePreview && (
                <img src={createImagePreview} alt="Aperçu" className="h-24 w-24 rounded object-cover border mb-2" />
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span>{createImagePreview ? "Changer d'image" : "Choisir une image"}</span>
                <input type="file" accept="image/*" onChange={handleCreateImageFile} className="hidden" />
              </label>
              {createImagePreview && (
                <button type="button" onClick={() => { setCreateImageUrl(""); setCreateImagePreview(null) }}
                  className="text-xs text-red-500 hover:underline">
                  Supprimer l'image
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={creating || !createName.trim()}>
              {creating ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;exercice</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.name}</strong> ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}