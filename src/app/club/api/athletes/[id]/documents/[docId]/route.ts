import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    await requireAuth();

    const { id, docId } = params;

    const existing = await prisma.athleteDocument.findFirst({
      where: { id: docId, athleteId: id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Document introuvable" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name requis" },
        { status: 400 }
      );
    }

    const updated = await prisma.athleteDocument.update({
      where: { id: docId },
      data: { name },
      include: {
        uploader: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ document: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/athletes/[id]/documents/[docId] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Accès réservé aux administrateurs" },
        { status: 403 }
      );
    }

    const { id, docId } = params;

    const existing = await prisma.athleteDocument.findFirst({
      where: { id: docId, athleteId: id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Document introuvable" },
        { status: 404 }
      );
    }

    await prisma.athleteDocument.delete({ where: { id: docId } });

    return NextResponse.json({ message: "Document supprimé" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/athletes/[id]/documents/[docId] error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}