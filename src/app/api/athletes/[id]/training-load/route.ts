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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const loads = await prisma.trainingLoad.findMany({
      where: {
        athleteId: id,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "desc" },
      select: {
        date: true,
        rpe: true,
        durationMin: true,
        load: true,
        sessionType: true,
      },
    });

    return NextResponse.json({
      loads: loads.map((l) => ({
        date: l.date,
        rpe: l.rpe,
        durationMin: l.durationMin,
        load: l.load ? Number(l.load) : l.rpe * l.durationMin,
        sessionType: l.sessionType,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/athletes/[id]/training-load error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}