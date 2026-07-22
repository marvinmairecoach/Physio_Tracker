import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const userSelect = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  logoUrl: true,
} as const

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: userSelect,
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Me error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { email, phone, logoUrl } = body

    // Vérifier que l'email n'est pas déjà pris par un autre utilisateur
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing && existing.id !== session.userId) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 })
      }
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(logoUrl !== undefined && { logoUrl }),
      },
      select: userSelect,
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("PATCH /api/auth/me error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}