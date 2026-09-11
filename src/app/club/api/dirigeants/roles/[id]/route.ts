import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin" && session.role !== "coach") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Le nom du rôle est requis" },
        { status: 400 }
      );
    }

    const existing = await prisma.dirigeantRole.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Rôle introuvable" },
        { status: 404 }
      );
    }

    const trimmedName = name.trim();

    // Validate uniqueness (excluding the role being updated)
    const nameTaken = await prisma.dirigeantRole.findUnique({
      where: { name: trimmedName },
    });
    if (nameTaken && nameTaken.id !== id) {
      return NextResponse.json(
        { error: "Ce nom de rôle existe déjà" },
        { status: 409 }
      );
    }

    const role = await prisma.dirigeantRole.update({
      where: { id },
      data: { name: trimmedName },
    });

    return NextResponse.json(role);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("PATCH /api/dirigeants/roles/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin" && session.role !== "coach") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = params;

    const existing = await prisma.dirigeantRole.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Rôle introuvable" },
        { status: 404 }
      );
    }

    // Cascade handles assignments deletion
    await prisma.dirigeantRole.delete({ where: { id } });

    return NextResponse.json({
      message: "Rôle supprimé avec succès",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("DELETE /api/dirigeants/roles/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
