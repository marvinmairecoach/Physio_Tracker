import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { evaluateFormula, FormulaInput } from "@/lib/formula";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId");
    const testTypeId = searchParams.get("testTypeId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Record<string, unknown> = {};

    if (athleteId) {
      where.athleteId = athleteId;
    }

    if (testTypeId) {
      where.testTypeId = testTypeId;
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) {
        dateFilter.gte = new Date(dateFrom);
      }
      if (dateTo) {
        dateFilter.lte = new Date(dateTo);
      }
      where.date = dateFilter;
    }

    const results = await prisma.testResult.findMany({
      where,
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        testType: true,
        recorder: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Convert Decimal values to numbers for JSON serialization
    const serialized = results.map((r) => ({
      ...r,
      value: Number(r.value),
      valueLeft: r.valueLeft !== null ? Number(r.valueLeft) : null,
      valueRight: r.valueRight !== null ? Number(r.valueRight) : null,
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/tests/results error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { athleteId, testTypeId, value, valueLeft, valueRight, date, notes } = body;

    if (!athleteId || !testTypeId) {
      return NextResponse.json(
        { error: "athleteId and testTypeId are required" },
        { status: 400 }
      );
    }

    // Verify athlete exists
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
    });
    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    // Verify test type exists
    const testType = await prisma.testType.findUnique({
      where: { id: testTypeId },
    });
    if (!testType) {
      return NextResponse.json(
        { error: "Test type not found" },
        { status: 404 }
      );
    }

    const result = await prisma.testResult.create({
      data: {
        athleteId,
        testTypeId,
        value: parseFloat(value),
        valueLeft: valueLeft !== undefined && valueLeft !== null ? parseFloat(valueLeft) : null,
        valueRight: valueRight !== undefined && valueRight !== null ? parseFloat(valueRight) : null,
        date: date ? new Date(date) : new Date(),
        notes,
        recordedById: session.userId,
      },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        testType: {
          select: {
            id: true,
            name: true,
            unit: true,
            isUnilateral: true,
          },
        },
      },
    });

    // ── Auto-calculation of dependent test results ──
    try {
      // Find all calculated test types whose formulaInputs contain the saved testTypeId
      const calculatedTypes = await prisma.testType.findMany({
        where: { isCalculated: true },
        select: { id: true, name: true, formula: true, formulaInputs: true },
      });

      for (const calcType of calculatedTypes) {
        if (!calcType.formula) continue;
        const inputs = (calcType.formulaInputs as FormulaInput[] | null) ?? [];

        // Does this calculated type depend on the test type that was just saved?
        const dependsOnSaved = inputs.some(
          (input) => input.testTypeId === testTypeId
        );
        if (!dependsOnSaved) continue;

        // Check if ALL inputs for this calculated test type have results for this athlete
        let allInputsAvailable = true;
        for (const input of inputs) {
          const existing = await prisma.testResult.findFirst({
            where: { athleteId, testTypeId: input.testTypeId },
            orderBy: { date: "desc" },
          });
          if (!existing) {
            allInputsAvailable = false;
            break;
          }
        }
        if (!allInputsAvailable) continue;

        // Build the athlete context for evaluation
        const athleteForCalc = athlete; // already fetched above

        let age: number | null = null;
        if (athleteForCalc.birthDate) {
          const now = new Date();
          const birth = new Date(athleteForCalc.birthDate);
          age = now.getFullYear() - birth.getFullYear();
          const m = now.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
            age--;
          }
        }

        const getTestValue = async (tid: string): Promise<number | null> => {
          const r = await prisma.testResult.findFirst({
            where: { athleteId, testTypeId: tid },
            orderBy: { date: "desc" },
          });
          if (!r) return null;
          return Number(r.value);
        };

        const ctx = {
          getTestValue,
          athlete: {
            age,
            poids: athleteForCalc.weightKg
              ? Number(athleteForCalc.weightKg)
              : null,
            taille: athleteForCalc.heightCm
              ? Number(athleteForCalc.heightCm)
              : null,
            genre:
              athleteForCalc.gender === "M"
                ? 1
                : athleteForCalc.gender === "F"
                  ? 2
                  : null,
          },
        };

        const formulaResult = await evaluateFormula(
          calcType.formula,
          inputs,
          ctx
        );

        if (formulaResult.value !== null) {
          await prisma.testResult.create({
            data: {
              athleteId,
              testTypeId: calcType.id,
              value: formulaResult.value,
              date: date ? new Date(date) : new Date(),
              notes: "Calculé automatiquement",
              recordedById: session.userId,
            },
          });
        }
      }
    } catch (calcError) {
      // Log but don't fail the original request
      console.error(
        "Auto-calculation error (non-fatal):",
        calcError
      );
    }

    return NextResponse.json(
      {
        ...result,
        value: result.value !== null ? Number(result.value) : null,
        valueLeft: result.valueLeft !== null ? Number(result.valueLeft) : null,
        valueRight: result.valueRight !== null ? Number(result.valueRight) : null,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/tests/results error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}