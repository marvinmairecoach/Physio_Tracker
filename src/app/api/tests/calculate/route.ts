import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { evaluateFormula, FormulaInput } from "@/lib/formula";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { athleteId, testTypeId, date } = body;

    if (!athleteId || !testTypeId) {
      return NextResponse.json(
        { error: "athleteId and testTypeId are required" },
        { status: 400 }
      );
    }

    const typedAthleteId: string = athleteId;
    const typedTestTypeId: string = testTypeId;

    // 1. Get the test type definition
    const testType = await prisma.testType.findUnique({
      where: { id: typedTestTypeId },
    });
    if (!testType) {
      return NextResponse.json({ error: "Test type not found" }, { status: 404 });
    }
    if (!testType.isCalculated || !testType.formula) {
      return NextResponse.json(
        { error: "This test type is not a calculated test" },
        { status: 400 }
      );
    }

    // 2. Get the athlete
    const athlete = await prisma.athlete.findUnique({
      where: { id: typedAthleteId },
    });
    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
    }

    // 3. Parse formula inputs
    const inputs = (testType.formulaInputs as FormulaInput[] | null) ?? [];

    // 4. Build resolver: fetch latest result for each input test type
    async function getTestValue(testTypeId: string): Promise<number | null> {
      const result = await prisma.testResult.findFirst({
        where: { athleteId: typedAthleteId, testTypeId },
        orderBy: { date: "desc" },
      });
      if (!result) return null;
      return Number(result.value);
    }

    // 5. Build athlete context
    let age: number | null = null;
    if (athlete.birthDate) {
      const now = new Date();
      const birth = new Date(athlete.birthDate);
      age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
    }

    const ctx = {
      getTestValue,
      athlete: {
        age,
        poids: athlete.weightKg ? Number(athlete.weightKg) : null,
        taille: athlete.heightCm ? Number(athlete.heightCm) : null,
        genre: athlete.gender === "M" ? 1 : athlete.gender === "F" ? 0 : null,
      },
    };

    // 6. Evaluate
    const computed = await evaluateFormula(testType.formula, inputs, ctx);
    if (computed === null) {
      return NextResponse.json(
        {
          error:
            "Impossible de calculer : certaines données d'entrée sont manquantes. " +
            "Vérifiez que l'athlète a des résultats pour tous les types de test requis.",
        },
        { status: 400 }
      );
    }

    // 7. Save the result
    const result = await prisma.testResult.create({
      data: {
        athleteId: typedAthleteId,
        testTypeId: typedTestTypeId,
        value: computed,
        date: date ? new Date(date) : new Date(),
        notes: "Calculé automatiquement",
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
    });

    return NextResponse.json(
      {
        ...result,
        value: Number(result.value),
        computed,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/tests/calculate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET: Preview a calculated value without saving.
 * GET /api/tests/calculate?athleteId=X&testTypeId=Y
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId");
    const testTypeId = searchParams.get("testTypeId");

    if (!athleteId || !testTypeId) {
      return NextResponse.json(
        { error: "athleteId and testTypeId are required" },
        { status: 400 }
      );
    }

    const typedAthleteId: string = athleteId;
    const typedTestTypeId: string = testTypeId;

    // 1. Get the test type definition
    const testType = await prisma.testType.findUnique({
      where: { id: typedTestTypeId },
    });
    if (!testType) {
      return NextResponse.json({ error: "Test type not found" }, { status: 404 });
    }
    if (!testType.isCalculated || !testType.formula) {
      return NextResponse.json(
        { error: "This test type is not a calculated test" },
        { status: 400 }
      );
    }

    // 2. Get the athlete
    const athlete = await prisma.athlete.findUnique({
      where: { id: typedAthleteId },
    });
    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 });
    }

    // 3. Parse formula inputs
    const inputs = (testType.formulaInputs as FormulaInput[] | null) ?? [];

    // 4. Build resolver
    async function getTestValue(testTypeId: string): Promise<number | null> {
      const result = await prisma.testResult.findFirst({
        where: { athleteId: typedAthleteId, testTypeId },
        orderBy: { date: "desc" },
      });
      if (!result) return null;
      return Number(result.value);
    }

    // 5. Build athlete context
    let age: number | null = null;
    if (athlete.birthDate) {
      const now = new Date();
      const birth = new Date(athlete.birthDate);
      age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
    }

    const ctx = {
      getTestValue,
      athlete: {
        age,
        poids: athlete.weightKg ? Number(athlete.weightKg) : null,
        taille: athlete.heightCm ? Number(athlete.heightCm) : null,
        genre: athlete.gender === "M" ? 1 : athlete.gender === "F" ? 0 : null,
      },
    };

    // 6. Gather input values for the response (for debugging)
    const inputValues: Record<string, number | null> = {};
    for (const input of inputs) {
      const val = await getTestValue(input.testTypeId);
      inputValues[input.alias] = val;
    }
    inputValues["age"] = ctx.athlete.age;
    inputValues["poids"] = ctx.athlete.poids;
    inputValues["taille"] = ctx.athlete.taille;
    inputValues["genre"] = ctx.athlete.genre;

    // 7. Evaluate
    const computed = await evaluateFormula(testType.formula, inputs, ctx);

    return NextResponse.json({
      computed,
      formula: testType.formula,
      inputValues,
      missing: computed === null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/tests/calculate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}