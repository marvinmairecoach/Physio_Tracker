import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const testTypeId = searchParams.get("testTypeId");

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Get all active athletes in this team
    const teamAthletes = await prisma.athleteTeam.findMany({
      where: {
        teamId: id,
        isActive: true,
      },
      include: {
        athlete: true,
      },
    });

    if (teamAthletes.length === 0) {
      return NextResponse.json({ averages: [] });
    }

    const athleteIds = teamAthletes.map((ta) => ta.athleteId);

    // Get test types to average
    const whereTestType: Record<string, unknown> = {};
    if (testTypeId) {
      whereTestType.id = testTypeId;
    }
    const testTypes = await prisma.testType.findMany({
      where: whereTestType,
    });

    // For each test type, get each athlete's latest result and average them
    const averages = [];

    for (const testType of testTypes) {
      const valuesPromises = athleteIds.map(async (athleteId) => {
        const latestResult = await prisma.testResult.findFirst({
          where: {
            athleteId,
            testTypeId: testType.id,
          },
          orderBy: { date: "desc" },
          select: { value: true },
        });
        return latestResult ? Number(latestResult.value) : null;
      });

      const values = await Promise.all(valuesPromises);
      const validValues = values.filter(
        (v): v is number => v !== null
      );

      const average =
        validValues.length > 0
          ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length
          : null;

      averages.push({
        testTypeId: testType.id,
        testTypeName: testType.name,
        unit: testType.unit,
        higherIsBetter: testType.higherIsBetter,
        average,
        athleteCount: validValues.length,
        totalAthletes: athleteIds.length,
      });
    }

    return NextResponse.json({ averages });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/teams/[id]/averages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}