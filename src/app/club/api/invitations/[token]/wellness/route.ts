import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await request.json();
    const { sleepQuality, physicalFeel, mentalFeel, wellnessNotes } = body;

    // Validate inputs
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

    const invitation = await prisma.sessionInvitation.findUnique({
      where: { responseToken: token },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation introuvable" },
        { status: 404 }
      );
    }

    if (invitation.respondedAt) {
      return NextResponse.json(
        {
          error:
            "Vous avez déjà répondu à ce questionnaire",
          alreadySubmitted: true,
        },
        { status: 409 }
      );
    }

    const updated = await prisma.sessionInvitation.update({
      where: { responseToken: token },
      data: {
        sleepQuality: sleepQuality ?? invitation.sleepQuality,
        physicalFeel: physicalFeel ?? invitation.physicalFeel,
        mentalFeel: mentalFeel ?? invitation.mentalFeel,
        wellnessNotes: wellnessNotes ?? invitation.wellnessNotes,
        wellnessFilledBy: "athlete",
        respondedAt: new Date(),
      },
      include: {
        athlete: {
          select: { id: true, firstName: true, lastName: true },
        },
        session: {
          select: { id: true, title: true, date: true },
        },
      },
    });

    // Check if wellness scores are low → create alert
    const scores = [
      updated.sleepQuality ?? 5,
      updated.physicalFeel ?? 5,
      updated.mentalFeel ?? 5,
    ];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (avgScore <= 4 || scores.some((s) => s <= 3)) {
      const lowScores: string[] = [];
      if (updated.sleepQuality != null && updated.sleepQuality <= 3)
        lowScores.push(`sommeil=${updated.sleepQuality}/10`);
      if (updated.physicalFeel != null && updated.physicalFeel <= 3)
        lowScores.push(`forme=${updated.physicalFeel}/10`);
      if (updated.mentalFeel != null && updated.mentalFeel <= 3)
        lowScores.push(`moral=${updated.mentalFeel}/10`);

      const athleteName = `${updated.athlete.firstName} ${updated.athlete.lastName}`;
      const severity =
        avgScore <= 3 || scores.some((s) => s <= 2) ? "warning" : "info";

      await prisma.alert.create({
        data: {
          athleteId: updated.athlete.id,
          type: "custom",
          severity,
          message: `Wellness faible — ${athleteName} : ${lowScores.join(", ")}`,
        },
      });
    }

    return NextResponse.json({
      message: "Questionnaire wellness enregistré",
      athlete: `${updated.athlete.firstName} ${updated.athlete.lastName}`,
      session: updated.session.title,
    });
  } catch (error) {
    console.error("PATCH /api/invitations/[token]/wellness error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}