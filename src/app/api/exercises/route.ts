import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();

    const exercises = await prisma.exercise.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(exercises);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/exercises error:", error);
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
    const { name, category, description, imageUrl } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "name and category are required" },
        { status: 400 }
      );
    }

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

    const exercise = await prisma.exercise.create({
      data: {
        name,
        category,
        description: description || null,
        imageUrl: imageUrl || null,
        createdById: session.userId,
      },
    });

    return NextResponse.json(exercise, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/exercises error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
