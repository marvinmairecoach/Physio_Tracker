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

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        athletes: {
          include: { athlete: true },
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

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Count statuses
    const statusCounts = await prisma.athleteTeam.groupBy({
      by: ["status"],
      where: { teamId: id },
      _count: true,
    });

    const actif = statusCounts.find((s) => s.status === "actif")?._count ?? 0;
    const blesse = statusCounts.find((s) => s.status === "blessé")?._count ?? 0;
    const inactif = statusCounts.find((s) => s.status === "inactif")?._count ?? 0;

    return NextResponse.json({
      ...team,
      coaches: team.coaches.map((tc) => tc.user),
      actifCount: actif,
      blesseCount: blesse,
      inactifCount: inactif,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/teams/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const { name, sport, gender, notes } = body;

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sport !== undefined && { sport }),
        ...(gender !== undefined && { gender }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        athletes: {
          include: { athlete: true },
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

    return NextResponse.json({
      ...team,
      coaches: team.coaches.map((tc) => tc.user),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/teams/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = params;

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    await prisma.team.delete({ where: { id } });

    return NextResponse.json({ message: "Team deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/teams/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}