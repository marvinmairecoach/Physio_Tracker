"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface LoadDataPoint {
  date: string
  load: number
}

export function LoadChart({ athleteId = "all" }: { athleteId?: string }) {
  const [data, setData] = useState<LoadDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLoad = async () => {
      setLoading(true)
      setError(null)
      try {
        const url =
          athleteId === "all"
            ? "/api/athletes/individual/training-load?days=30"
            : `/api/athletes/${athleteId}/training-load?days=30`

        const res = await fetch(url)
        if (!res.ok) throw new Error("Failed to fetch training load data")
        const result = await res.json()
        setData(Array.isArray(result) ? result : result.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchLoad()
  }, [athleteId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Training Load (30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Training Load (30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Load (30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(val: string) => {
                  const d = new Date(val)
                  return `${d.getDate()}/${d.getMonth() + 1}`
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(val: string) => new Date(val).toLocaleDateString()}
                formatter={(value: number) => [`${value}`, "Load"]}
              />
              <Line
                type="monotone"
                dataKey="load"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}