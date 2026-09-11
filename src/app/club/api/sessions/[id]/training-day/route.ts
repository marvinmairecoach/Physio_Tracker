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

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            team: {
              select: { id: true, name: true },
            },
            athlete: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        invitations: {
          include: {
            athlete: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/sessions/[id]/training-day error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}