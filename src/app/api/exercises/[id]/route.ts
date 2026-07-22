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

    const exercise = await prisma.exercise.findUnique({ where: { id } });
    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(exercise);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/exercises/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const { id } = params;
    const body = await request.json();
    const { name, category, description, imageUrl } = body;

    const existing = await prisma.exercise.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    if (category !== undefined) {
      const validCategories = ["PHYSIQUE", "TECHNIQUE", "TACTIQUE"];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          {
            error:
              "Invalid category. Must be one of: PHYSIQUE, TECHNIQUE, TACTIQUE",
          },
          { status: 400 }
        );
      }
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
    });

    return NextResponse.json(exercise);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/exercises/[id] error:", error);
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

    const existing = await prisma.exercise.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    // Check if any session exercises reference this exercise
    const sessionExerciseCount = await prisma.sessionExercise.count({
      where: { exerciseId: id },
    });

    if (sessionExerciseCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete exercise with existing session references. Remove all session exercises first.",
          sessionExerciseCount,
        },
        { status: 409 }
      );
    }

    await prisma.exercise.delete({ where: { id } });

    return NextResponse.json({
      message: "Exercise deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/exercises/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
