"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
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

/* ---------- Planning Tab : Semaine / Mois / Liste ---------- */

function PlanningTab({ athleteId }: { athleteId: string }) {
  const [entries, setEntries] = useState<PlanningEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"week" | "month" | "list">("week")

  // Date state: weekStart for week view, calDate for month view
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)
    return monday
  })
  const [calDate, setCalDate] = useState(() => new Date())

  const sunday = new Date(weekStart)
  sunday.setDate(sunday.getDate() + 6)

  // Use current month or week month as the API fetch month
  const monthKey = useMemo(() => {
    if (viewMode === "week") {
      const mid = new Date(weekStart)
      mid.setDate(mid.getDate() + 3)
      return `${mid.getFullYear()}-${String(mid.getMonth() + 1).padStart(2, "0")}`
    }
    return `${calDate.getFullYear()}-${String(calDate.getMonth() + 1).padStart(2, "0")}`
  }, [viewMode, weekStart, calDate])

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)

  // Create modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createDate, setCreateDate] = useState("")
  const [createType, setCreateType] = useState("ENTRAINEMENT")
  const [createContent, setCreateContent] = useState("")
  const [creating, setCreating] = useState(false)

  const weekDates = useMemo(() => {
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      dates.push(d)
    }
    return dates
  }, [weekStart])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/physio-data/api/planning?athleteId=${athleteId}&month=${monthKey}`,
      )
      if (res.ok) {
        const data = await res.json()
        setEntries(Array.isArray(data) ? data : data.entries ?? [])
      }
    } catch (err) {
      console.error("Error fetching planning entries:", err)
    } finally {
      setLoading(false)
    }
  }, [athleteId, monthKey])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  function dateKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }

  // Group by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, PlanningEntry[]>()
    for (const entry of entries) {
      const start = new Date(entry.date)
      const keys: string[] = [dateKey(start)]
      if (entry.dateEnd) {
        const end = new Date(entry.dateEnd)
        const cursor = new Date(start)
        cursor.setDate(cursor.getDate() + 1)
        while (cursor <= end) {
          keys.push(dateKey(cursor))
          cursor.setDate(cursor.getDate() + 1)
        }
      }
      for (const key of keys) {
        const list = map.get(key) ?? []
        list.push(entry)
        map.set(key, list)
      }
    }
    return map
  }, [entries])

  // Inline edit: open edit mode
  function startEdit(entry: PlanningEntry) {
    setEditingId(entry.id)
    setEditingContent(entry.notes ?? "")
  }

  // Inline edit: auto-save on blur
  async function saveEdit(entryId: string, content: string) {
    setSavingId(entryId)
    try {
      await fetch(`/physio-data/api/planning/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: content || null }),
      })
      // Update local state
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, notes: content || null } : e)),
      )
    } catch {
      // silencieux
    } finally {
      setSavingId(null)
      setEditingId(null)
      setEditingContent("")
    }
  }

  // Create entry
  async function handleCreate() {
    if (!createContent.trim()) return
    setCreating(true)
    try {
      const typeLabel = typeLabels[createType] ?? createType
      await fetch("/physio-data/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          title: typeLabel, // Use type label as fallback title
          date: createDate,
          type: createType,
          notes: createContent.trim(),
        }),
      })
      setCreateModalOpen(false)
      setCreateContent("")
      fetchEntries()
    } catch {
      // silencieux
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette entrée ?")) return
    try {
      await fetch(`/physio-data/api/planning/${id}`, { method: "DELETE" })
      fetchEntries()
    } catch {
      // silencieux
    }
  }

  const typeColors: Record<string, string> = {
    ENTRAINEMENT: "border-blue-400 bg-blue-50",
    MATCH: "border-green-400 bg-green-50",
    OBJECTIF: "border-amber-400 bg-amber-50",
    REATHLETISATION: "border-purple-400 bg-purple-50",
    REPOS: "border-gray-400 bg-gray-50",
    TEST: "border-cyan-400 bg-cyan-50",
    AUTRE: "border-slate-400 bg-slate-50",
    INDISPONIBILITE: "border-red-400 bg-red-50",
  }

  const typeLabels: Record<string, string> = {
    ENTRAINEMENT: "Entraînement",
    MATCH: "Match",
    OBJECTIF: "Objectif",
    REATHLETISATION: "Réathlétisation",
    REPOS: "Repos",
    TEST: "Test",
    AUTRE: "Autre",
    INDISPONIBILITE: "Indisponibilité",
  }

  const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
  const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

  // ──────────────────────────────────────────────
  // Navigation helpers
  // ──────────────────────────────────────────────

  const goToPrevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }
  const goToNextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }
  const goToPrevMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))
  const goToNextMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))

  const goToToday = () => {
    const now = new Date()
    const day = now.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)
    setWeekStart(monday)
    setCalDate(new Date())
  }

  const weekLabel = `${weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
  const monthLabel = `${MONTHS[calDate.getMonth()]} ${calDate.getFullYear()}`

  // Month calendar helpers
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }
  function getFirstDayOfMonth(year: number, month: number) {
    return (new Date(year, month, 1).getDay() + 6) % 7
  }

  // ──────────────────────────────────────────────
  // Entry card component (shared across views)
  // ──────────────────────────────────────────────

  function EntryCard({ entry, compact }: { entry: PlanningEntry; compact?: boolean }) {
    const isEditing = editingId === entry.id
    const isSaving = savingId === entry.id
    const typeLabel = typeLabels[entry.type] ?? entry.type
    const colorClass = typeColors[entry.type] ?? typeColors.AUTRE

    return (
      <div className={`rounded border-l-4 ${colorClass} ${compact ? "p-1.5" : "p-2"}`}>
        {/* Type badge at top */}
        <div className="mb-1 flex items-center justify-between gap-1">
          <span className="inline-block rounded bg-white/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
            {typeLabel}
          </span>
          {!isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(entry.id)
              }}
              className="text-red-400 hover:text-red-600 flex-shrink-0"
              title="Supprimer"
            >
              <X size={compact ? 10 : 12} />
            </button>
          )}
        </div>

        {/* Content: read or edit inline */}
        {isEditing ? (
          <div className="space-y-1">
            <textarea
              autoFocus
              dir="ltr"
              className="w-full rounded border border-blue-300 bg-white p-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
              style={{ textAlign: 'left' }}
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              onBlur={() => saveEdit(entry.id, editingContent)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditingId(null)
                  setEditingContent("")
                }
              }}
              rows={Math.max(2, (editingContent.match(/\n/g)?.length ?? 0) + 2)}
            />
            {isSaving && <span className="text-[9px] text-blue-500">Sauvegarde...</span>}
          </div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={() => startEdit(entry)}
          >
            {entry.notes ? (
              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                {entry.notes}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">Cliquez pour ajouter du contenu</p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ──────────────────────────────────────────────
  // View: List
  // ──────────────────────────────────────────────

  function ListView() {
    // Sort entries by date ascending
    const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    if (sorted.length === 0) {
      return (
        <div className="py-12 text-center text-sm text-gray-400">
          Aucune entrée pour ce mois.
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {sorted.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="min-w-[80px] text-center">
              <p className="text-xs font-bold">{new Date(entry.date).toLocaleDateString("fr-FR", { weekday: "short" })}</p>
              <p className="text-lg font-black">{new Date(entry.date).getDate()}</p>
            </div>
            <div className="flex-1">
              <EntryCard entry={entry} />
            </div>
          </div>
        ))}
      </div>
    )
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
      {/* Navigation + View toggle */}
      <Paper shadow="sm" p="sm" radius="md" withBorder>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Nav buttons */}
          <div className="flex items-center gap-1">
            {viewMode === "week" && (
              <>
                <Button variant="subtle" size="compact-sm" onClick={goToPrevWeek} leftSection={<ChevronLeft size={14} />}>
                  Sem.
                </Button>
                <Button variant="light" size="compact-sm" onClick={goToToday}>
                  Auj.
                </Button>
                <Button variant="subtle" size="compact-sm" onClick={goToNextWeek} rightSection={<ChevronRight size={14} />}>
                  Sem.
                </Button>
              </>
            )}
            {viewMode === "month" && (
              <>
                <Button variant="subtle" size="compact-sm" onClick={goToPrevMonth} leftSection={<ChevronLeft size={14} />}>
                  Mois
                </Button>
                <Button variant="light" size="compact-sm" onClick={goToToday}>
                  Auj.
                </Button>
                <Button variant="subtle" size="compact-sm" onClick={goToNextMonth} rightSection={<ChevronRight size={14} />}>
                  Mois
                </Button>
              </>
            )}
            {viewMode === "list" && (
              <>
                <Button variant="subtle" size="compact-sm" onClick={goToPrevMonth} leftSection={<ChevronLeft size={14} />}>
                  Mois
                </Button>
                <Button variant="light" size="compact-sm" onClick={goToToday}>
                  Auj.
                </Button>
                <Button variant="subtle" size="compact-sm" onClick={goToNextMonth} rightSection={<ChevronRight size={14} />}>
                  Mois
                </Button>
              </>
            )}
            <Text fw={600} size="sm" className="ml-2 min-w-[140px]">
              {viewMode === "week" ? weekLabel : monthLabel}
            </Text>
          </div>

          {/* View toggle + Add */}
          <div className="flex items-center gap-2">
            <Group gap={4}>
              {(["week", "month", "list"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "filled" : "subtle"}
                  size="compact-xs"
                  onClick={() => setViewMode(mode)}
                >
                  {mode === "week" ? "Semaine" : mode === "month" ? "Mois" : "Liste"}
                </Button>
              ))}
            </Group>
            <Button
              size="compact-sm"
              variant="light"
              leftSection={<Plus size={14} />}
              onClick={() => {
                setCreateDate(new Date().toISOString().slice(0, 10))
                setCreateType("ENTRAINEMENT")
                setCreateContent("")
                setCreateModalOpen(true)
              }}
            >
              Ajouter
            </Button>
          </div>
        </div>
      </Paper>

      {/* ─── WEEK VIEW ─── */}
      {viewMode === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, idx) => {
            const key = dateKey(date)
            const dayEntries = entriesByDate.get(key) ?? []
            const isToday =
              date.getFullYear() === new Date().getFullYear() &&
              date.getMonth() === new Date().getMonth() &&
              date.getDate() === new Date().getDate()

            return (
              <div
                key={key}
                className={`flex flex-col rounded-lg border min-h-[220px] ${
                  isToday ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"
                }`}
              >
                <div className={`px-2 py-1.5 text-center text-xs font-bold ${isToday ? "bg-blue-100 text-blue-800" : "bg-gray-50 text-gray-600"}`}>
                  {DAY_NAMES[idx]}
                  <span className="block text-lg">{date.getDate()}</span>
                </div>
                <div className="flex-1 space-y-1.5 p-1.5 overflow-auto">
                  {dayEntries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} compact />
                  ))}
                  <button
                    onClick={() => {
                      setCreateDate(key)
                      setCreateType("ENTRAINEMENT")
                      setCreateContent("")
                      setCreateModalOpen(true)
                    }}
                    className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-gray-300 p-1 text-[10px] text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                  >
                    <Plus size={12} />
                    Ajouter
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── MONTH VIEW ─── */}
      {viewMode === "month" && (
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-7 bg-gray-50">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-500 border-b">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: getFirstDayOfMonth(calDate.getFullYear(), calDate.getMonth()) }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] bg-gray-50/50 p-1 border" />
            ))}
            {Array.from({ length: getDaysInMonth(calDate.getFullYear(), calDate.getMonth()) }).map((_, i) => {
              const d = new Date(calDate.getFullYear(), calDate.getMonth(), i + 1)
              const key = dateKey(d)
              const dayEntries = entriesByDate.get(key) ?? []
              const isToday =
                d.getFullYear() === new Date().getFullYear() &&
                d.getMonth() === new Date().getMonth() &&
                d.getDate() === new Date().getDate()

              return (
                <div
                  key={key}
                  className={`min-h-[90px] p-1 border ${isToday ? "bg-blue-50" : ""}`}
                >
                  <div className={`text-xs font-semibold mb-1 px-1 ${isToday ? "text-blue-700" : "text-gray-500"}`}>
                    {i + 1}
                  </div>
                  <div className="space-y-0.5">
                    {dayEntries.slice(0, 2).map((entry) => {
                      const typeLabel = typeLabels[entry.type] ?? entry.type
                      return (
                        <div
                          key={entry.id}
                          className="cursor-pointer rounded border-l-2 px-1 text-[9px] leading-tight truncate"
                          style={{ borderLeftColor: typeColors[entry.type]?.match(/border-(\w+-\d+)/)?.[1] ?? "gray" }}
                          onClick={() => startEdit(entry)}
                          title={entry.notes || undefined}
                        >
                          <span className="font-medium">{typeLabel}</span>
                          {entry.notes && <span className="ml-0.5 text-gray-500">: {entry.notes}</span>}
                        </div>
                      )
                    })}
                    {dayEntries.length > 2 && (
                      <div className="text-[9px] text-gray-400 px-1">+{dayEntries.length - 2} autres</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── LIST VIEW ─── */}
      {viewMode === "list" && <ListView />}

      {/* ─── Create Modal ─── */}
      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Nouvelle entrée"
        size="md"
        trapFocus={false}
      >
        <Stack gap="sm">
          <NativeSelect
            label="Type"
            data={[
              { value: "ENTRAINEMENT", label: "Entraînement" },
              { value: "MATCH", label: "Match" },
              { value: "OBJECTIF", label: "Objectif" },
              { value: "REATHLETISATION", label: "Réathlétisation" },
              { value: "REPOS", label: "Repos" },
              { value: "TEST", label: "Test" },
              { value: "AUTRE", label: "Autre" },
              { value: "INDISPONIBILITE", label: "Indisponibilité" },
            ]}
            value={createType}
            onChange={(e) => setCreateType(e.currentTarget.value)}
          />
          <TextInput
            label="Date"
            type="date"
            value={createDate}
            onChange={(e) => setCreateDate(e.currentTarget.value)}
            required
          />
          <Textarea
            label="Contenu"
            placeholder="Détails de l'événement..."
            value={createContent}
            onChange={(e) => setCreateContent(e.currentTarget.value)}
            minRows={3}
            autosize
            autoFocus
            dir="ltr"
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} loading={creating} disabled={!createContent.trim()}>
              Ajouter
            </Button>
          </Group>
        </Stack>
      </Modal>
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