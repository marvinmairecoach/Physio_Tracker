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
    const { isRead } = body;

    if (isRead === undefined || isRead === null) {
      return NextResponse.json(
        { error: "isRead is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: { isRead },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(alert);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/alerts/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}