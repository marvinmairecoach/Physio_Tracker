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
    const { value, date, notes } = body;

    const existing = await prisma.testResult.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Résultat introuvable" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (value !== undefined) updateData.value = parseFloat(value);
    if (date !== undefined) updateData.date = new Date(date);
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.testResult.update({
      where: { id },
      data: updateData,
      include: {
        athlete: { select: { firstName: true, lastName: true } },
        testType: { select: { name: true, unit: true } },
      },
    });

    return NextResponse.json({
      ...updated,
      value: Number(updated.value),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/tests/results/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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

    const existing = await prisma.testResult.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Résultat introuvable" },
        { status: 404 }
      );
    }

    await prisma.testResult.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/tests/results/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}