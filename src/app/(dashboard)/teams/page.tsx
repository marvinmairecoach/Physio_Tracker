"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Eye, Pencil, Trash2 } from "lucide-react"

import { Button, Card, Table, Badge, Modal } from "@mantine/core"

interface Team {
  id: string
  name: string
  sport: string | null
  category: string | null
  notes: string | null
  actifCount: number
  blesseCount: number
  inactifCount: number
}

export default function TeamsPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = userRole === "admin"

  useEffect(() => {
    async function fetchData() {
      try {
        const [teamsRes, meRes] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/auth/me"),
        ])
        if (!teamsRes.ok) throw new Error("Erreur lors du chargement des équipes")

        const data = await teamsRes.json()
        setTeams(Array.isArray(data) ? data : data.teams ?? [])

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

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/teams/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Erreur lors de la suppression")
      setTeams((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Équipes</h1>
        {isAdmin && (
          <Button onClick={() => router.push("/teams/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Créer une équipe
          </Button>
        )}
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Card.Section withBorder inheritPadding py="sm">
          <h2 className="text-xl font-semibold">Toutes les équipes</h2>
        </Card.Section>
        <div className="p-4">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom</Table.Th>
                <Table.Th>Sport</Table.Th>
                <Table.Th className="text-center">Actifs</Table.Th>
                <Table.Th className="text-center">Blessés</Table.Th>
                <Table.Th className="text-center">Inactifs</Table.Th>
                <Table.Th className="text-right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {teams.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6} className="text-center text-gray-500">
                    Aucune équipe trouvée
                  </Table.Td>
                </Table.Tr>
              ) : (
                teams.map((team) => (
                  <Table.Tr key={team.id}>
                    <Table.Td className="font-medium">
                      <Link href={`/teams/${team.id}`} className="hover:text-blue-600 transition-colors">
                        {team.name}
                      </Link>
                    </Table.Td>
                    <Table.Td>
                      {team.sport ? <Badge color="gray">{team.sport}</Badge> : "—"}
                    </Table.Td>
                    <Table.Td className="text-center">{team.actifCount ?? 0}</Table.Td>
                    <Table.Td className="text-center">{team.blesseCount ?? 0}</Table.Td>
                    <Table.Td className="text-center">{team.inactifCount ?? 0}</Table.Td>
                    <Table.Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/teams/${team.id}`)}>
                          <Eye className="mr-1 h-4 w-4" />
                          Voir
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/teams/${team.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              color="red"
                              onClick={() => setDeleteTarget(team)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </div>
      </Card>

      {/* Delete confirmation dialog */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer l'équipe"
        size="md"
      >
        <p className="text-sm text-gray-600 mb-6">
          Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.name}</strong> ?
          Cette action est irréversible. Tous les joueurs seront retirés de l'équipe
          mais les athlètes et leurs résultats seront conservés.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Annuler
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleting}>
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}