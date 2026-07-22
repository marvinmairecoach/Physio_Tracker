import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    await requireAuth();

    // Active injuries = no recovery date yet
    const injuries = await prisma.injury.findMany({
      where: { recoveryDate: null },
      include: {
        athleteTeam: {
          select: {
            team: { select: { id: true, name: true } },
          },
        },
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
          },
        },
      },
      orderBy: [
        { injuryDate: "desc" },
      ],
    });

    return NextResponse.json({ injured: injuries });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/athletes/injured error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin" && session.role !== "coach") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, injury, injuryDate, injuryNotes, recoveryDate } = body;

    if (!memberId) {
      return NextResponse.json({ error: "memberId requis" }, { status: 400 });
    }

    // Update the Injury record
    const updateData: Record<string, unknown> = {};
    if (injury !== undefined) updateData.injury = injury;
    if (injuryDate !== undefined) {
      updateData.injuryDate = injuryDate ? new Date(injuryDate) : null;
    }
    if (injuryNotes !== undefined) updateData.injuryNotes = injuryNotes;
    if (recoveryDate !== undefined) {
      updateData.recoveryDate = recoveryDate ? new Date(recoveryDate) : null;
    }

    const existing = await prisma.injury.findUnique({
      where: { id: memberId },
      include: {
        athleteTeam: true,
        athlete: { select: { id: true, firstName: true, lastName: true, gender: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Blessure introuvable" }, { status: 404 });
    }

    const updated = await prisma.injury.update({
      where: { id: memberId },
      data: updateData,
      include: {
        athleteTeam: {
          select: { team: { select: { id: true, name: true } } },
        },
        athlete: {
          select: { id: true, firstName: true, lastName: true, gender: true },
        },
      },
    });

    // If this is a recovery, also update the athleteTeam status
    if (recoveryDate) {
      await prisma.athleteTeam.update({
        where: { id: existing.athleteTeamId },
        data: {
          status: "actif",
          isActive: true,
        },
      });
    }

    return NextResponse.json({ injured: [updated] });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/athletes/injured error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}