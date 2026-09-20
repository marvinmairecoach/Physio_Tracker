"use client"

import { useEffect, useState } from "react"
import { Button, Card, Text, Badge, Group, ScrollArea, Paper } from "@mantine/core"

interface LogEntry {
  timestamp: string
  error: string
  stack: string | undefined
  componentStack: string | undefined
  url: string
}

export default function DebugPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/physio-data/api/debug/log")
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🪲 Debug console</h1>
          <p className="text-sm text-gray-500">
            Dernières erreurs client capturées par ErrorBoundary
          </p>
        </div>
        <Button variant="light" onClick={fetchLogs} loading={loading}>
          Actualiser
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card withBorder className="text-center py-12">
          <Text c="dimmed">
            {loading ? "Chargement..." : "Aucune erreur enregistrée"}
          </Text>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <Card key={i} withBorder className="border-red-200">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge color="red" variant="light" size="sm">
                    ERREUR
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {new Date(entry.timestamp).toLocaleString("fr-FR")}
                  </Text>
                  <Text size="xs" c="dimmed" className="font-mono truncate max-w-[300px]">
                    {entry.url}
                  </Text>
                </div>
                <div className="bg-red-50 rounded p-3 overflow-auto max-h-24">
                  <Text size="sm" className="font-mono text-red-700">
                    {entry.error}
                  </Text>
                </div>
                {(entry.stack || entry.componentStack) && (
                  <details>
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      Voir la stack trace
                    </summary>
                    <pre className="mt-2 bg-gray-50 rounded p-3 overflow-auto max-h-64 text-xs font-mono">
                      {entry.stack}
                      {entry.componentStack && `\n\n--- Component Stack ---\n${entry.componentStack}`}
                    </pre>
                  </details>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}