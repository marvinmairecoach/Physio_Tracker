import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword, createSession } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, password, role } = await request.json()

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: role || "coach",
      },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}