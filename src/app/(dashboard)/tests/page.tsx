"use client"

import { useEffect, useState, useRef } from "react"
import { Search, Save, Pencil, Trash2, X, Check } from "lucide-react"

import { Button, Card, Table, TextInput, Modal, Pagination, NativeSelect, Select } from "@mantine/core"

interface Athlete {
  id: string
  firstName: string
  lastName: string
}

interface Team {
  id: string
  name: string
}

interface TeamAthlete {
  athlete: Athlete
}

interface TestType {
  id: string
  name: string
  category: string
  unit: string
  isUnilateral?: boolean
}

interface TestResult {
  id: string
  value: number
  date: string
  athlete: {
    id: string
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

  // Team filter state
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [teamAthletes, setTeamAthletes] = useState<Athlete[]>([])

  // Pagination state
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const [formData, setFormData] = useState({
    athleteId: "",
    testTypeId: "",
    value: "",
    valueLeft: "",
    valueRight: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  // Result search state
  const [resultSearch, setResultSearch] = useState("")
  // Edit state
  const [editTarget, setEditTarget] = useState<TestResult | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<TestResult | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

  // Refs
  const valueRef = useRef<HTMLInputElement>(null)

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        const [athletesRes, typesRes, resultsRes, teamsRes] = await Promise.all([
          fetch("/api/athletes"),
          fetch("/api/tests/types"),
          fetch("/api/tests/results?limit=100"),
          fetch("/api/teams"),
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
        if (teamsRes.ok) {
          const data = await teamsRes.json()
          setTeams(Array.isArray(data) ? data : [])
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Fetch team athletes when selected team changes
  useEffect(() => {
    if (!selectedTeamId) {
      setTeamAthletes([])
      return
    }
    async function fetchTeamAthletes() {
      try {
        const res = await fetch(`/api/teams/${selectedTeamId}/athletes`)
        if (res.ok) {
          const data: TeamAthlete[] = await res.json()
          setTeamAthletes(Array.isArray(data) ? data.map((ta) => ta.athlete) : [])
        }
      } catch {
        // ignore
      }
    }
    fetchTeamAthletes()
  }, [selectedTeamId])

  // Auto-focus value field when both athlete and test type are selected
  useEffect(() => {
    if (formData.athleteId && formData.testTypeId && valueRef.current) {
      valueRef.current.focus()
    }
  }, [formData.athleteId, formData.testTypeId])

  // Reset page when team filter changes
  useEffect(() => {
    setPage(1)
  }, [selectedTeamId])

  // Reset page when result search changes
  useEffect(() => {
    setPage(1)
  }, [resultSearch])

  // Compute which athletes to show in the dropdown
  const baseAthletes = selectedTeamId && teamAthletes.length > 0
    ? teamAthletes
    : athletes

  // Find the selected test type to check if unilateral
  const selectedTestType = testTypes.find((tt) => tt.id === formData.testTypeId)
  const isUnilateral = selectedTestType?.isUnilateral ?? false

  // Compute which results to show (filter by selected team + paginate)
  const teamAthleteIds = new Set(
    selectedTeamId
      ? teamAthletes.map((a) => a.id)
      : athletes.map((a) => a.id)
  )

  const teamFilteredResults = (() => {
    let results = selectedTeamId
      ? recentResults.filter((r) => teamAthleteIds.has(r.athlete.id))
      : recentResults

    if (resultSearch) {
      const q = resultSearch.toLowerCase()
      results = results.filter(
        (r) =>
          r.athlete.firstName.toLowerCase().includes(q) ||
          r.athlete.lastName.toLowerCase().includes(q) ||
          `${r.athlete.firstName} ${r.athlete.lastName}`.toLowerCase().includes(q) ||
          r.testType.name.toLowerCase().includes(q)
      )
    }

    return results
  })()

  const totalPages = Math.ceil(teamFilteredResults.length / ITEMS_PER_PAGE)
  const paginatedResults = teamFilteredResults.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  const resultStart = teamFilteredResults.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1
  const resultEnd = Math.min(page * ITEMS_PER_PAGE, teamFilteredResults.length)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.athleteId || !formData.testTypeId) {
      setError("Veuillez remplir tous les champs obligatoires")
      return
    }

    // For unilateral tests, compute value as average of left and right
    let submitValue: string
    if (isUnilateral) {
      if (!formData.valueLeft || !formData.valueRight) {
        setError("Veuillez saisir les valeurs gauche et droite")
        return
      }
      const avg = (parseFloat(formData.valueLeft) + parseFloat(formData.valueRight)) / 2
      submitValue = avg.toString()
    } else {
      if (!formData.value) {
        setError("Veuillez saisir la valeur")
        return
      }
      submitValue = formData.value
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
          value: parseFloat(submitValue),
          valueLeft: formData.valueLeft ? parseFloat(formData.valueLeft) : null,
          valueRight: formData.valueRight ? parseFloat(formData.valueRight) : null,
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
        valueLeft: "",
        valueRight: "",
        notes: "",
        date: new Date().toISOString().split("T")[0],
      }))

      // Refresh results
      const resultsRes = await fetch("/api/tests/results?limit=100")
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
      const resultsRes = await fetch("/api/tests/results?limit=100")
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
      <Card withBorder className="max-w-none">
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-semibold">Enregistrer un résultat</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sélectionnez un athlète, un type de test, et saisissez la valeur obtenue.
            L&apos;athlète et le test restent sélectionnés après enregistrement.
          </p>
        </div>
        <div className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <NativeSelect
                  label="Équipe"
                  id="teamFilter"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.currentTarget.value)}
                  data={[
                    { value: "", label: "Toutes les équipes" },
                    ...teams.map((t) => ({ value: t.id, label: t.name })),
                  ]}
                />
              </div>
              <div>
                <Select
                  label="Athlète"
                  id="athleteId"
                  name="athleteId"
                  placeholder="Rechercher un athlète..."
                  data={baseAthletes.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName}` }))}
                  value={formData.athleteId}
                  onChange={(val) => setFormData((prev) => ({ ...prev, athleteId: val || "" }))}
                  searchable
                  clearable
                  nothingFoundMessage="Aucun athlète trouvé"
                />
              </div>
              <div>
                <TextInput
                  label="Type de test"
                  id="testTypeId"
                  name="testTypeId"
                  value={formData.testTypeId}
                  onChange={handleChange}
                  required
                  component="select"
                >
                  <option value="">Sélectionner...</option>
                  {testTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name} ({tt.unit})
                    </option>
                  ))}
                </TextInput>
              </div>
              {isUnilateral ? (
                <>
                  <div>
                    <TextInput
                      label="Valeur Gauche"
                      id="valueLeft"
                      name="valueLeft"
                      type="number"
                      step="0.01"
                      value={formData.valueLeft}
                      onChange={handleChange}
                      placeholder="Ex: 10.5"
                      required
                    />
                  </div>
                  <div>
                    <TextInput
                      label="Valeur Droite"
                      id="valueRight"
                      name="valueRight"
                      type="number"
                      step="0.01"
                      value={formData.valueRight}
                      onChange={handleChange}
                      placeholder="Ex: 10.5"
                      required
                    />
                  </div>
                  {formData.valueLeft && formData.valueRight && (
                    <div className="col-span-full">
                      <p className="text-xs text-muted-foreground">
                        Asymétrie :{" "}
                        {(() => {
                          const left = parseFloat(formData.valueLeft)
                          const right = parseFloat(formData.valueRight)
                          const avg = (left + right) / 2
                          if (avg === 0) return "N/A"
                          return `${(Math.abs(left - right) / avg * 100).toFixed(1)}%`
                        })()}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <TextInput
                    label="Valeur"
                    id="value"
                    name="value"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={handleChange}
                    placeholder="Ex: 10.5"
                    required
                    ref={valueRef}
                  />
                </div>
              )}
              <div>
                <TextInput
                  label="Date"
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
        </div>
      </Card>

      {/* Recent Results */}
      <Card withBorder className="max-w-none">
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-semibold">Résultats récents</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedTeamId
              ? `Résultats pour l'équipe sélectionnée — ${teamFilteredResults.length} au total`
              : `${teamFilteredResults.length} résultat(s) au total`}
          </p>
        </div>
        <div className="px-6 pb-3">
          <TextInput
            placeholder="Rechercher par nom d'athlète ou type de test..."
            leftSection={<Search className="h-4 w-4" />}
            value={resultSearch}
            onChange={(e) => setResultSearch(e.currentTarget.value)}
            className="max-w-sm"
          />
        </div>
        <div className="px-6 pb-6 overflow-x-auto">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Athlète</Table.Th>
                <Table.Th>Test</Table.Th>
                <Table.Th>Valeur</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th className="text-right w-24">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedResults.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} className="text-center text-muted-foreground">
                    Aucun résultat enregistré
                  </Table.Td>
                </Table.Tr>
              ) : (
                paginatedResults.map((r) => (
                  <Table.Tr key={r.id}>
                    <Table.Td className="font-medium">
                      {r.athlete.firstName} {r.athlete.lastName}
                    </Table.Td>
                    <Table.Td>
                      {r.testType.name}
                    </Table.Td>
                    <Table.Td>
                      {r.value} {r.testType.unit}
                    </Table.Td>
                    <Table.Td>
                      {new Date(r.date).toLocaleDateString("fr-FR")}
                    </Table.Td>
                    <Table.Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="subtle"
                          size="compact-sm"
                          onClick={() => openEdit(r)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="subtle"
                          size="compact-sm"
                          onClick={() => setDeleteTarget(r)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>

          {/* Pagination */}
          {teamFilteredResults.length > ITEMS_PER_PAGE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Résultats {resultStart}-{resultEnd} sur {teamFilteredResults.length}
              </p>
              <Pagination
                total={totalPages}
                value={page}
                onChange={setPage}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <Modal opened={!!editTarget} onClose={() => setEditTarget(null)} title="Modifier le résultat" size="sm">
        {editTarget && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {editTarget.athlete.firstName} {editTarget.athlete.lastName} — {editTarget.testType.name}
            </p>
            <TextInput
              label={`Valeur (${editTarget.testType.unit})`}
              type="number"
              step="0.01"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
            <TextInput
              label="Date"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setEditTarget(null)}>Annuler</Button>
          <Button onClick={handleEditSave} disabled={editSaving}>
            <Check className="mr-2 h-4 w-4" />
            {editSaving ? "..." : "Enregistrer"}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmer la suppression" size="sm">
        {deleteTarget && (
          <p className="text-sm text-muted-foreground">
            Supprimer le résultat de{" "}
            <strong>{deleteTarget.athlete.firstName} {deleteTarget.athlete.lastName}</strong> —{" "}
            <strong>{deleteTarget.testType.name}</strong> ({deleteTarget.value} {deleteTarget.testType.unit}) ?
            Cette action est irréversible.
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button color="red" onClick={handleDelete} disabled={deleteSaving}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteSaving ? "..." : "Supprimer"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}