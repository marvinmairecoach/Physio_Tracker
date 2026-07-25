"use client"

import { useEffect, useState } from "react"
import { Card, Text, Badge } from "@mantine/core"

interface Alert {
  id: string
  athlete: { firstName: string; lastName: string }
  message: string
  severity: "critical" | "warning" | "info"
  createdAt: string
}

const severityColors: Record<Alert["severity"], string> = {
  critical: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
  warning: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
  info: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
}

const severityBadgeColors: Record<Alert["severity"], string> = {
  critical: "red",
  warning: "yellow",
  info: "blue",
}

export function AlertsList() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/alerts?isRead=false&severity=warning,critical")
        if (!res.ok) throw new Error("Failed to fetch alerts")
        const result = await res.json()
        setAlerts(Array.isArray(result) ? result : result.data ?? result.alerts ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [])

  if (loading) {
    return (
      <Card withBorder padding="lg">
        <Text fw={600} size="lg" mb="md">Recent Alerts</Text>
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card withBorder padding="lg">
        <Text fw={600} size="lg" mb="md">Recent Alerts</Text>
        <Text size="sm" c="red">{error}</Text>
      </Card>
    )
  }

  return (
    <Card withBorder padding="lg">
      <Text fw={600} size="lg" mb="md">Recent Alerts</Text>
      {alerts.length === 0 ? (
        <Text size="sm" c="dimmed">No recent alerts.</Text>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 10).map((alert) => (
            <div
              key={alert.id}
              className={`rounded-r-lg border-l-4 p-3 ${severityColors[alert.severity]}`}
            >
              <div className="flex items-center justify-between">
                <Text size="sm" fw={500}>
                  {alert.athlete?.firstName} {alert.athlete?.lastName}
                </Text>
                <Badge color={severityBadgeColors[alert.severity]} variant="light" size="sm">
                  {alert.severity}
                </Badge>
              </div>
              <Text size="sm" c="dimmed" mt={4}>{alert.message}</Text>
              <Text size="xs" c="dimmed" mt={2}>
                {new Date(alert.createdAt).toLocaleDateString()}
              </Text>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}