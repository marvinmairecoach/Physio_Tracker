"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

const severityBadge: Record<Alert["severity"], string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
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
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent alerts.</p>
        ) : (
          alerts.slice(0, 10).map((alert) => (
            <div
              key={alert.id}
              className={`rounded-r-lg border-l-4 p-3 ${severityColors[alert.severity]}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{alert.athlete?.firstName} {alert.athlete?.lastName}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityBadge[alert.severity]}`}
                >
                  {alert.severity}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(alert.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}