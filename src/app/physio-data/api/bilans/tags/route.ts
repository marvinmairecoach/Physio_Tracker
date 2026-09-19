import { NextRequest, NextResponse } from "next/server"
import { physioPrisma as prisma } from "@/lib/prisma-physio"
import { requireAuth } from "@/lib/auth-physio"

export const dynamic = "force-dynamic"

/** GET /api/bilans/tags — returns all unique tags with usage counts */
export async function GET() {
  try {
    await requireAuth()

    const modules = await prisma.bilanModule.findMany({
      select: { tags: true },
    })

    // Aggregate all tags
    const tagMap = new Map<string, number>()
    for (const m of modules) {
      const tags: string[] = (Array.isArray(m.tags) ? m.tags : []) as string[]
      for (const tag of tags) {
        tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
      }
    }

    const tags = Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ tags })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("GET /api/bilans/tags error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** PATCH /api/bilans/tags?old=...&new=... — renames a tag across all modules */
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const oldName = searchParams.get("old")
    const newName = searchParams.get("new")

    if (!oldName || !newName || oldName.trim() === "" || newName.trim() === "") {
      return NextResponse.json({ error: "old and new tag names required" }, { status: 400 })
    }

    if (oldName === newName) {
      return NextResponse.json({ success: true, message: "No change needed" })
    }

    // Find all modules that have the old tag
    const affectedModules = await prisma.bilanModule.findMany({
      where: {
        // Prisma doesn't support JSON contains queries natively for MySQL
        // We'll fetch and filter in memory
      },
      select: { id: true, tags: true },
    })

    const updates = affectedModules
      .filter((m) => {
        const tags: string[] = (Array.isArray(m.tags) ? m.tags : []) as string[]
        return tags.includes(oldName)
      })
      .map((m) => {
        const tags: string[] = (Array.isArray(m.tags) ? m.tags : []) as string[]
        return {
          id: m.id,
          newTags: tags.map((t) => (t === oldName ? newName : t)),
        }
      })

    // Update each module
    await Promise.all(
      updates.map((u) =>
        prisma.bilanModule.update({
          where: { id: u.id },
          data: { tags: u.newTags },
        })
      )
    )

    return NextResponse.json({ success: true, updated: updates.length })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("PATCH /api/bilans/tags error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** DELETE /api/bilans/tags?name=... — removes a tag from all modules */
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "tag name required" }, { status: 400 })
    }

    const modules = await prisma.bilanModule.findMany({
      select: { id: true, tags: true },
    })

    const updates = modules
      .filter((m) => {
        const tags: string[] = (Array.isArray(m.tags) ? m.tags : []) as string[]
        return tags.includes(name)
      })
      .map((m) => {
        const tags: string[] = (Array.isArray(m.tags) ? m.tags : []) as string[]
        return {
          id: m.id,
          newTags: tags.filter((t) => t !== name),
        }
      })

    await Promise.all(
      updates.map((u) =>
        prisma.bilanModule.update({
          where: { id: u.id },
          data: { tags: u.newTags },
        })
      )
    )

    return NextResponse.json({ success: true, removed: updates.length })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("DELETE /api/bilans/tags error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}