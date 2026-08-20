import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/athletes/[id]/sessions — list all sessions for an athlete (upcoming + recent)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { id } = params;

    // Find team IDs this athlete belongs to
    const teams = await prisma.athleteTeam.findMany({
      where: { athleteId: id, isActive: true },
      select: { teamId: true },
    });
    const teamIds = teams.map((t) => t.teamId);

    // Find sessions assigned to those teams or directly to the athlete
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { assignments: { some: { athleteId: id } } },
          ...(teamIds.length > 0
            ? [
                {
                  assignments: {
                    some: { teamId: { in: teamIds } },
                  },
                } as const,
              ]
            : []),
        ],
      },
      include: {
        team: { select: { id: true, name: true } },
        _count: {
          select: {
            invitations: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: 20,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/athletes/[id]/sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}