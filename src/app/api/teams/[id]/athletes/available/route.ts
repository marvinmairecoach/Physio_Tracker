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

    // Vérifier que l'équipe existe
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Récupérer les IDs déjà dans l'équipe
    const existingMemberIds = await prisma.athleteTeam.findMany({
      where: { teamId: id },
      select: { athleteId: true },
    });
    const existingAthleteIds = new Set(existingMemberIds.map((m) => m.athleteId));

    // 1. Athlètes disponibles (pas déjà dans l'équipe)
    const athletes = await prisma.athlete.findMany({
      where: {
        isActive: true,
        id: { notIn: Array.from(existingAthleteIds) },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const athleteItems = athletes.map((a) => ({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      type: "athlete" as const,
      userId: null as string | null,
    }));

    // 2. Utilisateurs coachs/admins pas encore dans l'équipe comme joueurs
    // et qui n'ont pas déjà un profil Athlete
    const existingAthleteUserIds = await prisma.athlete.findMany({
      select: { id: true },
    });
    const athleteIdSet = new Set(existingAthleteUserIds.map((a) => a.id));

    // On cherche les users coach/admin qui n'ont PAS encore de profil Athlete
    // (ceux qui en ont un seront déjà dans la liste athletes)
    const users = await prisma.user.findMany({
      where: {
        role: { in: ["coach", "admin"] },
        isActive: true,
        id: { notIn: Array.from(athleteIdSet) },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const userItems = users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      type: "user" as const,
      userId: u.id,
    }));

    // Fusionner et retourner
    const allAvailable = [...athleteItems, ...userItems];

    return NextResponse.json(allAvailable);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/teams/[id]/athletes/available error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}