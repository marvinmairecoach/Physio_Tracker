import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/sessions/[id]/athletes — list all athletes assigned to this session
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { id } = params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            team: {
              include: {
                athletes: {
                  where: { isActive: true },
                  include: {
                    athlete: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        gender: true,
                      },
                    },
                  },
                },
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
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session introuvable" },
        { status: 404 }
      );
    }

    // Collect unique athletes from team assignments + direct assignments
    const athleteMap = new Map<
      string,
      { id: string; firstName: string; lastName: string; gender: string | null }
    >();

    for (const a of session.assignments) {
      if (a.team) {
        for (const at of a.team.athletes) {
          if (!athleteMap.has(at.athlete.id)) {
            athleteMap.set(at.athlete.id, at.athlete);
          }
        }
      }
      if (a.athlete) {
        if (!athleteMap.has(a.athlete.id)) {
          athleteMap.set(a.athlete.id, a.athlete);
        }
      }
    }

    const athletes = Array.from(athleteMap.values()).sort((a, b) =>
      a.firstName.localeCompare(b.firstName, "fr")
    );

    return NextResponse.json(athletes);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/sessions/[id]/athletes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}