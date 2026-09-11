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

    const invitations = await prisma.sessionInvitation.findMany({
      where: { sessionId: id },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: invitations.length,
      present: invitations.filter((i) => i.availability === "PRESENT").length,
      absent: invitations.filter((i) => i.availability === "ABSENT").length,
      maybe: invitations.filter((i) => i.availability === "MAYBE").length,
      pending: invitations.filter((i) => !i.respondedAt).length,
      avgPhysical: avg(invitations.map((i) => i.physicalFeel).filter(Boolean) as number[]),
      avgMental: avg(invitations.map((i) => i.mentalFeel).filter(Boolean) as number[]),
      avgSleep: avg(invitations.map((i) => i.sleepQuality).filter(Boolean) as number[]),
    };

    return NextResponse.json({ invitations, stats });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/sessions/[id]/responses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}