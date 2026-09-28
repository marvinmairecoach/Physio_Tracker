import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-physio"
import { physioPrisma } from "@/lib/prisma-physio"

const userSelect = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  profession: true,
  address: true,
  logoUrl: true,
} as const

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await physioPrisma.user.findUnique({
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
    const { email, phone, profession, address, logoUrl } = body

    // Vérifier que l'email n'est pas déjà pris par un autre utilisateur
    if (email) {
      const existing = await physioPrisma.user.findUnique({ where: { email } })
      if (existing && existing.id !== session.userId) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 })
      }
    }

    const user = await physioPrisma.user.update({
      where: { id: session.userId },
      data: {
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(profession !== undefined && { profession }),
        ...(address !== undefined && { address }),
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