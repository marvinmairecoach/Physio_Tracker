"use client"

import { useEffect, useState } from "react"
import { Card, Badge, Button } from "@mantine/core"
import { Bell, CheckCheck, AlertTriangle, Info, AlertCircle } from "lucide-react"

interface Alert {
  id: string
  athlete: { firstName: string; lastName: string } | null
  message: string
  severity: "critical" | "warning" | "info"
  type: string
  isRead: boolean
  createdAt: string
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    color: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
    badge: "red" as const,
  },
  warning: {
    icon: AlertTriangle,
    color: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
    badge: "yellow" as const,
  },
  info: {
    icon: Info,
    color: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
    badge: "blue" as const,
  },
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "unread">("unread")

  useEffect(() => {
    fetchAlerts()
  }, [filter])

  async function fetchAlerts() {
    setLoading(true)
    setError(null)
    try {
      const params = filter === "unread" ? "?isRead=false" : ""
      const res = await fetch(`/api/alerts${params}`)
      if (!res.ok) throw new Error("Erreur lors du chargement des alertes")
      const data = await res.json()
      setAlerts(Array.isArray(data) ? data : data.data ?? data.alerts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(id: string) {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id))
      }
    } catch {
      // ignore
    }
  }

  async function markAllAsRead() {
    try {
      await Promise.all(
        alerts.map((a) =>
          fetch(`/api/alerts/${a.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isRead: true }),
          })
        )
      )
      setAlerts([])
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertes</h1>
          <p className="text-muted-foreground">
            Suivi des alertes et notifications importantes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "all" ? "filled" : "outline"}
            size="compact-sm"
            onClick={() => setFilter("all")}
          >
            Toutes
          </Button>
          <Button
            variant={filter === "unread" ? "filled" : "outline"}
            size="compact-sm"
            onClick={() => setFilter("unread")}
          >
            Non lues
          </Button>
          {alerts.length > 0 && (
            <Button variant="subtle" size="compact-sm" onClick={markAllAsRead}>
              <CheckCheck className="mr-1 h-4 w-4" />
              Tout marquer lu
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {error && (
        <Card withBorder className="max-w-none">
          <div className="py-8 text-center" style={{ color: 'var(--mantine-color-red-filled)' }}>
            {error}
          </div>
        </Card>
      )}

      {!loading && !error && alerts.length === 0 && (
        <Card withBorder className="max-w-none">
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium">Aucune alerte</p>
            <p className="text-sm">
              {filter === "unread"
                ? "Toutes les alertes ont été lues."
                : "Aucune alerte pour le moment."}
            </p>
          </div>
        </Card>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.info
            const Icon = config.icon
            return (
              <div
                key={alert.id}
                className={`rounded-r-lg border-l-4 p-4 transition-colors ${config.color}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {alert.athlete
                            ? `${alert.athlete.firstName} ${alert.athlete.lastName}`
                            : "Système"}
                        </span>
                        <Badge color={config.badge} size="sm">
                          {alert.severity}
                        </Badge>
                        {alert.type && (
                          <span className="text-xs text-muted-foreground">
                            {alert.type}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {alert.message}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    onClick={() => markAsRead(alert.id)}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}