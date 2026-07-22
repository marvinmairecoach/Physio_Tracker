import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { teamId, athleteIds } = body as {
      teamId: string;
      athleteIds: string[];
    };

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 }
      );
    }

    if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return NextResponse.json(
        { error: "athleteIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Create AthleteTeam records for each athlete (skip if already exists)
    const results = [];

    for (const athleteId of athleteIds) {
      // Check if athlete exists
      const athlete = await prisma.athlete.findUnique({
        where: { id: athleteId },
      });
      if (!athlete) {
        results.push({
          athleteId,
          status: "skipped",
          reason: "Athlete not found",
        });
        continue;
      }

      // Check if active assignment already exists
      const existing = await prisma.athleteTeam.findFirst({
        where: {
          athleteId,
          teamId,
          isActive: true,
        },
      });

      if (existing) {
        results.push({
          athleteId,
          status: "skipped",
          reason: "Already assigned to this team",
        });
        continue;
      }

      const assignment = await prisma.athleteTeam.create({
        data: {
          athleteId,
          teamId,
        },
        include: { athlete: true },
      });

      results.push({
        athleteId,
        status: "assigned",
        assignment,
      });
    }

    return NextResponse.json({ results }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/teams/athletes/bulk error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}