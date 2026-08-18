"use client"

import { useEffect, useState } from "react"
import { Card, Text, Title, SimpleGrid, Table, Badge, Center, Loader } from "@mantine/core"

interface TeamWithPlayers {
  name: string
  playerCount: number
}

interface DashboardStats {
  totalUsers: number
  athleteUsers: number
  dirigeantsCount: number
  injuredCount: number
  teamsCount: number
  teamsWithPlayers: TeamWithPlayers[]
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch("/api/dashboard/stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch {
        // Silently handle errors — UI will show empty/zero states
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Center h="60vh">
        <Loader size="lg" />
      </Center>
    )
  }

  const statCards = [
    { emoji: "👥", label: "Total utilisateurs", value: stats?.totalUsers ?? 0, color: "blue" },
    { emoji: "🏃", label: "Athlètes", value: stats?.athleteUsers ?? 0, color: "teal" },
    { emoji: "🏢", label: "Dirigeants", value: stats?.dirigeantsCount ?? 0, color: "grape" },
    { emoji: "🩹", label: "Blessés", value: stats?.injuredCount ?? 0, color: "red" },
    { emoji: "🏆", label: "Équipes", value: stats?.teamsCount ?? 0, color: "orange" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Title order={1}>Tableau de bord</Title>
        <Text c="dimmed" size="md">
          Vue d&apos;ensemble de votre activité
        </Text>
      </div>

      {/* Stat Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {statCards.map((card) => (
          <Card key={card.label} withBorder padding="lg" radius="md" shadow="sm">
            <Text size="xl" mb="xs">
              {card.emoji}
            </Text>
            <Text fw={700} size="xxl">
              {card.value}
            </Text>
            <Text size="sm" c="dimmed">
              {card.label}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      {/* Teams Table */}
      <Card withBorder padding="lg" radius="md" shadow="sm">
        <Title order={2} size="h3" mb="md">
          🏆 Équipes
        </Title>
        {stats?.teamsWithPlayers && stats.teamsWithPlayers.length > 0 ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom de l&apos;équipe</Table.Th>
                <Table.Th>Nombre d&apos;athlètes</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stats.teamsWithPlayers.map((team) => (
                <Table.Tr key={team.name}>
                  <Table.Td>
                    <Text fw={500}>{team.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={team.playerCount > 0 ? "teal" : "gray"} variant="light">
                      {team.playerCount} athlète{team.playerCount !== 1 ? "s" : ""}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text size="sm" c="dimmed">
            Aucune équipe pour le moment.
          </Text>
        )}
      </Card>
    </div>
  )
}