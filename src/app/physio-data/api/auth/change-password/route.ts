import { NextRequest, NextResponse } from "next/server"
import { getSession, hashPassword, verifyPassword } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Mot de passe actuel et nouveau mot de passe requis" },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Le nouveau mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: "Mot de passe actuel incorrect" },
        { status: 403 }
      )
    }

    const newHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: newHash },
    })

    return NextResponse.json({ message: "Mot de passe modifié avec succès" })
  } catch (error) {
    console.error("POST /api/auth/change-password error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}