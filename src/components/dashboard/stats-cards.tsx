import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Shield, Activity, AlertTriangle } from "lucide-react"

export interface DashboardStats {
  athletesCount: number
  teamsCount: number
  testsCount: number
  alertsCount: number
}

interface StatCardDef {
  label: string
  value: number
  icon: React.ElementType
  color: string
}

export function StatsCards({ stats }: { stats: DashboardStats }) {
  const cards: StatCardDef[] = [
    { label: "Total Athletes", value: stats.athletesCount, icon: Users, color: "text-blue-600" },
    { label: "Total Teams", value: stats.teamsCount, icon: Shield, color: "text-green-600" },
    { label: "Tests This Month", value: stats.testsCount, icon: Activity, color: "text-blue-600" },
    { label: "Active Alerts", value: stats.alertsCount, icon: AlertTriangle, color: "text-red-600" },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}