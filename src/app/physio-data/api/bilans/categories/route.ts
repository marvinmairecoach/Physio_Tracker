import { NextRequest, NextResponse } from "next/server"
import { physioPrisma as prisma } from "@/lib/prisma-physio"
import { requireAuth } from "@/lib/auth-physio"

export const dynamic = "force-dynamic"

/** GET /api/bilans/categories — returns all categories with usage counts */
export async function GET() {
  try {
    await requireAuth()

    const categories = await prisma.bilanCategory.findMany({
      orderBy: { name: "asc" },
    })

    // Count how many modules use each category
    const modules = await prisma.bilanModule.findMany({
      where: { isActive: true },
      select: { categories: true },
    })
    const usageMap = new Map<string, number>()
    for (const m of modules) {
      if (Array.isArray(m.categories)) {
        for (const cat of m.categories as string[]) {
          if (cat) usageMap.set(cat, (usageMap.get(cat) ?? 0) + 1)
        }
      }
    }

    const result = categories.map((c) => ({
      id: c.id,
      name: c.name,
      count: usageMap.get(c.name) ?? 0,
    }))

    return NextResponse.json({ categories: result })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("GET /api/bilans/categories error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** POST /api/bilans/categories — creates a new category */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const name = body.name?.trim()

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const existing = await prisma.bilanCategory.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 })
    }

    const category = await prisma.bilanCategory.create({
      data: { name },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("POST /api/bilans/categories error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** PATCH /api/bilans/categories — renames a category */
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const newName = searchParams.get("name")?.trim()

    if (!id || !newName) {
      return NextResponse.json({ error: "id and name are required" }, { status: 400 })
    }

    // Get the old name
    const old = await prisma.bilanCategory.findUnique({ where: { id } })
    if (!old) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Rename in the category table
    const category = await prisma.bilanCategory.update({
      where: { id },
      data: { name: newName },
    })

    // Update all modules that used the old name
    const oldMods = await prisma.bilanModule.findMany({
      where: { isActive: true },
      select: { id: true, categories: true },
    })
    await Promise.all(
      oldMods
        .filter((m) => Array.isArray(m.categories) && (m.categories as string[]).includes(old.name))
        .map((m) => {
          const cats = (m.categories as string[]).map((c) =>
            c === old.name ? newName : c
          )
          return prisma.bilanModule.update({
            where: { id: m.id },
            data: { categories: cats },
          })
        })
    )

    return NextResponse.json({ category })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("PATCH /api/bilans/categories error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** DELETE /api/bilans/categories — deletes a category */
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const cat = await prisma.bilanCategory.findUnique({ where: { id } })
    if (!cat) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Remove category from modules
    const affectedMods = await prisma.bilanModule.findMany({
      where: { isActive: true },
      select: { id: true, categories: true },
    })
    await Promise.all(
      affectedMods
        .filter((m) => Array.isArray(m.categories) && (m.categories as string[]).includes(cat.name))
        .map((m) => {
          const cats = (m.categories as string[]).filter((c) => c !== cat.name)
          return prisma.bilanModule.update({
            where: { id: m.id },
            data: { categories: cats },
          })
        })
    )

    // Delete the category
    await prisma.bilanCategory.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("DELETE /api/bilans/categories error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}