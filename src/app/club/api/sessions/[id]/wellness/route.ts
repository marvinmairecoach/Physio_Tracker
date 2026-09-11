import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/sessions/[id]/wellness — coach fills wellness for an athlete
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { id } = params;
    const body = await request.json();
    const { athleteId, sleepQuality, physicalFeel, mentalFeel, wellnessNotes } =
      body;

    if (!athleteId) {
      return NextResponse.json(
        { error: "athleteId is required" },
        { status: 400 }
      );
    }

    // Validate scores
    if (
      sleepQuality !== undefined &&
      (sleepQuality < 0 || sleepQuality > 10)
    ) {
      return NextResponse.json(
        { error: "sleepQuality doit être entre 0 et 10" },
        { status: 400 }
      );
    }
    if (
      physicalFeel !== undefined &&
      (physicalFeel < 0 || physicalFeel > 10)
    ) {
      return NextResponse.json(
        { error: "physicalFeel doit être entre 0 et 10" },
        { status: 400 }
      );
    }
    if (mentalFeel !== undefined && (mentalFeel < 0 || mentalFeel > 10)) {
      return NextResponse.json(
        { error: "mentalFeel doit être entre 0 et 10" },
        { status: 400 }
      );
    }

    const invitation = await prisma.sessionInvitation.findFirst({
      where: { sessionId: id, athleteId },
      include: {
        athlete: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation introuvable pour cet athlète" },
        { status: 404 }
      );
    }

    const alreadyFilled = invitation.respondedAt;
    const data: Record<string, unknown> = {
      sleepQuality: sleepQuality ?? invitation.sleepQuality,
      physicalFeel: physicalFeel ?? invitation.physicalFeel,
      mentalFeel: mentalFeel ?? invitation.mentalFeel,
      wellnessNotes: wellnessNotes ?? invitation.wellnessNotes,
      wellnessFilledBy: "coach",
    };

    // Only update respondedAt if not already filled
    if (!alreadyFilled) {
      data.respondedAt = new Date();
    }

    const updated = await prisma.sessionInvitation.update({
      where: { id: invitation.id },
      data,
    });

    // Check for low scores → create alert (only once)
    const scores = [
      updated.sleepQuality ?? 5,
      updated.physicalFeel ?? 5,
      updated.mentalFeel ?? 5,
    ];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if ((!alreadyFilled) && (avgScore <= 4 || scores.some((s) => s <= 3))) {
      const lowScores: string[] = [];
      if (updated.sleepQuality != null && updated.sleepQuality <= 3)
        lowScores.push(`sommeil=${updated.sleepQuality}/10`);
      if (updated.physicalFeel != null && updated.physicalFeel <= 3)
        lowScores.push(`forme=${updated.physicalFeel}/10`);
      if (updated.mentalFeel != null && updated.mentalFeel <= 3)
        lowScores.push(`moral=${updated.mentalFeel}/10`);

      const athleteName = `${invitation.athlete.firstName} ${invitation.athlete.lastName}`;
      const severity =
        avgScore <= 3 || scores.some((s) => s <= 2) ? "warning" : "info";

      await prisma.alert.create({
        data: {
          athleteId: invitation.athlete.id,
          type: "custom",
          severity,
          message: `Wellness faible — ${athleteName} : ${lowScores.join(", ")}`,
        },
      });
    }

    return NextResponse.json({ message: "Wellness enregistré" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/sessions/[id]/wellness error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}