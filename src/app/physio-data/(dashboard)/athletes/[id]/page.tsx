"use client"

import { useEffect, useState, useCallback } from "react"
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
  ChevronLeft,
  ChevronRight,
  X,
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

interface PlanningEntry {
  id: string
  athleteId: string | null
  teamId: string | null
  date: string
  dateEnd: string | null
  title: string
  type: string
  isObjective: boolean
  notes: string | null
  origin?: string
  teamName?: string | null
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
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>
                  {formatDate(athlete.birthDate)} ({calculateAge(athlete.birthDate)} ans)
                </span>
              </div>
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

type TabKey = "tests" | "bilans" | "planning"

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "tests", label: "Tests", icon: <ClipboardList size={16} /> },
    { key: "bilans", label: "Bilans", icon: <FileText size={16} /> },
    { key: "planning", label: "Planning", icon: <CalendarDays size={16} /> },
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
  const [recentResults, setRecentResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)

  // Record form
  const [selectedTestTypeId, setSelectedTestTypeId] = useState<string | null>(null)
  const [testValue, setTestValue] = useState("")
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10))
  const [testNotes, setTestNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [recordModalOpened, { open: openRecord, close: closeRecord }] = useDisclosure(false)

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
        setRecentResults(results)
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

  // Group results by test type, showing latest 5 per type
  const groupedResults = recentResults.reduce(
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

      {/* Recent results grouped by test type */}
      {Object.keys(groupedResults).length === 0 ? (
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            Aucun résultat de test pour cet athlète.
          </Text>
        </Card>
      ) : (
        Object.entries(groupedResults).map(([typeId, results]) => {
          const testType = testTypes.find((t) => t.id === typeId)
          if (!testType) return null
          const sorted = [...results].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )
          const latest = sorted.slice(0, 10)

          return (
            <Card key={typeId} shadow="sm" p="md" radius="md" withBorder>
              <Text fw={600} size="md" mb="xs">
                {testType.name}{" "}
                <Text component="span" c="dimmed" size="sm">
                  ({testType.unit})
                </Text>
              </Text>
              <ScrollArea>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Valeur</Table.Th>
                      <Table.Th>Notes</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {latest.map((r) => (
                      <Table.Tr key={r.id}>
                        <Table.Td>
                          <Text size="sm">{formatDate(r.date)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="lg" variant="light" color="blue">
                            {r.value} {testType.unit}
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
            </Card>
          )
        })
      )}
    </Stack>
  )
}

/* ---------- Bilans Tab ---------- */

function BilansTab({ athleteId }: { athleteId: string }) {
  const [bilans, setBilans] = useState<Bilan[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Create modal
  const [createTitle, setCreateTitle] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const [createModalOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false)

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

  const handleCreate = async () => {
    if (!createTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`/physio-data/api/athletes/${athleteId}/bilans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDescription.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to create bilan")
      closeCreate()
      setCreateTitle("")
      setCreateDescription("")
      fetchBilans()
    } catch (err) {
      console.error("Error creating bilan:", err)
    } finally {
      setCreating(false)
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
        <Button leftSection={<Plus size={14} />} onClick={openCreate}>
          Nouveau bilan
        </Button>
      </div>

      {/* Create Modal */}
      <Modal
        opened={createModalOpened}
        onClose={closeCreate}
        title="Nouveau bilan"
        trapFocus={false}
        size="md"
      >
        <Stack gap="sm">
          <TextInput
            label="Titre"
            placeholder="Ex: Bilan pré-saison 2025"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.currentTarget.value)}
            required
          />
          <Textarea
            label="Description (optionnel)"
            placeholder="Description..."
            value={createDescription}
            onChange={(e) => setCreateDescription(e.currentTarget.value)}
            minRows={2}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={closeCreate}>
              Annuler
            </Button>
            <Button onClick={handleCreate} loading={creating} disabled={!createTitle.trim()}>
              Créer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {bilans.length === 0 ? (
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            Aucun bilan pour cet athlète.
          </Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {bilans.map((bilan) => (
            <Card
              key={bilan.id}
              shadow="sm"
              p="md"
              radius="md"
              withBorder
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/physio-data/bilans/${bilan.id}`)}
            >
              <Group justify="space-between" mb="xs">
                <Text fw={600} lineClamp={1}>
                  {bilan.title}
                </Text>
                <Badge variant="light" color="violet" size="sm">
                  Bilan
                </Badge>
              </Group>
              {bilan.description && (
                <Text size="sm" c="dimmed" lineClamp={2} mb="xs">
                  {bilan.description}
                </Text>
              )}
              <Text size="xs" c="dimmed">
                Mis à jour le {formatDate(bilan.updatedAt)}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}

/* ---------- Planning Tab ---------- */

function PlanningTab({ athleteId }: { athleteId: string }) {
  const [entries, setEntries] = useState<PlanningEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  // Create modal
  const [entryTitle, setEntryTitle] = useState("")
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [entryType, setEntryType] = useState("ENTRAINEMENT")
  const [entryNotes, setEntryNotes] = useState("")
  const [creating, setCreating] = useState(false)
  const [createModalOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false)

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/physio-data/api/planning?scope=athlete&id=${athleteId}&month=${currentMonth}`,
      )
      if (res.ok) {
        const data = await res.json()
        setEntries(data)
      }
    } catch (err) {
      console.error("Error fetching planning entries:", err)
    } finally {
      setLoading(false)
    }
  }, [athleteId, currentMonth])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleCreate = async () => {
    if (!entryTitle.trim() || !entryDate) return
    setCreating(true)
    try {
      const res = await fetch("/physio-data/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          title: entryTitle.trim(),
          date: entryDate,
          type: entryType,
          notes: entryNotes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to create planning entry")
      closeCreate()
      setEntryTitle("")
      setEntryNotes("")
      fetchEntries()
    } catch (err) {
      console.error("Error creating planning entry:", err)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/physio-data/api/planning/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      fetchEntries()
    } catch (err) {
      console.error("Error deleting planning entry:", err)
    } finally {
      setDeletingId(null)
    }
  }

  const prevMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number)
    const d = new Date(y, m - 2, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const nextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number)
    const d = new Date(y, m, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const monthLabel = new Date(currentMonth + "-01").toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  })

  const typeColor: Record<string, string> = {
    ENTRAINEMENT: "blue",
    MATCH: "red",
    RENDEZ_VOUS: "green",
    OBJECTIF: "orange",
    AUTRE: "gray",
  }

  const typeLabels: Record<string, string> = {
    ENTRAINEMENT: "Entraînement",
    MATCH: "Match",
    RENDEZ_VOUS: "Rendez-vous",
    OBJECTIF: "Objectif",
    AUTRE: "Autre",
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
      {/* Month navigation */}
      <Paper shadow="sm" p="sm" radius="md" withBorder>
        <Group justify="space-between">
          <Button variant="subtle" size="sm" onClick={prevMonth} leftSection={<ChevronLeft size={16} />}>
            Mois précédent
          </Button>
          <Text fw={600} size="md">
            {monthLabel}
          </Text>
          <Button variant="subtle" size="sm" onClick={nextMonth} rightSection={<ChevronRight size={16} />}>
            Mois suivant
          </Button>
        </Group>
      </Paper>

      {/* Add entry */}
      <div className="flex justify-end">
        <Button leftSection={<Plus size={14} />} onClick={openCreate}>
          Ajouter une entrée
        </Button>
      </div>

      {/* Create Modal */}
      <Modal
        opened={createModalOpened}
        onClose={closeCreate}
        title="Ajouter une entrée au planning"
        trapFocus={false}
        size="md"
      >
        <Stack gap="sm">
          <TextInput
            label="Titre"
            placeholder="Ex: Séance de musculation"
            value={entryTitle}
            onChange={(e) => setEntryTitle(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Date"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.currentTarget.value)}
            required
          />
          <NativeSelect
            label="Type"
            data={[
              { value: "ENTRAINEMENT", label: "Entraînement" },
              { value: "MATCH", label: "Match" },
              { value: "RENDEZ_VOUS", label: "Rendez-vous" },
              { value: "OBJECTIF", label: "Objectif" },
              { value: "AUTRE", label: "Autre" },
            ]}
            value={entryType}
            onChange={(e) => setEntryType(e.currentTarget.value)}
          />
          <Textarea
            label="Notes (optionnel)"
            placeholder="Notes..."
            value={entryNotes}
            onChange={(e) => setEntryNotes(e.currentTarget.value)}
            minRows={2}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={closeCreate}>
              Annuler
            </Button>
            <Button onClick={handleCreate} loading={creating} disabled={!entryTitle.trim() || !entryDate}>
              Ajouter
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Entries list */}
      {entries.length === 0 ? (
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            Aucune entrée de planning pour ce mois.
          </Text>
        </Card>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Titre</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Notes</Table.Th>
              <Table.Th style={{ width: 60 }}></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {entries.map((entry) => (
              <Table.Tr key={entry.id}>
                <Table.Td>
                  <Text size="sm">{formatDate(entry.date)}</Text>
                  {entry.dateEnd && (
                    <Text size="xs" c="dimmed">
                      → {formatDate(entry.dateEnd)}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text fw={500} size="sm">
                    {entry.title}
                  </Text>
                  {entry.origin === "equipe" && entry.teamName && (
                    <Text size="xs" c="dimmed">
                      ({entry.teamName})
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={typeColor[entry.type] || "gray"} size="sm">
                    {typeLabels[entry.type] || entry.type}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed" lineClamp={1}>
                    {entry.notes || "-"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {entry.origin !== "equipe" && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      loading={deletingId === entry.id}
                      onClick={() => handleDelete(entry.id)}
                    >
                      <TrashIcon size={14} />
                    </ActionIcon>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
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
  const [activeTab, setActiveTab] = useState<TabKey>("tests")

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
      {activeTab === "tests" && <TestsTab athleteId={athleteId} userRole={userRole} />}
      {activeTab === "bilans" && <BilansTab athleteId={athleteId} />}
      {activeTab === "planning" && <PlanningTab athleteId={athleteId} />}

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
          <TextInput
            label="URL de la photo"
            placeholder="https://..."
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.currentTarget.value)}
          />
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