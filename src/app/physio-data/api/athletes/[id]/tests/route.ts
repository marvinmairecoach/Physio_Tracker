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

    const athlete = await prisma.athlete.findUnique({ where: { id } });
    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    const testResults = await prisma.testResult.findMany({
      where: { athleteId: id },
      include: {
        testType: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(testResults);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/athletes/[id]/tests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}