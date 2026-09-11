import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    const { id } = params

    const bilans = await prisma.bilan.findMany({
      where: { athleteId: id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        config: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ bilans })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("GET /api/athletes/[id]/bilans error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    const { id } = params
    const body = await request.json()

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 })
    }

    const bilan = await prisma.bilan.create({
      data: {
        title: body.title.trim(),
        athleteId: id,
        description: body.description?.trim() || null,
        config: body.config || {
          selectedTestIds: [],
          radarTestCount: 6,
          showNorms: true,
          showTeamComparison: true,
        },
      },
    })

    return NextResponse.json({ bilan }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("POST /api/athletes/[id]/bilans error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}