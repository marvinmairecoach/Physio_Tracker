import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const teamId = searchParams.get("teamId");

    const where: Record<string, unknown> = {};

    // Non-admin users can only see sessions for their teams
    if (session.role !== "admin") {
      const userTeams = await prisma.team.findMany({
        where: {
          OR: [
            { coaches: { some: { userId: session.userId } } },
            { athletes: { some: { athlete: { createdById: session.userId } } } },
          ],
        },
        select: { id: true },
      });
      const userTeamIds = userTeams.map((t) => t.id);
      where.teamId = { in: userTeamIds };
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.date = dateFilter;
    }

    if (teamId) {
      const teamAthletes = await prisma.athleteTeam.findMany({
        where: { teamId, isActive: true },
        select: { athleteId: true },
      });
      where.assignments = {
        some: {
          OR: [
            { athleteId: { in: teamAthletes.map((a) => a.athleteId) } },
            { teamId },
          ],
        },
      };
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        team: { select: { id: true, name: true } },
        assignments: {
          include: {
            team: true,
            athlete: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        creator: { select: { id: true, firstName: true, lastName: true } },
        exercises: {
          include: { exercise: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/sessions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const {
      title,
      description,
      type,
      date,
      startTime,
      endTime,
      location,
      status,
      teamId,           // Lien direct à une équipe
      teamIds,          // Assignations (ancien format)
      athleteIds,
      assignTo,         // Assignations (nouveau format)
      isRecurring,
      recurrenceRule,
      recurrenceEnd,
      exerciseIds,
    } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: "title and date are required" },
        { status: 400 }
      );
    }

    // Construire les assignations
    let createAssignments: { teamId?: string; athleteId?: string }[] = [];

    if (assignTo) {
      createAssignments = assignTo.map(
        (a: { type: "team" | "athlete"; id: string }) => ({
          ...(a.type === "team" ? { teamId: a.id } : { athleteId: a.id }),
        })
      );
    } else {
      if (teamIds?.length) {
        createAssignments.push(...teamIds.map((id: string) => ({ teamId: id })));
      }
      if (athleteIds?.length) {
        createAssignments.push(...athleteIds.map((id: string) => ({ athleteId: id })));
      }
    }

    const newSession = await prisma.session.create({
      data: {
        title,
        description: description || "",
        type: type || "TRAINING",
        date: new Date(date),
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        location,
        status: status || "draft",
        teamId: teamId || null,
        createdById: session.userId,
        isRecurring: isRecurring ?? undefined,
        recurrenceRule: recurrenceRule ?? undefined,
        recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : undefined,
        assignments: createAssignments.length > 0
          ? { create: createAssignments }
          : undefined,
        exercises: exerciseIds?.length
          ? {
              create: exerciseIds.map((exId: string) => ({
                exerciseId: exId,
              })),
            }
          : undefined,
      },
      include: {
        team: { select: { id: true, name: true } },
        assignments: {
          include: {
            team: true,
            athlete: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        exercises: {
          include: { exercise: true },
        },
      },
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/sessions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}