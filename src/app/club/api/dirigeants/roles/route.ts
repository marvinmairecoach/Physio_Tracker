import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();

    const roles = await prisma.dirigeantRole.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(roles);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("GET /api/dirigeants/roles error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin" && session.role !== "coach") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Le nom du rôle est requis" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Validate uniqueness
    const existing = await prisma.dirigeantRole.findUnique({
      where: { name: trimmedName },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ce rôle existe déjà" },
        { status: 409 }
      );
    }

    const role = await prisma.dirigeantRole.create({
      data: { name: trimmedName },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("POST /api/dirigeants/roles error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
