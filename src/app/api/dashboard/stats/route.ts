import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const [athletesCount, teamsCount, testsCount, alertsCount] = await Promise.all([
    prisma.athlete.count({ where: { isActive: true } }),
    prisma.team.count(),
    prisma.testType.count(),
    prisma.alert.count({ where: { isRead: false } }),
  ])

  return NextResponse.json({ athletesCount, teamsCount, testsCount, alertsCount })
}