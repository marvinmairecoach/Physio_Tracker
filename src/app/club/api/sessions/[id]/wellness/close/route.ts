import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/sessions/[id]/wellness/close — close wellness collection
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { id } = params;

    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session introuvable" },
        { status: 404 }
      );
    }

    if (session.dataCollectionStatus !== "pending") {
      return NextResponse.json(
        { error: "La collecte wellness est déjà fermée" },
        { status: 409 }
      );
    }

    await prisma.session.update({
      where: { id },
      data: { dataCollectionStatus: "closed" },
    });

    return NextResponse.json({
      message: "Questionnaire wellness clôturé",
      status: "closed",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/sessions/[id]/wellness/close error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}