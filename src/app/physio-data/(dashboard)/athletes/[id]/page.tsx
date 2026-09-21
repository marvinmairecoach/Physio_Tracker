"use client"

import { useEffect, useState, useCallback, useMemo, memo } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Ruler,
  Weight,
  Loader2,
  Trash2,
  Archive,
  Upload,
  FileText,
  ClipboardList,
  CalendarDays,
  Plus,
  Eye,
  Trash2 as TrashIcon,
  Activity,
  Edit,
} from "lucide-react"
import {
  Button,
  Card,
  Table,
  Badge,
  Modal,
  TextInput,
  NativeSelect,
  Textarea,
  ActionIcon,
  Group,
  Stack,
  Text,
  Avatar,
  Select,
  Tooltip,
  Paper,
  Divider,
  SimpleGrid,
  ScrollArea,
} from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Label,
} from "recharts"
import PlanningTab from "@/components/physio-data/planning-tab"

/* ============================================================
   Types
   ============================================================ */

interface Athlete {
  id: string
  firstName: string
  lastName: string
  birthDate: string | null
  phone: string | null
  email: string | null
  heightCm: number | null
  weightKg: number | null
  gender: string | null
  isActive: boolean
  isArchived?: boolean
  photoUrl: string | null
  notes?: string | null
}

interface TestType {
  id: string
  name: string
  category: string
  unit: string
  higherIsBetter: boolean
  normMale: number | null
  normFemale: number | null
  isUnilateral: boolean
}

interface TestResult {
  id: string
  athleteId: string
  testTypeId: string
  value: number
  valueLeft: number | null
  valueRight: number | null
  date: string
  notes: string | null
  testType?: TestType
}

interface Bilan {
  id: string
  title: string
  description: string | null
  config: any
  createdAt: string
  updatedAt: string
}

/* ============================================================
   Helpers
   ============================================================ */

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function calculateMonths(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let months = (today.getFullYear() - birth.getFullYear()) * 12
  months += today.getMonth() - birth.getMonth()
  if (today.getDate() < birth.getDate()) months--
  return months % 12
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

/* ============================================================
   Sub-components (defined outside main component)
   ============================================================ */

function AthleteInfoCard({
  athlete,
  userRole,
  onArchive,
  onDelete,
  onUploadPhoto,
}: {
  athlete: Athlete
  userRole: string | null
  onArchive: () => void
  onDelete: () => void
  onUploadPhoto: () => void
}) {
  const bmi =
    athlete.heightCm && athlete.weightKg
      ? (athlete.weightKg / ((athlete.heightCm / 100) * (athlete.heightCm / 100))).toFixed(1)
      : null

  const initials = `${athlete.firstName?.charAt(0) ?? ""}${athlete.lastName?.charAt(0) ?? ""}`.toUpperCase()

  return (
    <Paper shadow="sm" p="lg" radius="md" withBorder>
      <div className="flex items-start gap-6 flex-wrap">
        {/* Photo */}
        <Avatar src={athlete.photoUrl} alt={`${athlete.firstName} ${athlete.lastName}`} size={100} radius="md">
          {initials}
        </Avatar>

        {/* Identity */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <Text fw={700} size="xl">
              {athlete.firstName} {athlete.lastName}
            </Text>
            {!athlete.isActive && (
              <Badge color="gray" variant="light">
                Inactif
              </Badge>
            )}
            {athlete.isArchived && (
              <Badge color="orange" variant="light">
                Archivé
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm text-gray-600 mt-2">
            {athlete.gender && (
              <div className="flex items-center gap-1.5">
                <User size={14} />
                <span>{athlete.gender === "M" ? "Homme" : "Femme"}</span>
              </div>
            )}
            {athlete.birthDate && (
              <>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>{formatDate(athlete.birthDate)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  {calculateAge(athlete.birthDate)} ans {calculateMonths(athlete.birthDate)} mois
                </div>
              </>
            )}
            {athlete.phone && (
              <div className="flex items-center gap-1.5">
                <Phone size={14} />
                <a href={`tel:${athlete.phone}`} className="hover:underline">
                  {athlete.phone}
                </a>
              </div>
            )}
            {athlete.email && (
              <div className="flex items-center gap-1.5">
                <Mail size={14} />
                <a href={`mailto:${athlete.email}`} className="hover:underline truncate">
                  {athlete.email}
                </a>
              </div>
            )}
            {athlete.heightCm && (
              <div className="flex items-center gap-1.5">
                <Ruler size={14} />
                <span>{athlete.heightCm} cm</span>
              </div>
            )}
            {athlete.weightKg && (
              <div className="flex items-center gap-1.5">
                <Weight size={14} />
                <span>{athlete.weightKg} kg</span>
              </div>
            )}
            {bmi && (
              <div className="flex items-center gap-1.5">
                <Weight size={14} />
                <span>IMC: {bmi}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions (admin only) */}
        {(userRole === "admin" || userRole === "coach") && (
          <div className="flex gap-2 flex-shrink-0">
            <Tooltip label="Changer la photo">
              <Button variant="outline" size="sm" onClick={onUploadPhoto} leftSection={<Upload size={14} />}>
                Photo
              </Button>
            </Tooltip>
            <Tooltip label={athlete.isArchived ? "Restaurer" : "Archiver"}>
              <Button
                variant="outline"
                size="sm"
                color={athlete.isArchived ? "green" : "orange"}
                onClick={onArchive}
                leftSection={<Archive size={14} />}
              >
                {athlete.isArchived ? "Restaurer" : "Archiver"}
              </Button>
            </Tooltip>
            {userRole === "admin" && (
              <Tooltip label="Supprimer définitivement">
                <Button variant="outline" size="sm" color="red" onClick={onDelete} leftSection={<Trash2 size={14} />}>
                  Supprimer
                </Button>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </Paper>
  )
}

/* ---------- Tab bar ---------- */

type TabKey = "planning" | "suivi" | "tests" | "bilans"

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "planning", label: "Planning", icon: <CalendarDays size={16} /> },
    { key: "suivi", label: "Suivi", icon: <Activity size={16} /> },
    { key: "tests", label: "Tests", icon: <ClipboardList size={16} /> },
    { key: "bilans", label: "Bilans", icon: <FileText size={16} /> },
  ]

  return (
    <Group gap={0} mt="md" mb="md">
      {tabs.map((tab, i) => (
        <Button
          key={tab.key}
          variant={active === tab.key ? "filled" : "default"}
          onClick={() => onChange(tab.key)}
          leftSection={tab.icon}
          size="sm"
          style={{
            borderTopRightRadius: i === tabs.length - 1 ? "6px" : 0,
            borderBottomRightRadius: i === tabs.length - 1 ? "6px" : 0,
            borderTopLeftRadius: i === 0 ? "6px" : 0,
            borderBottomLeftRadius: i === 0 ? "6px" : 0,
          }}
        >
          {tab.label}
        </Button>
      ))}
    </Group>
  )
}

/* ---------- Tests Tab ---------- */

function TestsTab({
  athleteId,
  userRole,
}: {
  athleteId: string
  userRole: string | null
}) {
  const [testTypes, setTestTypes] = useState<TestType[]>([])
  const [allResults, setAllResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)

  // Record form
  const [selectedTestTypeId, setSelectedTestTypeId] = useState<string | null>(null)
  const [testValue, setTestValue] = useState("")
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10))
  const [testNotes, setTestNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [recordModalOpened, { open: openRecord, close: closeRecord }] = useDisclosure(false)

  // Chart modal
  const [chartTestType, setChartTestType] = useState<TestType | null>(null)
  const [chartResults, setChartResults] = useState<TestResult[]>([])
  const [chartModalOpened, { open: openChart, close: closeChart }] = useDisclosure(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [typesRes, resultsRes] = await Promise.all([
        fetch("/physio-data/api/tests/types"),
        fetch(`/physio-data/api/athletes/${athleteId}/tests`),
      ])
      if (typesRes.ok) {
        const types = await typesRes.json()
        setTestTypes(types)
      }
      if (resultsRes.ok) {
        const results = await resultsRes.json()
        setAllResults(results)
      }
    } catch (err) {
      console.error("Error fetching test data:", err)
    } finally {
      setLoading(false)
    }
  }, [athleteId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRecord = async () => {
    if (!selectedTestTypeId || !testValue) return
    setSaving(true)
    try {
      const res = await fetch("/physio-data/api/tests/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          testTypeId: selectedTestTypeId,
          value: testValue,
          date: testDate,
          notes: testNotes || undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to record test")
      closeRecord()
      setSelectedTestTypeId(null)
      setTestValue("")
      setTestNotes("")
      fetchData()
    } catch (err) {
      console.error("Error recording test:", err)
    } finally {
      setSaving(false)
    }
  }

  const openChartModal = (testType: TestType) => {
    const sorted = (allResults
      .filter((r) => r.testTypeId === testType.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    setChartTestType(testType)
    setChartResults(sorted)
    openChart()
  }

  const chartData = useMemo(
    () =>
      chartResults.map((r) => ({
        date: formatDateShort(r.date),
        fullDate: formatDate(r.date),
        value: r.value,
      })),
    [chartResults],
  )

  // Group results by test type
  const groupedResults = allResults.reduce(
    (acc, r) => {
      const typeId = r.testTypeId
      if (!acc[typeId]) acc[typeId] = []
      acc[typeId].push(r)
      return acc
    },
    {} as Record<string, TestResult[]>,
  )

  const selectedTestType = testTypes.find((t) => t.id === selectedTestTypeId)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin" size={24} />
      </div>
    )
  }

  return (
    <Stack gap="md">
      {/* Record test button */}
      <div className="flex justify-end">
        <Button leftSection={<Plus size={14} />} onClick={openRecord}>
          Enregistrer un test
        </Button>
      </div>

      {/* Record Modal */}
      <Modal
        opened={recordModalOpened}
        onClose={closeRecord}
        title="Enregistrer un résultat de test"
        trapFocus={false}
        size="md"
      >
        <Stack gap="sm">
          <Select
            label="Type de test"
            placeholder="Sélectionner un test..."
            data={testTypes.map((t) => ({
              value: t.id,
              label: `${t.name} (${t.unit})`,
            }))}
            value={selectedTestTypeId}
            onChange={setSelectedTestTypeId}
            searchable
            required
          />

          {selectedTestType?.isUnilateral ? (
            <Group grow>
              <TextInput
                label={`Valeur gauche (${selectedTestType.unit})`}
                placeholder="Ex: 12.5"
                value={testValue}
                onChange={(e) => setTestValue(e.currentTarget.value)}
                type="number"
                step="any"
              />
              <TextInput
                label={`Valeur droite (${selectedTestType.unit})`}
                placeholder="Ex: 13.2"
                type="number"
                step="any"
              />
            </Group>
          ) : (
            <TextInput
              label={`Valeur${selectedTestType ? ` (${selectedTestType.unit})` : ""}`}
              placeholder="Ex: 12.5"
              value={testValue}
              onChange={(e) => setTestValue(e.currentTarget.value)}
              type="number"
              step="any"
              required
            />
          )}

          <TextInput
            label="Date"
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.currentTarget.value)}
          />

          <Textarea
            label="Notes (optionnel)"
            placeholder="Notes..."
            value={testNotes}
            onChange={(e) => setTestNotes(e.currentTarget.value)}
            minRows={2}
          />

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={closeRecord}>
              Annuler
            </Button>
            <Button onClick={handleRecord} loading={saving} disabled={!selectedTestTypeId || !testValue}>
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Chart Modal */}
      <Modal
        opened={chartModalOpened}
        onClose={closeChart}
        title={chartTestType ? `${chartTestType.name} — Évolution` : ""}
        trapFocus={false}
        size="lg"
      >
        {chartTestType && (
          <Stack gap="md">
            {chartData.length > 1 ? (
              <Paper p="md" withBorder>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="value" stroke="#228be6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                Un seul résultat — ajoutez-en d'autres pour voir un graphique d'évolution.
              </Text>
            )}

            <Divider />

            <Text fw={600} size="sm">
              Tous les résultats
            </Text>
            <ScrollArea>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Valeur ({chartTestType.unit})</Table.Th>
                    <Table.Th>Notes</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {chartResults.map((r) => (
                    <Table.Tr key={r.id}>
                      <Table.Td>
                        <Text size="sm">{formatDate(r.date)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="lg" variant="light" color="blue">
                          {r.value} {chartTestType.unit}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {r.notes || "-"}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Stack>
        )}
      </Modal>

      {/* Test type cards */}
      {Object.keys(groupedResults).length === 0 ? (
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            Aucun résultat de test pour cet athlète.
          </Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {Object.entries(groupedResults).map(([typeId, results]) => {
            const testType = testTypes.find((t) => t.id === typeId)
            if (!testType) return null
            const sorted = [...results].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            )
            const latest = sorted[0]

            return (
              <Card
                key={typeId}
                shadow="sm"
                p="md"
                radius="md"
                withBorder
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openChartModal(testType)}
              >
                <Stack gap="xs">
                  <Text fw={600} size="md">
                    {testType.name}
                  </Text>
                  <Group gap="xs" align="baseline">
                    <Text size="xl" fw={700} c="blue">
                      {latest.value}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {testType.unit}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Dernier test : {formatDate(latest.date)}
                  </Text>
                </Stack>
              </Card>
            )
          })}
        </SimpleGrid>
      )}
    </Stack>
  )
}

/* ---------- Bilans Tab ---------- */

function BilansTab({ athleteId }: { athleteId: string }) {
  const [bilans, setBilans] = useState<Bilan[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editBilanId, setEditBilanId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editing, setEditing] = useState(false)

  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteBilanId, setDeleteBilanId] = useState<string | null>(null)
  const [deleteBilanTitle, setDeleteBilanTitle] = useState("")
  const [deleting, setDeleting] = useState(false)

  const fetchBilans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/physio-data/api/athletes/${athleteId}/bilans`)
      if (res.ok) {
        const data = await res.json()
        setBilans(data.bilans || data)
      }
    } catch (err) {
      console.error("Error fetching bilans:", err)
    } finally {
      setLoading(false)
    }
  }, [athleteId])

  useEffect(() => {
    fetchBilans()
  }, [fetchBilans])

  // Open edit modal
  const openEditModal = (bilan: Bilan) => {
    setEditBilanId(bilan.id)
    setEditTitle(bilan.title)
    setEditDescription(bilan.description || "")
    setEditModalOpen(true)
  }

  // Handle edit
  const handleEdit = async () => {
    if (!editBilanId || !editTitle.trim()) return
    setEditing(true)
    try {
      const res = await fetch(`/physio-data/api/bilans/${editBilanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to update bilan")
      setEditModalOpen(false)
      setEditBilanId(null)
      setEditTitle("")
      setEditDescription("")
      fetchBilans()
    } catch (err) {
      console.error("Error updating bilan:", err)
      alert("Erreur lors de la modification du bilan")
    } finally {
      setEditing(false)
    }
  }

  // Open delete confirmation
  const confirmDelete = (bilan: Bilan) => {
    setDeleteBilanId(bilan.id)
    setDeleteBilanTitle(bilan.title)
    setDeleteModalOpen(true)
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deleteBilanId) return
    setDeleting(true)
    try {
      const res = await fetch(`/physio-data/api/bilans/${deleteBilanId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete bilan")
      setDeleteModalOpen(false)
      setDeleteBilanId(null)
      setDeleteBilanTitle("")
      fetchBilans()
    } catch (err) {
      console.error("Error deleting bilan:", err)
      alert("Erreur lors de la suppression du bilan")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin" size={24} />
      </div>
    )
  }

  return (
    <Stack gap="md">
      <div className="flex justify-end">
        <Button leftSection={<Plus size={14} />} onClick={() => router.push(`/physio-data/athletes/${athleteId}/bilans/create`)}>
          Nouveau bilan
        </Button>
      </div>

      {bilans.length === 0 ? (
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            Aucun bilan pour cet athlète.
          </Text>
        </Card>
      ) : (
        <Paper shadow="sm" radius="md" withBorder>
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Titre</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Créé le</Table.Th>
                  <Table.Th>Mis à jour</Table.Th>
                  <Table.Th className="text-right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bilans.map((bilan) => (
                  <Table.Tr key={bilan.id}>
                    <Table.Td>
                      <Text
                        fw={600}
                        size="sm"
                        className="cursor-pointer hover:text-blue-600"
                        onClick={() => router.push(`/physio-data/bilans/${bilan.id}`)}
                      >
                        {bilan.title}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {bilan.description || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {formatDate(bilan.createdAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {formatDate(bilan.updatedAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <Button
                          variant="light"
                          size="xs"
                          onClick={() => router.push(`/physio-data/bilans/${bilan.id}/view`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="light"
                          size="xs"
                          color="yellow"
                          onClick={() => router.push(`/physio-data/athletes/${athleteId}/bilans/create?edit=${bilan.id}`)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="light"
                          size="xs"
                          color="red"
                          onClick={() => confirmDelete(bilan)}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      )}

      {/* ── Edit Modal ── */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Modifier le bilan"
        trapFocus={false}
        size="md"
      >
        <Stack gap="sm">
          <TextInput
            label="Titre"
            value={editTitle}
            onChange={(e) => setEditTitle(e.currentTarget.value)}
            required
          />
          <Textarea
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.currentTarget.value)}
            minRows={3}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setEditModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEdit} loading={editing} disabled={!editTitle.trim()}>
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Delete confirmation ── */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Supprimer le bilan"
        trapFocus={false}
        size="sm"
      >
        <Text mb="md">
          Êtes-vous sûr de vouloir supprimer <strong>{deleteBilanTitle}</strong> ?
          Cette action est irréversible.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteModalOpen(false)}>
            Annuler
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleting}>
            Supprimer
          </Button>
        </Group>
      </Modal>
    </Stack>
  )
}

/* ---------- Suivi Tab (évolution des indicateurs) ---------- */

interface SessionDataPayload {
  wellness?: { sleep: number; mood: number; physical: number }
  rpe?: number
  duration?: number
}

interface PlanningEntry {
  id: string
  date: string
  sessionData: string | null
}

function SuiviTab({ athleteId }: { athleteId: string }) {
  const [entries, setEntries] = useState<PlanningEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch last 3 months of planning entries
      const now = new Date()
      const months: string[] = []
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
      }

      const results = await Promise.all(
        months.map((month) =>
          fetch(`/physio-data/api/planning?athleteId=${athleteId}&month=${month}`).then((r) =>
            r.ok ? r.json() : [],
          ),
        ),
      )

      const all = results
        .flat()
        .filter((e: any) => e.sessionData)
      setEntries(all)
    } catch (err) {
      console.error("Error fetching planning entries for suivi:", err)
    } finally {
      setLoading(false)
    }
  }, [athleteId])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const chartData = useMemo(
    () =>
      entries
        .map((e) => {
          try {
            const sd: SessionDataPayload = JSON.parse(e.sessionData!)
            return {
              date: formatDateShort(e.date),
              fullDate: e.date,
              sommeil: sd.wellness?.sleep ?? null,
              moral: sd.wellness?.mood ?? null,
              physique: sd.wellness?.physical ?? null,
              rpe: sd.rpe ?? null,
            }
          } catch {
            return null
          }
        })
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .sort(
          (a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime(),
        ),
    [entries],
  )

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin" size={24} />
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Text c="dimmed" ta="center">
          Aucune donnée de suivi disponible pour cet athlète. Remplissez les questionnaires bien-être dans le planning pour voir l&apos;évolution.
        </Text>
      </Card>
    )
  }

  const indicators = [
    { key: "sommeil", label: "Sommeil", color: "#3b82f6" },
    { key: "moral", label: "Moral", color: "#22c55e" },
    { key: "physique", label: "Physique", color: "#f59e0b" },
    { key: "rpe", label: "RPE", color: "#ef4444" },
  ] as const

  return (
    <Stack gap="md">
      <Paper p="md" withBorder radius="md">
        <Text fw={600} size="md" mb="md">
          Évolution des indicateurs
        </Text>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <ReferenceLine y={3} stroke="#ccc" strokeDasharray="5 5" />
            <ReferenceLine y={5} stroke="#ccc" strokeDasharray="5 5" />
            <ReferenceLine y={7} stroke="#ccc" strokeDasharray="5 5" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              stroke="#9ca3af"
            />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <RechartsTooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "13px",
              }}
            />
            {indicators.map((ind) => (
              <Line
                key={ind.key}
                type="monotone"
                dataKey={ind.key}
                name={ind.label}
                stroke={ind.color}
                strokeWidth={2}
                dot={{ r: 3, fill: ind.color }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3 justify-center">
          {indicators.map((ind) => (
            <div key={ind.key} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: ind.color }}
              />
              <span>{ind.label}</span>
            </div>
          ))}
        </div>
      </Paper>
    </Stack>
  )
}

/* ============================================================
   Main Page
   ============================================================ */

export default function AthleteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const athleteId = params.id as string

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>("planning")

  // Auto-select bilans tab if ?tab=bilans query param
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search)
      const tab = sp.get("tab")
      if (tab === "bilans") {
        setActiveTab("bilans")
      }
    }
  }, [])

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Photo upload modal
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState("")
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Confirm archive
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const fetchAthlete = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [athleteRes, meRes] = await Promise.all([
        fetch(`/physio-data/api/athletes/${athleteId}`),
        fetch("/physio-data/api/auth/me"),
      ])

      if (!athleteRes.ok) {
        if (athleteRes.status === 404) {
          setError("Athlète introuvable")
        } else {
          setError("Erreur lors du chargement de l'athlète")
        }
        return
      }

      const athleteData = await athleteRes.json()
      setAthlete(athleteData)

      if (meRes.ok) {
        const meData = await meRes.json()
        setUserRole(meData.user?.role ?? null)
      }
    } catch (err) {
      console.error("Error fetching athlete:", err)
      setError("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }, [athleteId])

  useEffect(() => {
    fetchAthlete()
  }, [fetchAthlete])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/physio-data/api/athletes/${athleteId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Delete failed")
      router.push("/physio-data/athletes")
    } catch (err) {
      console.error("Delete error:", err)
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const handleArchive = async () => {
    setArchiving(true)
    try {
      const res = await fetch(`/physio-data/api/athletes/${athleteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !athlete?.isArchived }),
      })
      if (res.ok) {
        const updated = await res.json()
        setAthlete(updated)
      }
    } catch (err) {
      console.error("Archive error:", err)
    } finally {
      setArchiving(false)
      setArchiveConfirmOpen(false)
    }
  }

  const handleUploadPhoto = async () => {
    if (!photoUrl.trim()) return
    setUploadingPhoto(true)
    try {
      const res = await fetch(`/physio-data/api/athletes/${athleteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: photoUrl.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setAthlete(updated)
        setPhotoModalOpen(false)
        setPhotoUrl("")
      }
    } catch (err) {
      console.error("Photo upload error:", err)
    } finally {
      setUploadingPhoto(false)
    }
  }

  /* ---- Loading / Error states ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

  if (error || !athlete) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card shadow="sm" p="xl" radius="md" withBorder>
          <Text ta="center" c="dimmed" size="lg">
            {error || "Athlète introuvable"}
          </Text>
          <Group justify="center" mt="md">
            <Button variant="default" onClick={() => router.push("/physio-data/athletes")}>
              Retour à la liste
            </Button>
          </Group>
        </Card>
      </div>
    )
  }

  /* ---- Render ---- */

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Back button */}
      <Button
        variant="subtle"
        leftSection={<ArrowLeft size={16} />}
        onClick={() => router.push("/physio-data/athletes")}
        mb="md"
        size="sm"
      >
        Retour aux athlètes
      </Button>

      {/* Athlete identity card */}
      <AthleteInfoCard
        athlete={athlete}
        userRole={userRole}
        onArchive={() => setArchiveConfirmOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onUploadPhoto={() => setPhotoModalOpen(true)}
      />

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === "planning" && <PlanningTab athleteId={athleteId} />}
      {activeTab === "suivi" && <SuiviTab athleteId={athleteId} />}
      {activeTab === "tests" && <TestsTab athleteId={athleteId} userRole={userRole} />}
      {activeTab === "bilans" && <BilansTab athleteId={athleteId} />}

      {/* ── Modals ── */}

      {/* Delete confirmation */}
      <Modal
        opened={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer l'athlète"
        trapFocus={false}
        size="sm"
      >
        <Text mb="md">
          Êtes-vous sûr de vouloir supprimer définitivement <strong>{athlete.firstName} {athlete.lastName}</strong> ?
          Cette action est irréversible.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteOpen(false)}>
            Annuler
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleting}>
            Supprimer
          </Button>
        </Group>
      </Modal>

      {/* Archive confirmation */}
      <Modal
        opened={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        title={athlete.isArchived ? "Restaurer l'athlète" : "Archiver l'athlète"}
        trapFocus={false}
        size="sm"
      >
        <Text mb="md">
          {athlete.isArchived
            ? `Voulez-vous restaurer ${athlete.firstName} ${athlete.lastName} ?`
            : `Voulez-vous archiver ${athlete.firstName} ${athlete.lastName} ?`}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setArchiveConfirmOpen(false)}>
            Annuler
          </Button>
          <Button color={athlete.isArchived ? "green" : "orange"} onClick={handleArchive} loading={archiving}>
            {athlete.isArchived ? "Restaurer" : "Archiver"}
          </Button>
        </Group>
      </Modal>

      {/* Photo upload */}
      <Modal
        opened={photoModalOpen}
        onClose={() => {
          setPhotoModalOpen(false)
          setPhotoUrl("")
        }}
        title="Changer la photo"
        trapFocus={false}
        size="sm"
      >
        <Stack gap="sm">
          <div>
            <label className="mb-1 block text-sm font-medium">Fichier</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0]
                if (!file) return
                // Convert to base64 data URL
                const reader = new FileReader()
                reader.onload = () => {
                  setPhotoUrl(reader.result as string)
                }
                reader.readAsDataURL(file)
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div className="text-center text-xs text-gray-400">— ou —</div>
          <TextInput
            label="URL distante"
            placeholder="https://..."
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.currentTarget.value)}
          />
          {photoUrl && (
            <div className="flex justify-center mt-1">
              <img
                src={photoUrl}
                alt="Aperçu"
                className="h-24 w-24 rounded-md object-cover border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none"
                }}
              />
            </div>
          )}
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setPhotoModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUploadPhoto} loading={uploadingPhoto} disabled={!photoUrl.trim()}>
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  )
}