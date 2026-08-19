import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const { id } = params;
    const body = await request.json();
    const { name, category, unit, higherIsBetter, description, normMale, normFemale, showOnTeamPage, isUnilateral, isCalculated, formula, formulaInputs } = body;

    const existing = await prisma.testType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Test type not found" },
        { status: 404 }
      );
    }

    const testType = await prisma.testType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(unit !== undefined && { unit }),
        ...(higherIsBetter !== undefined && { higherIsBetter }),
        ...(description !== undefined && { description }),
        ...(normMale !== undefined && { normMale: normMale ? Number(normMale) : null }),
        ...(normFemale !== undefined && { normFemale: normFemale ? Number(normFemale) : null }),
        ...(showOnTeamPage !== undefined && { showOnTeamPage }),
        ...(isUnilateral !== undefined && { isUnilateral }),
        ...(isCalculated !== undefined && { isCalculated }),
        ...(formula !== undefined && { formula: formula || null }),
        ...(formulaInputs !== undefined && { formulaInputs }),
      },
    });

    return NextResponse.json(testType);
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
    console.error("PATCH /api/tests/types/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const { id } = params;

    const existing = await prisma.testType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Test type not found" },
        { status: 404 }
      );
    }

    if (existing.isSystem) {
      return NextResponse.json(
        { error: "Ce test système ne peut pas être supprimé" },
        { status: 403 }
      );
    }

    // Check if any test results reference this test type
    const resultCount = await prisma.testResult.count({
      where: { testTypeId: id },
    });

    if (resultCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete test type with existing test results. Remove all results first.",
          resultCount,
        },
        { status: 409 }
      );
    }

    await prisma.testType.delete({ where: { id } });

    return NextResponse.json({
      message: "Test type deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/tests/types/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}