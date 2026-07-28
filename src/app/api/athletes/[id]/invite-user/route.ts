import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Seul un administrateur peut inviter un athlète" },
        { status: 403 }
      );
    }

    const { id } = params;

    const athlete = await prisma.athlete.findUnique({ where: { id } });
    if (!athlete) {
      return NextResponse.json(
        { error: "Athlète non trouvé" },
        { status: 404 }
      );
    }

    // Check if athlete already has a user account linked
    if (athlete.userId) {
      return NextResponse.json(
        { error: "Cet athlète est déjà lié à un compte utilisateur" },
        { status: 409 }
      );
    }

    // Check if an invitation already exists
    const existingInvite = await prisma.athleteUserInvitation.findUnique({
      where: { athleteId: id },
    });

    if (existingInvite) {
      // Return the existing invitation URL
      const baseUrl = request.headers.get("host")
        ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}`
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const invitationUrl = `${baseUrl}/register-athlete/${existingInvite.token}`;

      return NextResponse.json({
        message: "Une invitation existe déjà pour cet athlète",
        invitationUrl,
        token: existingInvite.token,
        used: existingInvite.used,
        createdAt: existingInvite.createdAt,
      });
    }

    // Generate a new invitation
    const token = crypto.randomUUID();

    const invitation = await prisma.athleteUserInvitation.create({
      data: {
        athleteId: id,
        token,
      },
    });

    const baseUrl = request.headers.get("host")
      ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}`
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const invitationUrl = `${baseUrl}/register-athlete/${invitation.token}`;

    return NextResponse.json(
      {
        message: "Invitation créée avec succès",
        invitationUrl,
        token: invitation.token,
        createdAt: invitation.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/athletes/[id]/invite-user error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}