import { NextRequest, NextResponse } from "next/server"
import { physioPrisma as prisma } from "@/lib/prisma-physio"
import { requireAuth } from "@/lib/auth-physio"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await requireAuth()

    const bilans = await prisma.bilan.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            gender: true,
          },
        },
      },
    })

    return NextResponse.json({ bilans })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("GET /api/bilans error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()

    if (!body.athleteId || !body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: "athleteId and title are required" },
        { status: 400 }
      )
    }

    // Verify athlete exists
    const athlete = await prisma.athlete.findUnique({
      where: { id: body.athleteId },
      select: { id: true },
    })
    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const bilan = await prisma.bilan.create({
      data: {
        title: body.title.trim(),
        athleteId: body.athleteId,
        description: body.description?.trim() || null,
        date: body.date ? new Date(body.date) : undefined,
        config: body.config || {
          selectedTestIds: [],
          radarTestCount: 6,
          showNorms: true,
          showTeamComparison: true,
        },
      },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            gender: true,
          },
        },
      },
    })

    return NextResponse.json({ bilan }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("POST /api/bilans error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}