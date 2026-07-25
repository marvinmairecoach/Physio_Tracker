"use client"

import { useEffect, useState } from "react"
import { Card, Text, Title, SimpleGrid, Table } from "@mantine/core"
import { StatsCards, type DashboardStats } from "@/components/dashboard/stats-cards"
import { AlertsList } from "@/components/dashboard/alerts-list"

interface TestResult {
  id: string
  athlete: { firstName: string; lastName: string }
  testType: { name: string; unit: string }
  value: number
  date: string
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentResults, setRecentResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [statsRes, resultsRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/tests/results?limit=5"),
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }

        if (resultsRes.ok) {
          const resultsData = await resultsRes.json()
          setRecentResults(
            Array.isArray(resultsData) ? resultsData : resultsData.data ?? resultsData.results ?? []
          )
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
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500">Overview of your athletes, teams, and alerts.</p>
      </div>

      {/* Stat Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Main grid: Recent Alerts + Recent Test Results */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Alerts */}
        <AlertsList />

        {/* Recent Test Results */}
        <Card withBorder padding="lg">
          <Text fw={600} size="lg" mb="md">Recent Test Results</Text>
          {recentResults.length === 0 ? (
            <Text size="sm" c="dimmed">No recent test results.</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Athlete</Table.Th>
                  <Table.Th>Test Type</Table.Th>
                  <Table.Th>Value</Table.Th>
                  <Table.Th>Date</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recentResults.map((result) => (
                  <Table.Tr key={result.id}>
                    <Table.Td>
                      <Text fw={500}>{result.athlete.firstName} {result.athlete.lastName}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed">{result.testType.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      {result.value} {result.testType.unit}
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed">{new Date(result.date).toLocaleDateString()}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  )
}