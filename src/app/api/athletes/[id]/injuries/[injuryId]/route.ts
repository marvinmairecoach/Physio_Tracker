import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; injuryId: string } }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const { id, injuryId } = params;

    const existing = await prisma.injury.findFirst({
      where: { id: injuryId, athleteId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Blessure introuvable" }, { status: 404 });
    }

    const body = await request.json();
    const { injury, injuryDate, injuryNotes, recoveryDate } = body;

    const updateData: Record<string, unknown> = {};
    if (injury !== undefined) updateData.injury = injury;
    if (injuryDate !== undefined) updateData.injuryDate = new Date(injuryDate);
    if (injuryNotes !== undefined) updateData.injuryNotes = injuryNotes;
    if (recoveryDate !== undefined) {
      updateData.recoveryDate = recoveryDate ? new Date(recoveryDate) : null;
    }

    const updated = await prisma.injury.update({
      where: { id: injuryId },
      data: updateData,
      include: {
        athleteTeam: {
          select: { team: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ injury: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/athletes/[id]/injuries/[injuryId] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; injuryId: string } }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const { id, injuryId } = params;

    const existing = await prisma.injury.findFirst({
      where: { id: injuryId, athleteId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Blessure introuvable" }, { status: 404 });
    }

    await prisma.injury.delete({ where: { id: injuryId } });

    return NextResponse.json({ message: "Blessure supprimée" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/athletes/[id]/injuries/[injuryId] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}