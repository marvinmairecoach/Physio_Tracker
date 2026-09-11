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

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true } },
        assignments: {
          include: {
            team: true,
            athlete: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/sessions/[id] error:", error);
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
    await requireAuth();

    const { id } = params;
    const body = await request.json();
    const { title, description, type, date, startTime, endTime, location, status, teamId, isRecurring, recurrenceRule, recurrenceEnd } =
      body;

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(startTime !== undefined && {
          startTime: startTime ? new Date(startTime) : null,
        }),
        ...(endTime !== undefined && {
          endTime: endTime ? new Date(endTime) : null,
        }),
        ...(location !== undefined && { location }),
        ...(status !== undefined && { status }),
        ...(teamId !== undefined && { teamId: teamId || null }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(recurrenceRule !== undefined && { recurrenceRule }),
        ...(recurrenceEnd !== undefined && {
          recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null,
        }),
      },
      include: {
        team: { select: { id: true, name: true } },
        assignments: {
          include: {
            team: true,
            athlete: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/sessions/[id] error:", error);
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

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    await prisma.session.delete({ where: { id } });

    return NextResponse.json({ message: "Session deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/sessions/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}