"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Eye, Pencil, Search } from "lucide-react"

import { Card, Table, TextInput, Button, Badge, Group, Text } from "@mantine/core"

interface DirigeantRole {
  role: {
    id: string
    name: string
  }
}

interface Dirigeant {
  id: string
  firstName: string
  lastName: string
  address: string | null
  phone: string | null
  email: string | null
  roles: DirigeantRole[]
}

export default function DirigeantsPage() {
  const router = useRouter()
  const [dirigeants, setDirigeants] = useState<Dirigeant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchDirigeants() {
      try {
        const res = await fetch("/api/dirigeants")
        if (!res.ok) throw new Error("Erreur lors du chargement des dirigeants")
        const data = await res.json()
        setDirigeants(Array.isArray(data) ? data : data.dirigeants ?? [])
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    fetchDirigeants()
  }, [])

  const filteredDirigeants = dirigeants.filter((d) => {
    const fullName = `${d.firstName} ${d.lastName}`.toLowerCase()
    return fullName.includes(search.toLowerCase())
  })

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dirigeants</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/dirigeants/roles")}>
            Gérer les rôles
          </Button>
          <Button onClick={() => router.push("/dirigeants/create")} leftSection={<Plus className="h-4 w-4" />}>
            Créer un dirigeant
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <TextInput
            placeholder="Rechercher un dirigeant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftSection={<Search className="h-4 w-4 text-gray-400" />}
          />
        </div>
      </div>

      <Card withBorder padding="lg">
        <Text fw={600} size="lg" mb="md">Liste des dirigeants</Text>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Prénom</Table.Th>
              <Table.Th>Rôles</Table.Th>
              <Table.Th>Téléphone</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredDirigeants.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center">Aucun dirigeant trouvé</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredDirigeants.map((dirigeant) => (
                <Table.Tr key={dirigeant.id}>
                  <Table.Td>
                    <Text fw={500}>
                      <Link href={`/dirigeants/${dirigeant.id}`} className="hover:text-blue-600 transition-colors">
                        {dirigeant.lastName}
                      </Link>
                    </Text>
                  </Table.Td>
                  <Table.Td>{dirigeant.firstName}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {(dirigeant.roles ?? []).length > 0
                        ? (dirigeant.roles ?? []).map((r, i) => (
                            <span key={r.role.id}>
                              {i > 0 && ", "}
                              <Badge variant="light" color="grape" size="sm">
                                {r.role.name}
                              </Badge>
                            </span>
                          ))
                        : "—"}
                    </Group>
                  </Table.Td>
                  <Table.Td>{dirigeant.phone ?? "—"}</Table.Td>
                  <Table.Td>{dirigeant.email ?? "—"}</Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        variant="outline"
                        size="compact-sm"
                        onClick={() => router.push(`/dirigeants/${dirigeant.id}`)}
                        leftSection={<Eye className="h-4 w-4" />}
                      >
                        Voir
                      </Button>
                      <Button
                        variant="outline"
                        size="compact-sm"
                        color="orange"
                        onClick={() => router.push(`/dirigeants/${dirigeant.id}/edit`)}
                        leftSection={<Pencil className="h-4 w-4" />}
                      >
                        Modifier
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>
    </div>
  )
}