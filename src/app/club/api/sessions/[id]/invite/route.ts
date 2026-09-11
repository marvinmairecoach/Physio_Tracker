import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { sendEmail, generateInvitationLink } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const { id } = params;

    // Vérifier que la session existe et récupérer les assignations
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            team: {
              include: {
                athletes: {
                  where: { isActive: true },
                  include: { athlete: true },
                },
              },
            },
            athlete: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }

    // Récupérer tous les athlètes assignés (via équipe + direct)
    const athleteIds = new Set<string>();
    const athletesMap = new Map<string, { firstName: string; lastName: string; email: string | null }>();

    for (const a of session.assignments) {
      if (a.team) {
        for (const at of a.team.athletes) {
          if (at.athlete.email) {
            athleteIds.add(at.athlete.id);
            athletesMap.set(at.athlete.id, at.athlete);
          }
        }
      }
      if (a.athlete && a.athlete.email) {
        athleteIds.add(a.athlete.id);
        athletesMap.set(a.athlete.id, a.athlete);
      }
    }

    if (athleteIds.size === 0) {
      return NextResponse.json(
        { error: "Aucun athlète avec email trouvé dans cette session" },
        { status: 400 }
      );
    }

    // Créer les invitations pour chaque athlète
    const typeLabel = session.type === "MATCH" ? "match" : "entraînement";
    const dateStr = new Date(session.date).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const results: { athlete: string; email: string; status: string; message: string }[] = [];

    for (const athleteId of athleteIds) {
      const athlete = athletesMap.get(athleteId)!;

      // Créer ou récupérer l'invitation
      const invitation = await prisma.sessionInvitation.upsert({
        where: {
          sessionId_athleteId: { sessionId: id, athleteId },
        },
        create: {
          sessionId: id,
          athleteId,
          sentAt: new Date(),
        },
        update: {
          sentAt: new Date(),
          respondedAt: null,
          availability: null,
          physicalFeel: null,
          mentalFeel: null,
          sleepQuality: null,
        },
      });

      // Envoyer l'email
      const link = generateInvitationLink(invitation.responseToken);
      const timeStr = session.startTime
        ? new Date(session.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : "";

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">${session.title}</h2>
          <p><strong>Type :</strong> ${typeLabel === "match" ? "🏆 Match" : "🏋️ Entraînement"}</p>
          <p><strong>Date :</strong> ${dateStr}</p>
          ${timeStr ? `<p><strong>Horaire :</strong> ${timeStr}</p>` : ""}
          ${session.location ? `<p><strong>Lieu :</strong> ${session.location}</p>` : ""}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p>Merci de confirmer ta présence et de répondre aux questions du jour :</p>
          <a href="${link}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin: 16px 0;">
            Répondre à la convocation
          </a>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            Ce lien est personnel et unique. Ne le partage pas.
          </p>
        </div>
      `;

      const emailResult = await sendEmail({
        to: athlete.email!,
        subject: `📋 ${session.title} — ${dateStr}`,
        html: emailHtml,
      });

      results.push({
        athlete: `${athlete.firstName} ${athlete.lastName}`,
        email: athlete.email!,
        status: emailResult.success ? "sent" : "failed",
        message: emailResult.message,
      });
    }

    return NextResponse.json({
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/sessions/[id]/invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}