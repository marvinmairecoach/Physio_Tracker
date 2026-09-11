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

    const injuries = await prisma.injury.findMany({
      where: { athleteId: id },
      include: {
        athleteTeam: {
          select: {
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { injuryDate: "desc" },
    });

    return NextResponse.json({ injuries });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/athletes/[id]/injuries error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin" && session.role !== "coach") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { athleteTeamId, injury, injuryDate, injuryNotes } = body;

    if (!athleteTeamId || !injury || !injuryDate) {
      return NextResponse.json(
        { error: "athleteTeamId, injury et injuryDate requis" },
        { status: 400 }
      );
    }

    const result = await prisma.injury.create({
      data: {
        athleteTeamId,
        athleteId: id,
        injury,
        injuryDate: new Date(injuryDate),
        injuryNotes: injuryNotes || null,
      },
      include: {
        athleteTeam: {
          select: {
            team: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ injury: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/athletes/[id]/injuries error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}