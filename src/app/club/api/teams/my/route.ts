import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();

    let teams;

    if (session.role === "admin") {
      // Admin voit toutes les équipes
      teams = await prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    } else {
      // Coach voit uniquement ses équipes
      teams = await prisma.team.findMany({
        where: {
          coaches: { some: { userId: session.userId } },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json(teams);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/teams/my error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}