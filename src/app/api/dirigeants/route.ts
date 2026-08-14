import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();

    const dirigeants = await prisma.dirigeant.findMany({
      orderBy: { lastName: "asc" },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    return NextResponse.json(dirigeants);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("GET /api/dirigeants error:", error);
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
    const { firstName, lastName, address, phone, email, roleIds } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "firstName et lastName sont requis" },
        { status: 400 }
      );
    }

    const dirigeant = await prisma.dirigeant.create({
      data: {
        firstName,
        lastName,
        address: address || null,
        phone: phone || null,
        email: email || null,
        createdById: session.userId,
        roles:
          Array.isArray(roleIds) && roleIds.length > 0
            ? {
                create: roleIds.map((roleId: string) => ({ roleId })),
              }
            : undefined,
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    return NextResponse.json(dirigeant, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("POST /api/dirigeants error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
