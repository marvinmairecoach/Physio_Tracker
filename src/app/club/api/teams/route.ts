import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();

    const teams = await prisma.team.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            athletes: {
              where: { isActive: true },
            },
          },
        },
        coaches: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    // Pour chaque équipe, compter actif/blessé/inactif
    const result = await Promise.all(
      teams.map(async (team) => {
        const statusCounts = await prisma.athleteTeam.groupBy({
          by: ["status"],
          where: { teamId: team.id },
          _count: true,
        });

        const actif = statusCounts.find((s) => s.status === "actif")?._count ?? 0;
        const blesse = statusCounts.find((s) => s.status === "blessé")?._count ?? 0;
        const inactif = statusCounts.find((s) => s.status === "inactif")?._count ?? 0;

        return {
          ...team,
          athleteCount: team._count.athletes,
          _count: undefined,
          actifCount: actif,
          blesseCount: blesse,
          inactifCount: inactif,
          coaches: team.coaches.map((tc) => tc.user),
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/teams error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { name, sport, gender, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const team = await prisma.team.create({
      data: {
        name,
        sport,
        gender: gender || null,
        notes,
        createdById: session.userId,
      },
      include: {
        _count: {
          select: {
            athletes: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    const result = {
      ...team,
      athleteCount: team._count.athletes,
      _count: undefined,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/teams error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}