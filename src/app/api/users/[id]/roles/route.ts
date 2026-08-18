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

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const assignments = await prisma.userRoleAssignment.findMany({
      where: { userId: id },
      include: {
        role: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      roles: assignments.map((a: { id: string; roleId: string; role: { id: string; name: string } }) => ({
        id: a.id,
        roleId: a.roleId,
        role: a.role,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("GET /api/users/[id]/roles error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { roleIds } = body;

    if (!Array.isArray(roleIds)) {
      return NextResponse.json(
        { error: "La liste des IDs de rôles est requise" },
        { status: 400 }
      );
    }

    // Validate that all roleIds exist
    if (roleIds.length > 0) {
      const existingRoles = await prisma.userRole.findMany({
        where: { id: { in: roleIds } },
        select: { id: true },
      });
      const existingIds = new Set(existingRoles.map((r: { id: string }) => r.id));
      const invalidIds = roleIds.filter((rid) => !existingIds.has(rid));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: "Certains rôles spécifiés n'existent pas" },
          { status: 400 }
        );
      }
    }

    // Delete all existing assignments and create new ones in a transaction
    const assignments = await prisma.$transaction(async (tx) => {
      await tx.userRoleAssignment.deleteMany({ where: { userId: id } });

      if (roleIds.length > 0) {
        await tx.userRoleAssignment.createMany({
          data: roleIds.map((roleId: string) => ({ userId: id, roleId })),
        });
      }

      return tx.userRoleAssignment.findMany({
        where: { userId: id },
        include: {
          role: {
            select: { id: true, name: true },
          },
        },
      });
    });

    return NextResponse.json({
      roles: assignments.map((a: { id: string; roleId: string; role: { id: string; name: string } }) => ({
        id: a.id,
        roleId: a.roleId,
        role: a.role,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("PUT /api/users/[id]/roles error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}