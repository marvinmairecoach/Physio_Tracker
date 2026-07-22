import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Voir l'invitation (public — via token)
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const invitation = await prisma.sessionInvitation.findUnique({
      where: { responseToken: token },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            type: true,
            date: true,
            startTime: true,
            endTime: true,
            location: true,
            description: true,
          },
        },
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 404 });
    }

    if (invitation.respondedAt) {
      return NextResponse.json({
        alreadyResponded: true,
        invitation: {
          id: invitation.id,
          availability: invitation.availability,
          physicalFeel: invitation.physicalFeel,
          mentalFeel: invitation.mentalFeel,
          sleepQuality: invitation.sleepQuality,
          respondedAt: invitation.respondedAt,
        },
        session: invitation.session,
        athlete: invitation.athlete,
      });
    }

    return NextResponse.json({
      alreadyResponded: false,
      session: invitation.session,
      athlete: invitation.athlete,
    });
  } catch (error) {
    console.error("GET /api/invitations/[token] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Répondre à l'invitation (public — via token)
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await request.json();
    const { availability, physicalFeel, mentalFeel, sleepQuality } = body;

    // Validation
    const validAvailabilities = ["PRESENT", "ABSENT", "MAYBE"];
    if (!availability || !validAvailabilities.includes(availability)) {
      return NextResponse.json(
        { error: "Veuillez choisir une disponibilité (PRESENT, ABSENT ou MAYBE)" },
        { status: 400 }
      );
    }

    const feel = (v: unknown, label: string): number | null => {
      if (v === undefined || v === null || v === "") return null;
      const n = Number(v);
      if (isNaN(n) || n < 1 || n > 10) {
        throw new Error(`${label} doit être entre 1 et 10`);
      }
      return n;
    };

    const pFeel = feel(physicalFeel, "Forme physique");
    const mFeel = feel(mentalFeel, "Forme mentale");
    const sQuality = feel(sleepQuality, "Qualité du sommeil");

    const invitation = await prisma.sessionInvitation.findUnique({
      where: { responseToken: token },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    }

    if (invitation.respondedAt) {
      return NextResponse.json({ error: "Vous avez déjà répondu à cette convocation" }, { status: 400 });
    }

    const updated = await prisma.sessionInvitation.update({
      where: { responseToken: token },
      data: {
        availability: availability as "PRESENT" | "ABSENT" | "MAYBE",
        physicalFeel: pFeel,
        mentalFeel: mFeel,
        sleepQuality: sQuality,
        respondedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Merci ! Ta réponse a bien été prise en compte.",
      availability: updated.availability,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/invitations/[token] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}