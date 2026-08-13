import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope"); // "athlete" | "team"
    const id = searchParams.get("id");
    const month = searchParams.get("month"); // "YYYY-MM"

    if (!scope || !id || !month) {
      return NextResponse.json(
        { error: "scope, id and month query params are required" },
        { status: 400 }
      );
    }

    if (scope !== "athlete" && scope !== "team") {
      return NextResponse.json(
        { error: 'scope must be "athlete" or "team"' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'month must be formatted as "YYYY-MM"' },
        { status: 400 }
      );
    }

    const [year, monthIndexRaw] = month.split("-").map(Number);
    const monthIndex = monthIndexRaw - 1;
    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59);

    let entries;

    if (scope === "athlete") {
      // Active teams of the athlete
      const athleteTeams = await prisma.athleteTeam.findMany({
        where: { athleteId: id, isActive: true },
        select: { teamId: true },
      });

      const athleteTeamIds = athleteTeams.map((at) => at.teamId);

      entries = await prisma.planningEntry.findMany({
        where: {
          date: { gte: startOfMonth, lte: endOfMonth },
          OR: [
            { athleteId: id },
            ...(athleteTeamIds.length > 0 ? [{ teamId: { in: athleteTeamIds } }] : []),
          ],
        },
        include: {
          team: { select: { id: true, name: true } },
        },
        orderBy: { date: "asc" },
      });
    } else {
      entries = await prisma.planningEntry.findMany({
        where: {
          teamId: id,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        include: {
          team: { select: { id: true, name: true } },
        },
        orderBy: { date: "asc" },
      });
    }

    // Map entries with origin field
    const mapped = entries.map((entry) => ({
      ...entry,
      origin: entry.athleteId ? "individuel" : "equipe",
      teamName: entry.team?.name ?? null,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/planning error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { title, date, type, athleteId, teamId, isObjective, notes } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: "title and date are required" },
        { status: 400 }
      );
    }

    // Exactly one of athleteId / teamId must be set
    if (!!athleteId === !!teamId) {
      return NextResponse.json(
        { error: "Exactly one of athleteId or teamId must be provided" },
        { status: 400 }
      );
    }

    const entry = await prisma.planningEntry.create({
      data: {
        title,
        date: new Date(date),
        type: type || "ENTRAINEMENT",
        athleteId: athleteId ?? null,
        teamId: teamId ?? null,
        isObjective: isObjective ?? false,
        notes: notes ?? null,
        createdById: session.userId,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/planning error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
