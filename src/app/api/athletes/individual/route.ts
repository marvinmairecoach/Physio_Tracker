import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();

    const athletes = await prisma.athlete.findMany({
      where: {
        teams: {
          none: {
            isActive: true,
          },
        },
      },
      include: {
        teams: {
          include: { team: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(athletes);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/athletes/individual error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}