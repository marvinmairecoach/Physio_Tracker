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

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Récupérer les joueurs actifs de l'équipe avec leur poste
    const teamMembers = await prisma.athleteTeam.findMany({
      where: { teamId: id, isActive: true },
      include: {
        athlete: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (teamMembers.length === 0) {
      return NextResponse.json({ testTypes: [], players: [] });
    }

    // Récupérer tous les types de test
    const testTypes = await prisma.testType.findMany({
      orderBy: { name: "asc" },
    });

    // Pour chaque type de test, calculer la moyenne d'équipe
    const testTypeAverages: Record<string, { average: number; higherIsBetter: boolean; unit: string }> = {};

    for (const tt of testTypes) {
      const valuesPromises = teamMembers.map((m) =>
        prisma.testResult.findFirst({
          where: { athleteId: m.athlete.id, testTypeId: tt.id },
          orderBy: { date: "desc" },
          select: { value: true },
        })
      );
      const values = (await Promise.all(valuesPromises))
        .map((r) => (r ? Number(r.value) : null))
        .filter((v): v is number => v !== null);

      testTypeAverages[tt.id] = {
        average: values.length > 0
          ? values.reduce((s, v) => s + v, 0) / values.length
          : 0,
        higherIsBetter: tt.higherIsBetter,
        unit: tt.unit,
      };
    }

    // Pour chaque joueur, récupérer son dernier résultat à chaque test
    const players = await Promise.all(
      teamMembers.map(async (m) => {
        const results: Record<string, number | null> = {};

        for (const tt of testTypes) {
          const latest = await prisma.testResult.findFirst({
            where: { athleteId: m.athlete.id, testTypeId: tt.id },
            orderBy: { date: "desc" },
            select: { value: true },
          });
          results[tt.id] = latest ? Number(latest.value) : null;
        }

        return {
          id: m.athlete.id,
          firstName: m.athlete.firstName,
          lastName: m.athlete.lastName,
          position: m.position,
          results,
        };
      })
    );

    return NextResponse.json({
      testTypes: testTypes.map((tt) => ({
        id: tt.id,
        name: tt.name,
        unit: tt.unit,
        higherIsBetter: tt.higherIsBetter,
        teamAverage: testTypeAverages[tt.id].average,
        normMale: tt.normMale ? Number(tt.normMale) : null,
        normFemale: tt.normFemale ? Number(tt.normFemale) : null,
      })),
      players,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/teams/[id]/player-results error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}