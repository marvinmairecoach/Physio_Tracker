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

    const athlete = await prisma.athlete.findUnique({ where: { id } });
    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    const invitations = await prisma.sessionInvitation.findMany({
      where: { athleteId: id },
      include: {
        session: {
          select: { type: true },
        },
      },
    });

    // Stats globales
    const total = invitations.length;
    const present = invitations.filter((i) => i.availability === "PRESENT").length;
    const absent = invitations.filter((i) => i.availability === "ABSENT").length;
    const maybe = invitations.filter((i) => i.availability === "MAYBE").length;
    const pending = invitations.filter(
      (i) => i.sentAt !== null && i.respondedAt === null && i.availability === null
    ).length;
    const responded = present + absent + maybe;
    const rate = responded > 0 ? Math.round((present / responded) * 100) : 0;

    // Stats par type d'entraînement
    const training = invitations.filter((i) => i.session.type === "TRAINING");
    const match = invitations.filter((i) => i.session.type === "MATCH");

    const calcStats = (items: typeof invitations) => {
      const t = items.length;
      const p = items.filter((i) => i.availability === "PRESENT").length;
      const a = items.filter((i) => i.availability === "ABSENT").length;
      const m = items.filter((i) => i.availability === "MAYBE").length;
      const r = p + a + m;
      return {
        total: t,
        present: p,
        absent: a,
        maybe: m,
        rate: r > 0 ? Math.round((p / r) * 100) : 0,
      };
    };

    return NextResponse.json({
      total,
      present,
      absent,
      maybe,
      pending,
      rate,
      training: calcStats(training),
      match: calcStats(match),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/athletes/[id]/invitations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}