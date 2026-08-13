import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const { id } = params;
    const body = await request.json();
    const { title, date, type, notes, isObjective } = body;

    const existing = await prisma.planningEntry.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Planning entry not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    if (title !== undefined) data.title = title;
    if (date !== undefined) data.date = new Date(date);
    if (type !== undefined) data.type = type;
    if (notes !== undefined) data.notes = notes;
    if (isObjective !== undefined) data.isObjective = isObjective;

    const entry = await prisma.planningEntry.update({
      where: { id },
      data,
    });

    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/planning/[id] error:", error);
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
    await requireAuth();

    const { id } = params;

    const existing = await prisma.planningEntry.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Planning entry not found" },
        { status: 404 }
      );
    }

    await prisma.planningEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/planning/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
