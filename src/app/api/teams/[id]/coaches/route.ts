import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { id } = params;

    const coaches = await prisma.teamCoach.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json(coaches.map((tc) => tc.user));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/teams/[id]/coaches error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Vérifier que l'utilisateur existe et a le rôle coach ou admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== "coach" && user.role !== "admin")) {
      return NextResponse.json({ error: "Utilisateur invalide. Seuls les coachs et admins peuvent être rattachés." }, { status: 400 });
    }

    // Vérifier s'il est déjà rattaché
    const existing = await prisma.teamCoach.findUnique({
      where: { teamId_userId: { teamId: id, userId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Ce coach est déjà rattaché à cette équipe" }, { status: 409 });
    }

    const coach = await prisma.teamCoach.create({
      data: { teamId: id, userId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json(coach.user, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Ce coach est déjà rattaché à cette équipe" }, { status: 409 });
    }
    console.error("POST /api/teams/[id]/coaches error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    await prisma.teamCoach.delete({
      where: { teamId_userId: { teamId: id, userId } },
    });

    return NextResponse.json({ message: "Coach retiré de l'équipe" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/teams/[id]/coaches error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}