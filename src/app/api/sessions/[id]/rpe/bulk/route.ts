import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/sessions/[id]/rpe/bulk — coach records RPE for all athletes in a session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { id } = params;
    const body = await request.json();
    const { results } = body;

    // results = [{ athleteId, rpe, rpeNotes }]
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: "results array is required" },
        { status: 400 }
      );
    }

    // Validate inputs
    for (const r of results) {
      if (!r.athleteId) {
        return NextResponse.json(
          { error: "athleteId is required for each result" },
          { status: 400 }
        );
      }
      if (r.rpe !== undefined && (r.rpe < 0 || r.rpe > 10)) {
        return NextResponse.json(
          { error: "RPE doit être entre 0 et 10" },
          { status: 400 }
        );
      }
    }

    // Get session info
    const session = await prisma.session.findUnique({
      where: { id },
      select: { id: true, date: true, title: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session introuvable" },
        { status: 404 }
      );
    }

    let savedCount = 0;
    for (const r of results) {
      if (r.rpe === undefined || r.rpe === null) continue;

      // Find the invitation
      const invitation = await prisma.sessionInvitation.findFirst({
        where: { sessionId: id, athleteId: r.athleteId },
      });

      if (invitation) {
        // Save RPE on the invitation
        await prisma.sessionInvitation.update({
          where: { id: invitation.id },
          data: {
            rpe: r.rpe,
            rpeNotes: r.rpeNotes || null,
            rpeFilledBy: "coach",
          },
        });
      }

      // Also create a TrainingLoad entry for wellness tracking / ACWR
      const existingLoad = await prisma.trainingLoad.findFirst({
        where: {
          athleteId: r.athleteId,
          date: session.date,
          sessionType: "session",
        },
      });

      if (existingLoad) {
        await prisma.trainingLoad.update({
          where: { id: existingLoad.id },
          data: {
            rpe: r.rpe,
            notes: r.rpeNotes || existingLoad.notes,
          },
        });
      } else {
        // Get current user ID for recordedBy
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { role: "admin" },
              { role: "coach" },
            ],
          },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        const recordedById = user?.id || "unknown";

        await prisma.trainingLoad.create({
          data: {
            athlete: { connect: { id: r.athleteId } },
            recorder: { connect: { id: recordedById } },
            date: session.date,
            rpe: r.rpe,
            durationMin: 0,
            sessionType: "session",
            notes: r.rpeNotes || `RPE pour la séance: ${session.title}`,
          },
        });
      }
      savedCount++;
    }

    // Mark session as completed
    await prisma.session.update({
      where: { id },
      data: { dataCollectionStatus: "completed" },
    });

    return NextResponse.json({
      message: `${savedCount} RPE enregistrés`,
      count: savedCount,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/sessions/[id]/rpe/bulk error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}