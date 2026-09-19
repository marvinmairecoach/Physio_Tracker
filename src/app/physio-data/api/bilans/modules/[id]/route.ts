import { NextRequest, NextResponse } from "next/server"
import { physioPrisma as prisma } from "@/lib/prisma-physio"
import { requireAuth } from "@/lib/auth-physio"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const { id } = params

    const existing = await prisma.bilanModule.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    const body = await request.json()

    const data: Record<string, unknown> = {}

    if (body.title !== undefined) {
      if (!body.title.trim()) {
        return NextResponse.json(
          { error: "title cannot be empty" },
          { status: 400 }
        )
      }
      data.title = body.title.trim()
    }

    if (body.questions !== undefined) {
      data.questions = body.questions
    }

    if (body.isActive !== undefined) {
      data.isActive = body.isActive
    }

    if (body.ordering !== undefined) {
      data.ordering = body.ordering
    }

    if (body.bilanId !== undefined) {
      data.bilanId = body.bilanId || null
    }

    const module = await prisma.bilanModule.update({
      where: { id },
      data,
    })

    return NextResponse.json({ module })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("PATCH /api/bilans/modules/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const { id } = params

    const existing = await prisma.bilanModule.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    // Soft delete: set isActive to false
    const module = await prisma.bilanModule.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ module })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("DELETE /api/bilans/modules/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}