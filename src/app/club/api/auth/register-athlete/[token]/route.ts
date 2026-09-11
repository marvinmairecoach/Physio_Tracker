import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const invitation = await prisma.athleteUserInvitation.findUnique({
      where: { token },
      include: {
        athlete: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Lien d'invitation invalide" },
        { status: 404 }
      );
    }

    if (invitation.used) {
      return NextResponse.json(
        { error: "Cette invitation a déjà été utilisée" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      firstName: invitation.athlete.firstName,
      lastName: invitation.athlete.lastName,
      token: invitation.token,
    });
  } catch (error) {
    console.error("GET /api/auth/register-athlete/[token] error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }

    // Validate the invitation token
    const invitation = await prisma.athleteUserInvitation.findUnique({
      where: { token },
      include: {
        athlete: {
          select: { id: true, firstName: true, lastName: true, userId: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Lien d'invitation invalide" },
        { status: 404 }
      );
    }

    if (invitation.used) {
      return NextResponse.json(
        { error: "Cette invitation a déjà été utilisée" },
        { status: 410 }
      );
    }

    // Check if athlete already has a user
    if (invitation.athlete.userId) {
      return NextResponse.json(
        { error: "Cet athlète est déjà lié à un compte utilisateur" },
        { status: 409 }
      );
    }

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create the user account and link athlete in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: invitation.athlete.firstName,
          lastName: invitation.athlete.lastName,
          role: "athlete",
        },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
        },
      });

      // Link athlete to user
      await tx.athlete.update({
        where: { id: invitation.athlete.id },
        data: { userId: user.id },
      });

      // Mark invitation as used
      await tx.athleteUserInvitation.update({
        where: { id: invitation.id },
        data: { used: true },
      });

      return user;
    });

    return NextResponse.json(
      {
        message: "Compte créé avec succès",
        user: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/register-athlete/[token] error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}