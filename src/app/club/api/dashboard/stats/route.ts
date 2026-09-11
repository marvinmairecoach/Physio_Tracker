import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const [
    totalUsers,
    athleteDirectUsers,
    athleteRoleUsers,
    dirigeantsCount,
    injuredCount,
    teamsCount,
    teams,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "athlete" } }),
    prisma.user.count({
      where: {
        roleAssignments: {
          some: {
            role: { name: "Athlète" },
          },
        },
      },
    }),
    prisma.dirigeant.count(),
    prisma.injury.count({ where: { recoveryDate: null } }),
    prisma.team.count(),
    prisma.team.findMany({
      select: {
        name: true,
        _count: {
          select: {
            athletes: {
              where: { isActive: true },
            },
          },
        },
      },
    }),
  ])

  const athleteUsers = athleteDirectUsers + athleteRoleUsers

  const teamsWithPlayers = teams.map((team) => ({
    name: team.name,
    playerCount: team._count.athletes,
  }))

  return NextResponse.json({
    totalUsers,
    athleteUsers,
    dirigeantsCount,
    injuredCount,
    teamsCount,
    teamsWithPlayers,
  })
}