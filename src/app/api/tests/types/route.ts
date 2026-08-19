import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();

    const testTypes = await prisma.testType.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(testTypes);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/tests/types error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { name, category, unit, higherIsBetter, description, normMale, normFemale, showOnTeamPage, isUnilateral, isCalculated, formula, formulaInputs } = body;

    if (!name || !category || !unit) {
      return NextResponse.json(
        { error: "name, category, and unit are required" },
        { status: 400 }
      );
    }

    const testType = await prisma.testType.create({
      data: {
        name,
        category,
        unit,
        higherIsBetter: higherIsBetter ?? true,
        description,
        normMale: normMale ? Number(normMale) : null,
        normFemale: normFemale ? Number(normFemale) : null,
        showOnTeamPage: showOnTeamPage ?? true,
        isUnilateral: isUnilateral ?? false,
        isCalculated: isCalculated ?? false,
        formula: formula || null,
        formulaInputs: formulaInputs || undefined,
      },
    });

    return NextResponse.json(testType, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "A test type with this name already exists" },
        { status: 409 }
      );
    }
    console.error("POST /api/tests/types error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}