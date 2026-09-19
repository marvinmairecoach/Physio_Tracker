"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  FileText,
  Check,
  LayoutList,
} from "lucide-react"

import {
  Card,
  Table,
  TextInput,
  Button,
  Badge,
  Modal,
  Text,
  Group,
  Textarea,
} from "@mantine/core"

const API_PREFIX = "/physio-data/api"

interface AthleteBrief {
  id: string
  firstName: string
  lastName: string
  birthDate: string | null
  gender: string | null
  teams: { team: { id: string; name: string } }[]
}

interface BilanConfig {
  selectedTestIds: string[]
  radarTestCount: number
  showNorms: boolean
  showTeamComparison: boolean
  subtitle?: string
  testComments?: Record<string, string>
}

interface BilanItem {
  id: string
  title: string
  description: string | null
  config: BilanConfig
  createdAt: string
  updatedAt: string
  athlete: AthleteBrief | null
}

interface TestTypeInfo {
  id: string
  name: string
  category: string
  unit: string
  higherIsBetter: boolean
  normMale: number | null
  normFemale: number | null
  isUnilateral: boolean
}

// --- Shared config form used in both create and edit modals ---
function ConfigForm({
  selectedIds,
  setSelectedIds,
  radarCount,
  setRadarCount,
  showNorms,
  setShowNorms,
  testTypes,
  maxCount,
}: {
  selectedIds: Set<string>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  radarCount: number
  setRadarCount: (n: number) => void
  showNorms: boolean
  setShowNorms: (v: boolean) => void
  testTypes: TestTypeInfo[]
  maxCount: number
}) {
  const toggleTest = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Test selection */}
      <div>
        <Text fw={600} size="sm" mb="xs">
          Tests inclus dans le bilan
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          {selectedIds.size} test{selectedIds.size > 1 ? "s" : ""} sélectionné
          {selectedIds.size > 1 ? "s" : ""}
        </Text>
        <div className="grid gap-1.5 max-h-64 overflow-y-auto">
          {testTypes.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="md">
              Aucun type de test disponible
            </Text>
          )}
          {testTypes.map((tt) => {
            const isSelected = selectedIds.has(tt.id)
            return (
              <button
                key={tt.id}
                type="button"
                onClick={() => toggleTest(tt.id)}
                className={`flex items-center gap-3 rounded-lg border p-2 text-left transition-all ${
                  isSelected
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 hover:border-blue-200"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <Text size="sm" fw={500} truncate>
                    {tt.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {tt.category} — {tt.unit}
                  </Text>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Radar config */}
      <div>
        <div className="flex items-center justify-between">
          <Text size="sm" fw={500}>
            Nombre de tests sur le radar
          </Text>
          <Text fw={700} c="blue" size="lg">
            {radarCount}
          </Text>
        </div>
        <input
          type="range"
          value={radarCount}
          onChange={(e) => setRadarCount(Number(e.target.value))}
          min={3}
          max={Math.max(selectedIds.size, 8)}
          step={1}
          className="w-full mt-1"
        />
        <Text size="xs" c="dimmed" mt={2}>
          {Math.min(radarCount, selectedIds.size)}/{selectedIds.size} tests
          visibles
        </Text>
      </div>

      {/* Toggles */}
      <div className="flex items-center justify-between">
        <Text size="sm" fw={500}>
          Afficher les normes
        </Text>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={showNorms}
            onChange={(e) => setShowNorms(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`h-5 w-10 rounded-full transition-colors ${
              showNorms ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                showNorms ? "translate-x-5.5" : "translate-x-0.5"
              }`}
              style={{
                transform: showNorms ? "translateX(1.375rem)" : "translateX(0.125rem)",
                marginTop: "0.125rem",
              }}
            />
          </div>
        </label>
      </div>
    </div>
  )
}

// --- Main page ---
export default function BilansListPage() {
  const router = useRouter()

  const [bilans, setBilans] = useState<BilanItem[]>([])
  const [testTypes, setTestTypes] = useState<TestTypeInfo[]>([])
  const [athletes, setAthletes] = useState<AthleteBrief[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)

  // --- Create modal state ---
  const [createOpen, setCreateOpen] = useState(false)
  const [createAthleteId, setCreateAthleteId] = useState("")
  const [createTitle, setCreateTitle] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [createSelectedIds, setCreateSelectedIds] = useState<Set<string>>(new Set())
  const [createRadarCount, setCreateRadarCount] = useState(6)
  const [createShowNorms, setCreateShowNorms] = useState(true)
  const [creating, setCreating] = useState(false)

  // --- Edit modal state ---
  const [editTarget, setEditTarget] = useState<BilanItem | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editSelectedIds, setEditSelectedIds] = useState<Set<string>>(new Set())
  const [editRadarCount, setEditRadarCount] = useState(6)
  const [editShowNorms, setEditShowNorms] = useState(true)
  const [saving, setSaving] = useState(false)

  // --- Delete modal state ---
  const [deleteTarget, setDeleteTarget] = useState<BilanItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isManager = userRole === "admin" || userRole === "coach"

  // --- Data fetching ---
  async function fetchAll() {
    try {
      const [bilansRes, typesRes, athletesRes, meRes] = await Promise.all([
        fetch(`${API_PREFIX}/bilans`),
        fetch(`${API_PREFIX}/tests/types`),
        fetch(`${API_PREFIX}/athletes`),
        fetch(`${API_PREFIX}/auth/me`),
      ])

      if (bilansRes.ok) {
        const bData = await bilansRes.json()
        setBilans(bData.bilans ?? [])
      }

      if (typesRes.ok) {
        const tData = await typesRes.json()
        setTestTypes(tData.testTypes ?? tData ?? [])
      }

      if (athletesRes.ok) {
        const aData = await athletesRes.json()
        setAthletes(aData.athletes ?? [])
      }

      if (meRes.ok) {
        const mData = await meRes.json()
        setUserRole(mData.user?.role ?? null)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  // --- Filter ---
  const filtered = bilans.filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    const athleteName = b.athlete
      ? `${b.athlete.firstName} ${b.athlete.lastName}`.toLowerCase()
      : ""
    return (
      b.title.toLowerCase().includes(q) ||
      athleteName.includes(q)
    )
  })

  // --- Create ---
  async function handleCreate() {
    if (!createAthleteId || !createTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`${API_PREFIX}/bilans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: createAthleteId,
          title: createTitle.trim(),
          description: createDesc.trim() || null,
          config: {
            selectedTestIds: Array.from(createSelectedIds),
            radarTestCount: createRadarCount,
            showNorms: createShowNorms,
            showTeamComparison: true,
          },
        }),
      })
      if (!res.ok) throw new Error("Erreur lors de la création")
      const data = await res.json()
      setBilans((prev) => [data.bilan, ...prev])
      setCreateOpen(false)
      resetCreateForm()
    } catch {
      alert("Erreur lors de la création du bilan")
    } finally {
      setCreating(false)
    }
  }

  function resetCreateForm() {
    setCreateAthleteId("")
    setCreateTitle("")
    setCreateDesc("")
    setCreateSelectedIds(new Set())
    setCreateRadarCount(6)
    setCreateShowNorms(true)
  }

  // --- Edit ---
  function openEdit(bilan: BilanItem) {
    setEditTarget(bilan)
    setEditTitle(bilan.title)
    setEditDesc(bilan.description ?? "")
    setEditSelectedIds(new Set(bilan.config.selectedTestIds ?? []))
    setEditRadarCount(bilan.config.radarTestCount ?? 6)
    setEditShowNorms(bilan.config.showNorms ?? true)
  }

  async function handleEdit() {
    if (!editTarget || !editTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`${API_PREFIX}/bilans/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          config: {
            selectedTestIds: Array.from(editSelectedIds),
            radarTestCount: editRadarCount,
            showNorms: editShowNorms,
            showTeamComparison: editTarget.config.showTeamComparison,
            subtitle: editTarget.config.subtitle,
            testComments: editTarget.config.testComments,
          },
        }),
      })
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      setBilans((prev) =>
        prev.map((b) => (b.id === editTarget.id ? { ...b, ...data.bilan } : b))
      )
      setEditTarget(null)
    } catch {
      alert("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  // --- Delete ---
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_PREFIX}/bilans/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Erreur")
      setBilans((prev) => prev.filter((b) => b.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      alert("Erreur lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }

  // --- Loading / Error guards ---
  if (loading)
    return (
      <div className="p-6 text-center text-gray-500">Chargement...</div>
    )
  if (error)
    return <div className="p-6 text-center text-red-500">{error}</div>

  const selectedAthlete = athletes.find((a) => a.id === createAthleteId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bilans
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion des modèles de bilans physiques
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="light"
            leftSection={<LayoutList className="h-4 w-4" />}
            onClick={() => router.push("/physio-data/bilans/modules")}
          >
            Modules
          </Button>
          {isManager && (
            <Button
              leftSection={<Plus className="h-4 w-4" />}
              onClick={() => setCreateOpen(true)}
            >
              Nouveau bilan
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <TextInput
        placeholder="Rechercher par titre ou athlète..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftSection={<Search className="h-4 w-4 text-gray-400" />}
      />

      {/* Bilan count summary */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          {bilans.length} bilan{bilans.length > 1 ? "s" : ""}
        </span>
        {search && (
          <span>
            ({filtered.length} trouvé{filtered.length > 1 ? "s" : ""})
          </span>
        )}
      </div>

      {/* Table */}
      <Card withBorder padding="lg">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Titre</Table.Th>
              <Table.Th>Athlète</Table.Th>
              <Table.Th>Équipe</Table.Th>
              <Table.Th>Tests</Table.Th>
              <Table.Th>Modifié le</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center" py="md">
                    Aucun bilan trouvé
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filtered.map((bilan) => {
                const athlete = bilan.athlete
                const athleteName = athlete
                  ? `${athlete.firstName} ${athlete.lastName}`
                  : "—"
                const teamName =
                  athlete?.teams?.[0]?.team?.name ?? "—"
                const testCount = bilan.config.selectedTestIds?.length ?? 0
                return (
                  <Table.Tr key={bilan.id}>
                    <Table.Td>
                      <Text fw={500} size="sm" truncate maw={220}>
                        {bilan.title}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{athleteName}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color="gray"
                        size="sm"
                      >
                        {teamName}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="blue" size="sm">
                        {testCount} test{testCount > 1 ? "s" : ""}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(bilan.updatedAt).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      <Group gap="xs" justify="flex-end">
                        <Button
                          variant="outline"
                          size="compact-sm"
                          onClick={() =>
                            router.push(`/physio-data/bilans/${bilan.id}`)
                          }
                          leftSection={<Eye className="h-3.5 w-3.5" />}
                        >
                          Voir
                        </Button>
                        {isManager && (
                          <>
                            <Button
                              variant="outline"
                              size="compact-sm"
                              color="orange"
                              onClick={() => openEdit(bilan)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="compact-sm"
                              color="red"
                              onClick={() => setDeleteTarget(bilan)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                )
              })
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {/* ===== CREATE MODAL ===== */}
      <Modal
        opened={createOpen}
        onClose={() => {
          setCreateOpen(false)
          resetCreateForm()
        }}
        title="Nouveau bilan"
        size="lg"
        trapFocus={false}
      >
        <div className="space-y-4">
          {/* Athlete select */}
          <div>
            <Text size="sm" fw={500} mb={4}>
              Athlète
            </Text>
            <select
              value={createAthleteId}
              onChange={(e) => setCreateAthleteId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Sélectionner un athlète...</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                  {a.teams?.[0]?.team?.name
                    ? ` — ${a.teams[0].team.name}`
                    : ""}
                </option>
              ))}
            </select>
            {selectedAthlete && (
              <Text size="xs" c="dimmed" mt={2}>
                {selectedAthlete.firstName} {selectedAthlete.lastName}
                {selectedAthlete.birthDate
                  ? ` — Né(e) le ${new Date(
                      selectedAthlete.birthDate
                    ).toLocaleDateString("fr-FR")}`
                  : ""}
              </Text>
            )}
          </div>

          {/* Title */}
          <TextInput
            label="Titre du bilan"
            placeholder="Bilan pré-saison 2025"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
          />

          {/* Description */}
          <Textarea
            label="Description (optionnelle)"
            placeholder="Résumé des capacités..."
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            minRows={2}
          />

          {/* Config form */}
          <ConfigForm
            selectedIds={createSelectedIds}
            setSelectedIds={setCreateSelectedIds}
            radarCount={createRadarCount}
            setRadarCount={setCreateRadarCount}
            showNorms={createShowNorms}
            setShowNorms={setCreateShowNorms}
            testTypes={testTypes}
            maxCount={8}
          />
        </div>

        <Group justify="flex-end" mt="lg">
          <Button
            variant="outline"
            onClick={() => {
              setCreateOpen(false)
              resetCreateForm()
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            loading={creating}
            disabled={!createAthleteId || !createTitle.trim()}
          >
            {creating ? "Création..." : "Créer le bilan"}
          </Button>
        </Group>
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        opened={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `Modifier : ${editTarget.title}` : ""}
        size="lg"
        trapFocus={false}
      >
        {editTarget && (
          <div className="space-y-4">
            <Text size="sm" c="dimmed">
              Athlète :{" "}
              <span className="font-medium text-gray-700">
                {editTarget.athlete
                  ? `${editTarget.athlete.firstName} ${editTarget.athlete.lastName}`
                  : "—"}
              </span>
            </Text>

            <TextInput
              label="Titre"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />

            <Textarea
              label="Description"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              minRows={2}
            />

            <ConfigForm
              selectedIds={editSelectedIds}
              setSelectedIds={setEditSelectedIds}
              radarCount={editRadarCount}
              setRadarCount={setEditRadarCount}
              showNorms={editShowNorms}
              setShowNorms={setEditShowNorms}
              testTypes={testTypes}
              maxCount={8}
            />
          </div>
        )}

        <Group justify="flex-end" mt="lg">
          <Button variant="outline" onClick={() => setEditTarget(null)}>
            Annuler
          </Button>
          <Button onClick={handleEdit} loading={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </Group>
      </Modal>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le bilan"
        centered
        trapFocus={false}
      >
        <Text size="sm" mb="lg">
          Êtes-vous sûr de vouloir supprimer{" "}
          <strong>{deleteTarget?.title}</strong> ?
          <br />
          Ce bilan sera définitivement supprimé pour l&apos;athlète{" "}
          {deleteTarget?.athlete
            ? `${deleteTarget.athlete.firstName} ${deleteTarget.athlete.lastName}`
            : ""}
          . Cette action est irréversible.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button
            variant="outline"
            onClick={() => setDeleteTarget(null)}
          >
            Annuler
          </Button>
          <Button
            color="red"
            onClick={handleDelete}
            loading={deleting}
          >
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </Group>
      </Modal>
    </div>
  )
}