import { Card, Text, SimpleGrid } from "@mantine/core"
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
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.label} withBorder padding="lg">
            <div className="flex items-center justify-between">
              <Text size="sm" fw={500} c="dimmed">{card.label}</Text>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <Text size="2xl" fw={700} mt="sm">{card.value}</Text>
          </Card>
        )
      })}
    </SimpleGrid>
  )
}