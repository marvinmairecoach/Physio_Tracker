import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-shared"
import { clubPrisma } from "@/lib/prisma-club"

const CLUB_SESSION_COOKIE = "pp_club_session"

const userSelect = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  logoUrl: true,
  roleAssignments: {
    include: {
      role: {
        select: { id: true, name: true },
      },
    },
  },
} as const

export async function GET() {
  try {
    const session = await getAuthSession(CLUB_SESSION_COOKIE)
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await clubPrisma.user.findUnique({
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
    const session = await getAuthSession(CLUB_SESSION_COOKIE)
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { email, phone, logoUrl } = body

    // Vérifier que l'email n'est pas déjà pris par un autre utilisateur
    if (email) {
      const existing = await clubPrisma.user.findUnique({ where: { email } })
      if (existing && existing.id !== session.userId) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 })
      }
    }

    const user = await clubPrisma.user.update({
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