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

    const bilan = await prisma.bilan.findUnique({
      where: { id },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            birthDate: true,
            email: true,
            teams: {
              where: { isActive: true },
              include: { team: { select: { id: true, name: true } } },
            },
          },
        },
      },
    })

    if (!bilan) {
      return NextResponse.json({ error: "Bilan introuvable" }, { status: 404 })
    }

    return NextResponse.json({ bilan })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("GET /api/bilans/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    const { id } = params
    const body = await request.json()

    const existing = await prisma.bilan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Bilan introuvable" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title.trim()
    if (body.description !== undefined) data.description = body.description?.trim() || null
    if (body.config !== undefined) data.config = body.config

    const bilan = await prisma.bilan.update({
      where: { id },
      data,
    })

    return NextResponse.json({ bilan })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("PATCH /api/bilans/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    const { id } = params

    const existing = await prisma.bilan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Bilan introuvable" }, { status: 404 })
    }

    await prisma.bilan.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("DELETE /api/bilans/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}