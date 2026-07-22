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

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const athletes = await prisma.athleteTeam.findMany({
      where: {
        teamId: id,
      },
      include: {
        athlete: true,
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          athlete: {
            lastName: "asc",
          },
        },
      ],
    });

    return NextResponse.json(athletes);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/teams/[id]/athletes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const { id } = params;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const body = await request.json();
    const { athleteId, athleteIds, userId, position } = body;

    // Support auto-creating athlete from a user (coach/admin)
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
      }

      // Create athlete record from user
      const athlete = await prisma.athlete.create({
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || null,
          isActive: true,
          createdById: user.id,
        },
      });

      const assignment = await prisma.athleteTeam.create({
        data: {
          athleteId: athlete.id,
          teamId: id,
          ...(position ? { position } : { position: undefined }),
        },
        include: { athlete: true },
      });

      return NextResponse.json([assignment], { status: 201 });
    }

    // Support both single athlete and bulk
    const ids = athleteId ? [athleteId] : athleteIds;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "athleteId or athleteIds required" },
        { status: 400 }
      );
    }

    const assignments = await Promise.all(
      ids.map((aid: string) =>
        prisma.athleteTeam.create({
          data: {
            athleteId: aid,
            teamId: id,
            ...(position ? { position } : { position: undefined }),
          },
          include: { athlete: true },
        })
      )
    );

    return NextResponse.json(assignments, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/teams/[id]/athletes error:", error);
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
    await requireAuth();

    const { id } = params;

    const body = await request.json();
    const { memberId, status, position, injury, injuryDate, injuryNotes } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId requis" },
        { status: 400 }
      );
    }

    const existing = await prisma.athleteTeam.findFirst({
      where: { id: memberId, teamId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Membre introuvable dans cette équipe" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      const validStatuses = ["actif", "blessé", "inactif"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Statut invalide. Valeurs acceptées: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.status = status;
      updateData.isActive = status !== "inactif";

      // Create injury record when marking as injured
      if (status === "blessé" && existing.status !== "blessé") {
        await prisma.injury.create({
          data: {
            athleteTeamId: memberId,
            athleteId: existing.athleteId,
            injury: injury || existing.injury || "Blessure",
            injuryDate: injuryDate ? new Date(injuryDate) : new Date(),
            injuryNotes: injuryNotes || existing.injuryNotes || null,
          },
        });
      }
      // Close injury when marking as healed (actif)
      if (status === "actif" && existing.status === "blessé") {
        await prisma.injury.updateMany({
          where: {
            athleteTeamId: memberId,
            recoveryDate: null,
          },
          data: {
            recoveryDate: new Date(),
          },
        });
      }
    }
    if (position !== undefined) {
      updateData.position = position;
    }
    if (injury !== undefined) {
      updateData.injury = injury;
    }
    if (injuryDate !== undefined) {
      updateData.injuryDate = injuryDate ? new Date(injuryDate) : null;
    }
    if (injuryNotes !== undefined) {
      updateData.injuryNotes = injuryNotes;
    }

    const updated = await prisma.athleteTeam.update({
      where: { id: memberId },
      data: updateData,
      include: { athlete: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/teams/[id]/athletes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}