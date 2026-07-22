"use client"

import { useEffect, useState } from "react"
import { Pencil, Plus, Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

      <Card>
        <CardHeader>
          <CardTitle>Gestion des types de tests</CardTitle>
          <CardDescription>
            Définissez les types de tests utilisés pour évaluer les athlètes.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Supérieur = Meilleur</TableHead>
                <TableHead className="text-right">Norme H</TableHead>
                <TableHead className="text-right">Norme F</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Aucun type de test défini
                  </TableCell>
                </TableRow>
              ) : (
                testTypes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {editingId === t.id ? (
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          className="h-8"
                        />
                      ) : (
                        t.name
                      )}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      {editingId === t.id ? (
                        <Input
                          value={editForm.unit}
                          onChange={(e) => setEditForm((p) => ({ ...p, unit: e.target.value }))}
                          className="h-8 w-20"
                        />
                      ) : (
                        t.unit
                      )}
                    </TableCell>
                    <TableCell>
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
                        <Badge variant={t.higherIsBetter ? "default" : "secondary"}>
                          {t.higherIsBetter ? "Oui" : "Non"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === t.id ? (
                        <Input
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
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === t.id ? (
                        <Input
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
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === t.id ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSave(t.id)}
                            disabled={saving}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={cancelEdit}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => startEdit(t)}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Modifier
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau type de test</DialogTitle>
            <DialogDescription>
              Créez un nouveau type de test pour les évaluations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nom</Label>
              <Input
                id="new-name"
                value={newType.name}
                onChange={(e) => setNewType((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Sprint 30m"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-category">Catégorie</Label>
              <select
                id="new-category"
                value={newType.category}
                onChange={(e) => setNewType((p) => ({ ...p, category: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="field">Terrain</option>
                <option value="force_plate">Plateforme de force</option>
                <option value="dynamometer">Dynamomètre</option>
                <option value="anthropometric">Anthropométrique</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-unit">Unité</Label>
              <Input
                id="new-unit"
                value={newType.unit}
                onChange={(e) => setNewType((p) => ({ ...p, unit: e.target.value }))}
                placeholder="Ex: secondes, cm, kg..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-higher">Supérieur = Meilleur</Label>
              <select
                id="new-higher"
                value={newType.higherIsBetter ? "true" : "false"}
                onChange={(e) =>
                  setNewType((p) => ({ ...p, higherIsBetter: e.target.value === "true" }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-norm-male">Norme Hommes</Label>
                <Input
                  id="new-norm-male"
                  type="number"
                  step="0.01"
                  value={newType.normMale}
                  onChange={(e) => setNewType((p) => ({ ...p, normMale: e.target.value }))}
                  placeholder="Ex: 4.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-norm-female">Norme Femmes</Label>
                <Input
                  id="new-norm-female"
                  type="number"
                  step="0.01"
                  value={newType.normFemale}
                  onChange={(e) => setNewType((p) => ({ ...p, normFemale: e.target.value }))}
                  placeholder="Ex: 5.2"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}