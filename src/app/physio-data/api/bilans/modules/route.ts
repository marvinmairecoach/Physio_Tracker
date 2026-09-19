import { NextRequest, NextResponse } from "next/server"
import { physioPrisma as prisma } from "@/lib/prisma-physio"
import { requireAuth } from "@/lib/auth-physio"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await requireAuth()

    const modules = await prisma.bilanModule.findMany({
      where: { isActive: true },
      orderBy: { ordering: "asc" },
      select: {
        id: true,
        title: true,
        tags: true,
        questions: true,
        ordering: true,
        isActive: true,
        bilanId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ modules })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("GET /api/bilans/modules error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()

    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      )
    }

    // Get the current highest ordering to place the new module at the end
    const lastModule = await prisma.bilanModule.findFirst({
      where: { isActive: true },
      orderBy: { ordering: "desc" },
      select: { ordering: true },
    })

    const module = await prisma.bilanModule.create({
      data: {
        title: body.title.trim(),
        tags: body.tags || [],
        questions: body.questions || [],
        ordering: (lastModule?.ordering ?? -1) + 1,
        bilanId: body.bilanId || null,
      },
    })

    return NextResponse.json({ module }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("POST /api/bilans/modules error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}