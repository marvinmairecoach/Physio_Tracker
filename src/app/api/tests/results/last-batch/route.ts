import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { testTypeId, athleteIds } = body;

    if (!testTypeId || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return NextResponse.json(
        { error: "testTypeId et athleteIds requis" },
        { status: 400 }
      );
    }

    // Pour chaque athlète, récupérer la dernière valeur pour ce test
    const results = await Promise.all(
      athleteIds.map(async (athleteId: string) => {
        const lastResult = await prisma.testResult.findFirst({
          where: { athleteId, testTypeId },
          orderBy: { date: "desc" },
          select: {
            value: true,
            date: true,
          },
        });

        return {
          athleteId,
          value: lastResult ? Number(lastResult.value) : null,
          date: lastResult ? lastResult.date.toISOString() : null,
        };
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/tests/results/last-batch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}