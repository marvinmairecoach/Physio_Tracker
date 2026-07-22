"use client"

import { useEffect, useState } from "react"
import { Save, Pencil, Trash2, X, Check } from "lucide-react"

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

interface Athlete {
  id: string
  firstName: string
  lastName: string
}

interface TestType {
  id: string
  name: string
  category: string
  unit: string
}

interface TestResult {
  id: string
  value: number
  date: string
  athlete: {
    firstName: string
    lastName: string
  }
  testType: {
    name: string
    unit: string
  }
}

export default function TestsPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [testTypes, setTestTypes] = useState<TestType[]>([])
  const [recentResults, setRecentResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    athleteId: "",
    testTypeId: "",
    value: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editTarget, setEditTarget] = useState<TestResult | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<TestResult | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [athletesRes, typesRes, resultsRes] = await Promise.all([
          fetch("/api/athletes"),
          fetch("/api/tests/types"),
          fetch("/api/tests/results?limit=20"),
        ])

        if (athletesRes.ok) {
          const data = await athletesRes.json()
          setAthletes(Array.isArray(data) ? data : data.athletes ?? [])
        }
        if (typesRes.ok) {
          const data = await typesRes.json()
          setTestTypes(Array.isArray(data) ? data : data.types ?? [])
        }
        if (resultsRes.ok) {
          const data = await resultsRes.json()
          setRecentResults(Array.isArray(data) ? data : data.results ?? [])
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.athleteId || !formData.testTypeId || !formData.value) {
      setError("Veuillez remplir tous les champs obligatoires")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/tests/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: formData.athleteId,
          testTypeId: formData.testTypeId,
          value: parseFloat(formData.value),
          date: formData.date,
          notes: formData.notes || null,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Erreur lors de l'enregistrement")
      }

      // Reset form — keep athleteId and testTypeId for quick consecutive entries
      setFormData((prev) => ({
        ...prev,
        value: "",
        notes: "",
        date: new Date().toISOString().split("T")[0],
      }))

      // Refresh results
      const resultsRes = await fetch("/api/tests/results?limit=20")
      if (resultsRes.ok) {
        const data = await resultsRes.json()
        setRecentResults(Array.isArray(data) ? data : data.results ?? [])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function openEdit(result: TestResult) {
    setEditTarget(result)
    setEditValue(result.value.toString())
    setEditDate(result.date.split("T")[0])
  }

  async function handleEditSave() {
    if (!editTarget) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/tests/results/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: parseFloat(editValue),
          date: editDate,
        }),
      })
      if (!res.ok) throw new Error("Erreur")

      // Refresh
      const resultsRes = await fetch("/api/tests/results?limit=20")
      if (resultsRes.ok) {
        const data = await resultsRes.json()
        setRecentResults(Array.isArray(data) ? data : data.results ?? [])
      }
      setEditTarget(null)
    } catch {
      setError("Erreur lors de la modification")
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteSaving(true)
    try {
      const res = await fetch(`/api/tests/results/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Erreur")

      setRecentResults((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setError("Erreur lors de la suppression")
    } finally {
      setDeleteSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Tests & Évaluations</h1>

      {/* Record Test Form */}
      <Card>
        <CardHeader>
          <CardTitle>Enregistrer un résultat</CardTitle>
          <CardDescription>
            Sélectionnez un athlète, un type de test, et saisissez la valeur obtenue.
            L&apos;athlète et le test restent sélectionnés après enregistrement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="athleteId">Athlète</Label>
                <select
                  id="athleteId"
                  name="athleteId"
                  value={formData.athleteId}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Sélectionner...</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.firstName} {a.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="testTypeId">Type de test</Label>
                <select
                  id="testTypeId"
                  name="testTypeId"
                  value={formData.testTypeId}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Sélectionner...</option>
                  {testTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name} ({tt.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valeur</Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={handleChange}
                  placeholder="Ex: 10.5"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Enregistrement..." : "Enregistrer le résultat"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle>Résultats récents</CardTitle>
          <CardDescription>Les 20 derniers résultats enregistrés</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Athlète</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aucun résultat enregistré
                  </TableCell>
                </TableRow>
              ) : (
                recentResults.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.athlete.firstName} {r.athlete.lastName}
                    </TableCell>
                    <TableCell>
                      {r.testType.name}
                    </TableCell>
                    <TableCell>
                      {r.value} {r.testType.unit}
                    </TableCell>
                    <TableCell>
                      {new Date(r.date).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(r)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(r)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier le résultat</DialogTitle>
            <DialogDescription>
              {editTarget?.athlete.firstName} {editTarget?.athlete.lastName} — {editTarget?.testType.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Valeur ({editTarget?.testType.unit})</Label>
              <Input
                type="number"
                step="0.01"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Annuler
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              <Check className="mr-2 h-4 w-4" />
              {editSaving ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Supprimer le résultat de{" "}
              <strong>{deleteTarget?.athlete.firstName} {deleteTarget?.athlete.lastName}</strong> —{" "}
              <strong>{deleteTarget?.testType.name}</strong> ({deleteTarget?.value} {deleteTarget?.testType.unit}) ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteSaving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteSaving ? "..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}