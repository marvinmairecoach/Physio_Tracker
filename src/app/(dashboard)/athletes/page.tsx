"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Eye, Pencil, Trash2, Search } from "lucide-react"

import {
  Card,
  Table,
  TextInput,
  Button,
  Badge,
  Modal,
  Text,
  Group,
} from "@mantine/core"

interface Team {
  id: string
  name: string
}

interface Athlete {
  id: string
  firstName: string
  lastName: string
  isActive: boolean
  teams?: { team: Team }[]
}

export default function AthletesPage() {
  const router = useRouter()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [teams, setTeams] = useState<Team[]>([])
  const [filterTeam, setFilterTeam] = useState("")
  const [userRole, setUserRole] = useState<string | null>(null)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Athlete | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = userRole === "admin"

  useEffect(() => {
    async function fetchData() {
      try {
        const [athletesRes, teamsRes, meRes] = await Promise.all([
          fetch("/api/athletes"),
          fetch("/api/teams"),
          fetch("/api/auth/me"),
        ])
        if (!athletesRes.ok) throw new Error("Erreur lors du chargement des athlètes")
        const athletesData = await athletesRes.json()
        setAthletes(Array.isArray(athletesData) ? athletesData : athletesData.athletes ?? [])

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json()
          setTeams(Array.isArray(teamsData) ? teamsData : teamsData.teams ?? [])
        }

        if (meRes.ok) {
          const meData = await meRes.json()
          setUserRole(meData.user?.role ?? null)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredAthletes = athletes.filter((a) => {
    const fullName = `${a.firstName} ${a.lastName}`.toLowerCase()
    const matchesSearch = fullName.includes(search.toLowerCase())
    const matchesTeam =
      !filterTeam ||
      (a.teams ?? []).some((t) => t.team?.id === filterTeam)
    return matchesSearch && matchesTeam
  })

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/athletes/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Erreur")
      setAthletes((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Athlètes</h1>
        {userRole !== "athlete" && (
          <Button onClick={() => router.push("/athletes/create")} leftSection={<Plus className="h-4 w-4" />}>
            Créer un athlète
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <TextInput
            placeholder="Rechercher un athlète..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftSection={<Search className="h-4 w-4 text-gray-400" />}
          />
        </div>
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="flex h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Toutes les équipes</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <Card withBorder padding="lg">
        <Text fw={600} size="lg" mb="md">Liste des athlètes</Text>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Équipe(s)</Table.Th>
              <Table.Th>Statut</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredAthletes.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" ta="center">Aucun athlète trouvé</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredAthletes.map((athlete) => (
                <Table.Tr key={athlete.id}>
                  <Table.Td>
                    <Text fw={500}>
                      <Link href={`/athletes/${athlete.id}`} className="hover:text-blue-600 transition-colors">
                        {athlete.firstName} {athlete.lastName}
                      </Link>
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {(athlete.teams ?? []).length > 0
                      ? (athlete.teams ?? []).map((t, i) => (
                          <span key={t.team.id}>
                            {i > 0 && ", "}
                            <Link href={`/teams/${t.team.id}`} className="hover:text-blue-600 transition-colors">
                              {t.team.name}
                            </Link>
                          </span>
                        ))
                      : "—"}
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={athlete.isActive ? "green" : "gray"}
                      variant="light"
                    >
                      {athlete.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        variant="outline"
                        size="compact-sm"
                        onClick={() => router.push(`/athletes/${athlete.id}`)}
                        leftSection={<Eye className="h-4 w-4" />}
                      >
                        Voir
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="outline"
                            size="compact-sm"
                            onClick={() => router.push(`/athletes/${athlete.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="compact-sm"
                            color="red"
                            onClick={() => setDeleteTarget(athlete)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Delete confirmation */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer l'athlète"
        centered
      >
        <Text size="sm" mb="lg">
          Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong> ?<br />
          Cette action est irréversible.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Annuler
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleting}>
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </Group>
      </Modal>
    </div>
  )
}