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

    // Get the athlete with active teams
    const athlete = await prisma.athlete.findUnique({
      where: { id },
      include: {
        teams: {
          where: { isActive: true },
          include: { team: true },
        },
      },
    });

    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    if (athlete.teams.length === 0) {
      // No team — return individual results without team comparison
      const allTestTypes = await prisma.testType.findMany({ orderBy: { name: "asc" } });
      const comparisons = [];
      for (const testType of allTestTypes) {
        const athleteLatest = await prisma.testResult.findFirst({
          where: { athleteId: id, testTypeId: testType.id },
          orderBy: { date: "desc" },
        });
        comparisons.push({
          testType: { name: testType.name, unit: testType.unit, higherIsBetter: testType.higherIsBetter, normMale: testType.normMale, normFemale: testType.normFemale },
          testTypeId: testType.id,
          athleteLatestValue: athleteLatest ? Number(athleteLatest.value) : null,
          teamAverage: null,
          teamValues: [],
          teamSize: 1,
        });
      }
      return NextResponse.json({ comparisons, teamSize: 1 });
    }

    // Get all team IDs for this athlete
    const teamIds = athlete.teams.map((at) => at.teamId);

    // Get all active athletes in the same teams (excluding this athlete)
    const teamAthletes = await prisma.athleteTeam.findMany({
      where: {
        teamId: { in: teamIds },
        isActive: true,
        athleteId: { not: id },
      },
      include: {
        athlete: true,
      },
    });

    // Get all test types
    const testTypes = await prisma.testType.findMany();

    // Build the comparison data for each test type
    const comparisons = [];

    for (const testType of testTypes) {
      // Get athlete's latest result for this test type
      const athleteLatest = await prisma.testResult.findFirst({
        where: { athleteId: id, testTypeId: testType.id },
        orderBy: { date: "desc" },
      });

      // Get each team athlete's latest result for this test type
      const teamValuesPromises = teamAthletes.map(async (ta) => {
        const latestResult = await prisma.testResult.findFirst({
          where: {
            athleteId: ta.athleteId,
            testTypeId: testType.id,
          },
          orderBy: { date: "desc" },
        });
        return {
          athleteId: ta.athleteId,
          firstName: ta.athlete.firstName,
          lastName: ta.athlete.lastName,
          value: latestResult ? Number(latestResult.value) : null,
        };
      });

      const teamValues = await Promise.all(teamValuesPromises);

      // Calculate team average (only considering athletes who have a value)
      const validValues = teamValues.filter(
        (tv) => tv.value !== null
      ) as { athleteId: string; firstName: string; lastName: string; value: number }[];
      const teamAverage =
        validValues.length > 0
          ? validValues.reduce((sum, tv) => sum + tv.value, 0) /
            validValues.length
          : null;

      comparisons.push({
        testType: {
          name: testType.name,
          unit: testType.unit,
          higherIsBetter: testType.higherIsBetter,
          normMale: testType.normMale ? Number(testType.normMale) : null,
          normFemale: testType.normFemale ? Number(testType.normFemale) : null,
        },
        testTypeId: testType.id,
        athleteLatestValue: athleteLatest ? Number(athleteLatest.value) : null,
        teamAverage,
        teamValues: teamValues.map((tv) => ({
          ...tv,
          value: tv.value !== null ? tv.value : null,
        })),
        teamSize: teamAthletes.length + 1,
      });
    }

    return NextResponse.json({ comparisons, teamSize: teamAthletes.length + 1 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/athletes/[id]/team-comparison error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}