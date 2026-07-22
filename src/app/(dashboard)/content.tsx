"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    const fetchData = async () => {
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your athletes, teams, and alerts.</p>
      </div>

      {/* Stat Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Main grid: Recent Alerts + Recent Test Results */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Alerts */}
        <AlertsList />

        {/* Recent Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {recentResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent test results.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Athlete</th>
                      <th className="pb-2 font-medium">Test Type</th>
                      <th className="pb-2 font-medium">Value</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentResults.map((result) => (
                      <tr key={result.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{result.athlete.firstName} {result.athlete.lastName}</td>
                        <td className="py-2 text-muted-foreground">{result.testType.name}</td>
                        <td className="py-2">
                          {result.value} {result.testType.unit}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(result.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}