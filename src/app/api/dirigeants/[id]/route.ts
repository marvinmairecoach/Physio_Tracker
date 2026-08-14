import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const dirigeantInclude = {
  roles: {
    include: { role: true },
  },
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const { id } = params;

    const dirigeant = await prisma.dirigeant.findUnique({
      where: { id },
      include: dirigeantInclude,
    });

    if (!dirigeant) {
      return NextResponse.json(
        { error: "Dirigeant introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(dirigeant);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("GET /api/dirigeants/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

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
    const { firstName, lastName, address, phone, email, roleIds } = body;

    const existing = await prisma.dirigeant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Dirigeant introuvable" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
    };

    // If roleIds is provided, sync the role assignments: delete all existing, create new ones
    if (Array.isArray(roleIds)) {
      await prisma.$transaction([
        prisma.dirigeantRoleAssignment.deleteMany({
          where: { dirigeantId: id },
        }),
        ...roleIds.map((roleId: string) =>
          prisma.dirigeantRoleAssignment.create({
            data: { dirigeantId: id, roleId },
          })
        ),
      ]);
    }

    const dirigeant = await prisma.dirigeant.update({
      where: { id },
      data,
      include: dirigeantInclude,
    });

    return NextResponse.json(dirigeant);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("PATCH /api/dirigeants/[id] error:", error);
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

    const existing = await prisma.dirigeant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Dirigeant introuvable" },
        { status: 404 }
      );
    }

    // Cascade handles role assignments deletion
    await prisma.dirigeant.delete({ where: { id } });

    return NextResponse.json({
      message: "Dirigeant supprimé avec succès",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("DELETE /api/dirigeants/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
