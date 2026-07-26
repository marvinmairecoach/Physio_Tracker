import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    await requireAuth();

    const oldName = params.name;
    const body = await request.json();
    const { name: newName } = body;

    if (!newName || typeof newName !== "string" || !newName.trim()) {
      return NextResponse.json(
        { error: "New category name is required" },
        { status: 400 }
      );
    }

    // Rename the category across all test types
    const result = await prisma.testType.updateMany({
      where: { category: oldName },
      data: { category: newName.trim() },
    });

    return NextResponse.json({
      message: "Category renamed successfully",
      updatedCount: result.count,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/tests/categories/[name] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    await requireAuth();

    const name = params.name;

    // Check how many test types use this category
    const testTypeCount = await prisma.testType.count({
      where: { category: name },
    });

    if (testTypeCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category. ${testTypeCount} test type(s) still use this category.`,
          testTypeCount,
        },
        { status: 409 }
      );
    }

    // Since categories are just strings on TestType, deletion means
    // there are no test types with this category. Nothing to delete in DB.
    return NextResponse.json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/tests/categories/[name] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}