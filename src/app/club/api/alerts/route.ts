import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId");
    const isRead = searchParams.get("isRead");
    const type = searchParams.get("type");
    const severity = searchParams.get("severity");

    const where: Record<string, unknown> = {};

    if (athleteId) {
      where.athleteId = athleteId;
    }

    if (isRead !== null) {
      where.isRead = isRead === "true";
    }

    if (type) {
      where.type = type;
    }

    if (severity) {
      where.severity = severity;
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(alerts);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/alerts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}