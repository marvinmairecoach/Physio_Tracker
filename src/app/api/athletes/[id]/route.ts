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

    const athlete = await prisma.athlete.findUnique({
      where: { id },
      include: {
        teams: {
          include: { team: true },
        },
      },
    });

    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(athlete);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/athletes/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
      return NextResponse.json({ error: "Seul un administrateur ou un coach peut modifier un athlète" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      firstName,
      lastName,
      birthDate,
      phone,
      email,
      gender,
      heightCm,
      weightKg,
      notes,
      photoUrl,
      isActive,
    } = body;

    const existing = await prisma.athlete.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    const athlete = await prisma.athlete.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(birthDate !== undefined && { birthDate: new Date(birthDate) }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(gender !== undefined && { gender }),
        ...(heightCm !== undefined && { heightCm: parseFloat(heightCm) }),
        ...(weightKg !== undefined && { weightKg: parseFloat(weightKg) }),
        ...(notes !== undefined && { notes }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        teams: {
          include: { team: true },
        },
      },
    });

    return NextResponse.json(athlete);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/athletes/[id] error:", error);
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
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Seul un administrateur peut supprimer un athlète" }, { status: 403 });
    }

    const { id } = params;

    const existing = await prisma.athlete.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    await prisma.athlete.delete({ where: { id } });

    return NextResponse.json({ message: "Athlete deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/athletes/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}