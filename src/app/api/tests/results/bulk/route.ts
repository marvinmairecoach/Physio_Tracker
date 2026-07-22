import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { results, date } = body;

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: "results must be a non-empty array" },
        { status: 400 }
      );
    }

    if (results.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 résultats par envoi" },
        { status: 400 }
      );
    }

    // Valider chaque résultat
    for (const r of results) {
      if (!r.athleteId || !r.testTypeId || r.value === undefined || r.value === null) {
        return NextResponse.json(
          { error: "Chaque résultat doit avoir athleteId, testTypeId et value" },
          { status: 400 }
        );
      }
    }

    // Vérifier que tous les athlètes existent
    const athleteIds = [...new Set(results.map((r) => r.athleteId))];
    const athletes = await prisma.athlete.findMany({
      where: { id: { in: athleteIds } },
      select: { id: true },
    });
    if (athletes.length !== athleteIds.length) {
      return NextResponse.json(
        { error: "Un ou plusieurs athlètes introuvables" },
        { status: 404 }
      );
    }

    // Vérifier que tous les types de test existent
    const testTypeIds = [...new Set(results.map((r) => r.testTypeId))];
    const testTypes = await prisma.testType.findMany({
      where: { id: { in: testTypeIds } },
      select: { id: true },
    });
    if (testTypes.length !== testTypeIds.length) {
      return NextResponse.json(
        { error: "Un ou plusieurs types de test introuvables" },
        { status: 404 }
      );
    }

    // Créer tous les résultats
    const recordDate = date ? new Date(date) : new Date();
    const created = await prisma.$transaction(
      results.map((r) =>
        prisma.testResult.create({
          data: {
            athleteId: r.athleteId,
            testTypeId: r.testTypeId,
            value: parseFloat(r.value),
            date: recordDate,
            notes: r.notes || null,
            recordedById: session.userId,
          },
          include: {
            athlete: {
              select: { id: true, firstName: true, lastName: true },
            },
            testType: {
              select: { id: true, name: true, unit: true },
            },
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      count: created.length,
      results: created.map((r) => ({
        ...r,
        value: Number(r.value),
      })),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/tests/results/bulk error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}