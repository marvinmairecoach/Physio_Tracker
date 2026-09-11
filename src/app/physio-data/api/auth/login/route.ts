import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { physioPrisma } from "@/lib/prisma-physio"
import { createToken } from "@/lib/auth-shared"

const PHYSIO_SESSION_COOKIE = "pp_physio_session"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      )
    }

    const user = await physioPrisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Compte désactivé. Contactez l'administrateur." },
        { status: 403 }
      )
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash)
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 }
      )
    }

    const token = await createToken(
      {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      PHYSIO_SESSION_COOKIE
    )

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("PhysioData login error:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    )
  }
}