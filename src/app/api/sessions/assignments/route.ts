import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { sessionId, teamId, athleteId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (!teamId && !athleteId) {
      return NextResponse.json(
        { error: "Either teamId or athleteId must be provided" },
        { status: 400 }
      );
    }

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify team exists if provided
    if (teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) {
        return NextResponse.json(
          { error: "Team not found" },
          { status: 404 }
        );
      }
    }

    // Verify athlete exists if provided
    if (athleteId) {
      const athlete = await prisma.athlete.findUnique({
        where: { id: athleteId },
      });
      if (!athlete) {
        return NextResponse.json(
          { error: "Athlete not found" },
          { status: 404 }
        );
      }
    }

    // Check if assignment already exists
    const existing = await prisma.sessionAssignment.findFirst({
      where: {
        sessionId,
        ...(teamId ? { teamId } : {}),
        ...(athleteId ? { athleteId } : {}),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Assignment already exists" },
        { status: 409 }
      );
    }

    const assignment = await prisma.sessionAssignment.create({
      data: {
        sessionId,
        teamId: teamId || null,
        athleteId: athleteId || null,
      },
      include: {
        session: true,
        team: true,
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/sessions/assignments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.sessionAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    await prisma.sessionAssignment.delete({
      where: { id: assignmentId },
    });

    return NextResponse.json({
      message: "Assignment removed successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/sessions/assignments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}