import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PUT — replace all exercise items for a session (exercises + rest periods)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const { id } = params;
    const body = await request.json();
    const { exercises } = body as {
      exercises: {
        exerciseId: string | null;
        order: number;
        durationMin: number | null;
        isRest: boolean;
        label: string | null;
      }[];
    };

    // Verify session exists
    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Delete all existing exercise items for this session
    await prisma.sessionExercise.deleteMany({ where: { sessionId: id } });

    // Create new ones (rest periods have no exerciseId)
    if (exercises.length > 0) {
      await prisma.sessionExercise.createMany({
        data: exercises.map((ex) => ({
          sessionId: id,
          exerciseId: ex.isRest ? null : ex.exerciseId,
          order: ex.order,
          durationMin: ex.durationMin,
          isRest: ex.isRest,
          label: ex.label || null,
        })),
      });
    }

    // Return updated session with exercises
    const updated = await prisma.session.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true } },
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PUT /api/sessions/[id]/exercises error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — get exercise items for a session
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const { id } = params;

    const exercises = await prisma.sessionExercise.findMany({
      where: { sessionId: id },
      include: { exercise: true },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(exercises);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/sessions/[id]/exercises error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}