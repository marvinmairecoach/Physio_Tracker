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

    // Fetch all test types
    const allTestTypes = await prisma.testType.findMany({
      orderBy: { name: "asc" },
    });

    // Fetch the team's visibility settings
    const teamVisibilities = await prisma.teamTestType.findMany({
      where: { teamId: id },
    });

    const visibilityMap = new Map(
      teamVisibilities.map((tv) => [tv.testTypeId, tv.visible])
    );

    const testTypes = allTestTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      category: tt.category,
      unit: tt.unit,
      higherIsBetter: tt.higherIsBetter,
      description: tt.description,
      normMale: tt.normMale ? Number(tt.normMale) : null,
      normFemale: tt.normFemale ? Number(tt.normFemale) : null,
      isSystem: tt.isSystem,
      isUnilateral: tt.isUnilateral,
      isCalculated: tt.isCalculated,
      visible: visibilityMap.has(tt.id) ? visibilityMap.get(tt.id)! : true,
    }));

    return NextResponse.json({ testTypes });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/teams/[id]/test-types error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { testTypeIds } = body as { testTypeIds: string[] };

    if (!Array.isArray(testTypeIds)) {
      return NextResponse.json(
        { error: "testTypeIds must be an array" },
        { status: 400 }
      );
    }

    // Verify the team exists
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Use a transaction to replace all visibility records
    await prisma.$transaction(async (tx) => {
      // Delete all existing TeamTestType records for this team
      await tx.teamTestType.deleteMany({
        where: { teamId: id },
      });

      // Create new records for the selected test types
      if (testTypeIds.length > 0) {
        await tx.teamTestType.createMany({
          data: testTypeIds.map((testTypeId) => ({
            teamId: id,
            testTypeId,
            visible: true,
          })),
        });
      }
    });

    return NextResponse.json({ message: "Visibilité mise à jour avec succès" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PUT /api/teams/[id]/test-types error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}